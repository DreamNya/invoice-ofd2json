const JSZip = globalThis.JSZip || require('jszip');
const DOMParser = globalThis.DOMParser || require('xmldom').DOMParser;

const ofd2json = async (ofd, logMessage = '') => {
    // ID对照表 只能静态定义 文件内没有关联表
    const Tags = {
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
        Item: '项目名称',
        TaxScheme: '税率/征收率',
        MeasurementDimension: '单位',
        Amount: '金额',
        TaxAmount: '税额',
        Price: '单价',
        Quantity: '数量',
        Specification: '规格型号',
    };
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
        83: () => (lastID['电子发票类型'] ? '价税合计（大写）' : '建筑项目名称'), //电子发票和全电发票中该编码内容不同
        84: () => (lastID['电子发票类型'] ? '价税合计（大写）' : '建筑项目名称'),
        6930: '特殊发票类型',
        6934: '价税合计（大写）',
        6943: '价税合计（大写）',
        6950: '建筑服务发生地',
        6954: '建筑项目名称',
    };

    const zip = new JSZip();
    const parser = new DOMParser();

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
        //const sum = await xmlSync('OFD.xml'); // 摘要表
        const tag = await xmlSync('Doc_0/Tags/CustomTag.xml'); // ID表
        // 部分ID表不符合xml规范存在解析错误需要额外修正
        const tagPatched = tag
            .replace('<:eInvoice xmlns:="">', '<ofd:eInvoice xmlns:ofd="http://www.ofdspec.org/2016">')
            .replace('</:eInvoice>', '</ofd:eInvoice>');
        const value = await xmlSync('Doc_0/Pages/Page_0/Content.xml'); // 明细表
        return { /*sum,*/ tag: tagPatched, value };
    });

    /*
    // 摘要
    const xmlSum = parser.parseFromString(xml.sum, 'text/xml');
    const json = Object.fromEntries(
        Array.from(xmlSum.getElementsByTagName('ofd:CustomData')).map((i) => [i.getAttribute('Name'), i.textContent])
    );
    */
    // ID对照
    const xmlTag = parser.parseFromString(xml.tag, 'text/xml');
    const tags = Object.fromEntries(
        // 兼容node.js 使用getElementsByTagName 代替 querySelector
        Array.from(xmlTag.getElementsByTagName('ofd:ObjectRef')).map((i) => {
            const tag = Tags[i.parentNode.nodeName.replace(/^ofd:/, '')];
            if (!tag) console.warn('发现新ID：' + i.parentNode.nodeName, logMessage);
            return [i.textContent, tag];
        })
    );
    // 明细
    const xmlValue = parser.parseFromString(xml.value, 'text/xml');
    const rawValue = Array.from(xmlValue.getElementsByTagName('ofd:TextCode')).map((i) => [
        i.parentNode.getAttribute('ID'),
        i.textContent,
    ]);

    // 输出结果
    const value = rawValue.reduce((obj, [index, value]) => {
        const key = tags[index] ?? specialTags[index]?.call?.() ?? specialTags[index] ?? 'UnknownID' + index;
        obj[key] = obj[key] ?? '';
        // 同一key index之差大于1视为多项目，用|分割
        // 开票人特殊处理
        if (index - (lastID[key] ?? index) > 1 || (lastID[key] && key == '开票人')) {
            obj[key] += '|';
        }
        obj[key] += value;
        lastID[key] = index;
        return obj;
    }, {});
    return value;
};

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    // node.js
    module.exports = ofd2json;
} else {
    // browser
    globalThis.ofd2json = ofd2json;
}
