const JSZip = globalThis.JSZip || require('jszip');
const DOMParser = globalThis.DOMParser || require('xmldom').DOMParser;

const ofd2json = async (ofd, logMessage = '') => {
    // ID对照表 只能静态定义 文件内没有关联表
    // Unique为独特ID Merge为可合并ID
    const TagsUnique = {
        InvoiceCode: '发票代码',
        BuyerAddrTel: '购买方地址、电话',
        BuyerFinancialAccount: '购买方开户行及账号',
        SellerAddrTel: '销售方地址、电话',
        SellerFinancialAccount: '销售方开户行及账号',
        MachineNo: '机器编号',
        InvoiceCheckCode: '校验码',
        TaxControlCode: '密码区',
        Payee: '收款人',
        Checker: '复核',
        InvoiceNo: '发票号码',
        IssueDate: '开票日期',
        BuyerName: '购买方名称',
        BuyerTaxID: '购买方统一社会信用代码/纳税人识别号',
        SellerName: '销售方名称',
        SellerTaxID: '销售方统一社会信用代码/纳税人识别号',
        TaxExclusiveTotalAmount: '合计金额',
        TaxTotalAmount: '合计税额',
        TaxInclusiveTotalAmount: '价税合计（小写）',
        Note: '备注',
        InvoiceClerk: '开票人',
    };
    const Unique = Object.values(TagsUnique);
    const TagsMerge = {
        Item: '项目名称',
        TaxScheme: '税率/征收率',
        MeasurementDimension: '单位',
        Amount: '金额',
        TaxAmount: '税额',
        Price: '单价',
        Quantity: '数量',
        Specification: '规格型号',
    };
    const Merge = Object.values(TagsMerge);
    const Tags = { ...TagsUnique, ...TagsMerge };
    // 储存ID内容
    const lastID = {};
    // 特殊ID 可能存在问题
    const specialTags = {
        58: '特殊发票类型',
        62: '电子发票类型',
        71: '价税合计（大写）',
        72: '价税合计（大写）',
        79: '建筑服务发生地',
        80: '建筑服务发生地',
        81: () => (lastID['电子发票类型'] ? '价税合计（大写）' : void 0), //电子发票和全电发票中该编码内容不同
        83: () => (lastID['电子发票类型'] ? '价税合计（大写）' : '建筑项目名称'),
        84: () => (lastID['电子发票类型'] ? '价税合计（大写）' : '建筑项目名称'),
        6930: '特殊发票类型',
        6934: '价税合计（大写）',
        6943: '价税合计（大写）',
        6950: '建筑服务发生地',
        6954: '建筑项目名称',
    };

    const zip = new JSZip();
    const domparser = new DOMParser();
    const xmlParser = (string) => domparser.parseFromString(string, 'text/xml');

    // 解压ofd 读取xml
    const xml = await zip.loadAsync(ofd).then(async (zipFile) => {
        function xmlSync(path) {
            return zipFile
                .file(path) // 文件路径
                .async('string') // 转字符串
                .then(
                    (content) => content, // success
                    (error) => error // error
                );
        }
        // 主表
        const OFD = await xmlSync('OFD.xml');
        const xmlOFD = xmlParser(OFD);

        // Document
        // 兼容node.js 使用getElementsByTagName 代替 querySelector
        const urlDocument = xmlOFD.getElementsByTagName('ofd:DocRoot')[0].textContent;
        const urlRoot = urlDocument.replace(/[^\/]+$/, '');
        const Document = await xmlSync(urlDocument);
        const xmlDocument = xmlParser(Document);

        // Tag
        const urlCustomTags = urlRoot + xmlDocument.getElementsByTagName('ofd:CustomTags')[0].textContent;
        const CustomTags = await xmlSync(urlCustomTags);
        const xmlCustomTags = xmlParser(CustomTags);

        const locCustomTag = xmlCustomTags.getElementsByTagName('ofd:FileLoc')[0].textContent;
        const urlCustomTag = urlCustomTags.replace(/[^\/]+$/, locCustomTag);
        // ID表
        const CustomTag = await xmlSync(urlCustomTag);
        // 部分ID表不符合xml规范存在解析错误需要额外修正
        const tagPatched = CustomTag.replace(
            '<:eInvoice xmlns:="">',
            '<ofd:eInvoice xmlns:ofd="http://www.ofdspec.org/2016">'
        ).replace('</:eInvoice>', '</ofd:eInvoice>');
        // 明细表
        const Tpls = await Promise.all(
            Array.from(xmlDocument.getElementsByTagName('ofd:TemplatePage')).map((i) =>
                xmlSync(urlRoot + i.getAttribute('BaseLoc'))
            )
        );
        const Pages = await Promise.all(
            Array.from(xmlDocument.getElementsByTagName('ofd:Page')).map((i) =>
                xmlSync(urlRoot + i.getAttribute('BaseLoc'))
            )
        );
        return { Tag: tagPatched, Tpls, Pages };
    });

    // ID对照
    const xmlTag = xmlParser(xml.Tag);
    const tags = Object.fromEntries(
        Array.from(xmlTag.getElementsByTagName('ofd:ObjectRef')).map((i) => {
            const tag = Tags[i.parentNode.nodeName.replace(/^ofd:/, '')];
            if (!tag) console.warn('发现新ID：' + i.parentNode.nodeName, logMessage);
            return [i.textContent, tag];
        })
    );
    // 明细
    const rawValues = xml.Pages.flatMap((Page) => {
        const xmlPage = xmlParser(Page);
        const rawValue = Array.from(xmlPage.getElementsByTagName('ofd:TextCode')).map((i) => [
            i.parentNode.getAttribute('ID'),
            i.textContent,
        ]);
        return rawValue;
    });
    const tpls = Object.fromEntries(
        xml.Tpls.flatMap((Tpl) => {
            const xmlTpl = xmlParser(Tpl);
            const rawTpl = Array.from(xmlTpl.getElementsByTagName('ofd:TextCode')).map((i) => [
                i.parentNode.getAttribute('ID'),
                i.textContent,
            ]);
            return rawTpl;
        })
    );

    // 输出结果
    const value = rawValues.reduce((obj, [id, value]) => {
        const key = tags[id] ?? specialTags[id]?.call?.() ?? specialTags[id] ?? 'UnknownID' + id;
        obj[key] = obj[key] ?? '';

        // 同一key id之差大于1视为多项目，用|分割
        const duplicate = id - (lastID[key] ?? id) > 1;
        if ((Unique.includes(key) && !duplicate) || Merge.includes(key) || key.startsWith?.('UnknownID')) {
            if (duplicate) {
                obj[key] += '|';
            }
            obj[key] += value;
            lastID[key] = id;
        }
        return obj;
    }, {});

    // 特殊处理 区分全电发票为专票或普票
    if (tpls['3']) {
        value['电子发票类型'] = tpls['3'];
    }

    return value;
};

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    // node.js
    module.exports = ofd2json;
} else {
    // browser
    globalThis.ofd2json = ofd2json;
}
