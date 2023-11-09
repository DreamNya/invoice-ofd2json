const fs = require('fs');
// const ofd2json = require('invoice-ofd2json')
const ofd2json = require('../../src/parser');
const cmd = require('node-cmd');

const Main = async (overrideConfig) => {
    // 读取设置
    const config = overrideConfig ?? JSON.parse(fs.readFileSync('config.json', { encoding: 'utf-8' }));
    const {
        输出json: outputJSON = false,
        输出ofd: renameOFD = true,
        输出文件名: fileNameFormat = '[销售方名称][开票日期]{}[序号] [发票号码] [合计金额]{RMB} ',
        输入文件夹: inputDir = './input/',
        输出文件夹: outputDir = './output/',
        输入前清理输出文件夹: cleanOutput = false,
        输出后清理输入文件夹: cleanInput = false,
        输出后打开输出文件夹: openOutput = true,
    } = config;

    if (cleanOutput) {
        fs.rmSync(outputDir, { recursive: true, force: true });
        fs.mkdirSync(outputDir);
        console.log('输出文件夹已清理');
    }

    // 读取ofd
    const filePaths = fs.readdirSync(inputDir).filter((i) => i.endsWith('ofd'));
    for (const filePath of filePaths) {
        const inputPath = inputDir + filePath;
        console.log(inputPath);
        const ofdBuffer = fs.readFileSync(inputPath);
        const json = await ofd2json(ofdBuffer, inputPath);
        console.log(json);

        const formatName = fileNameFormat.replace(/\[.*?\]({.*?})?/g, (m) => {
            const key = m.match(/\[(.*?)\]/)[1];
            if (key in json) {
                if (m.endsWith('}')) {
                    const subReplacer = m.match(/{(.*?)}/)[1];
                    const subMatcher = key.endsWith('额') ? /^./ : /[^\d]/g;
                    return json[key].replace(subMatcher, subReplacer).replace(new RegExp(subReplacer + '$'), '');
                }
            } else {
                return m;
            }
            return key in json ? json[key] : m;
        });
        const prefixName = formatName.substring(0, formatName.indexOf('[序号]'));

        if (outputJSON) {
            const index =
                fs.readdirSync(outputDir).filter((i) => i.startsWith(prefixName) && i.endsWith('json')).length + 1;
            const finalFileName = formatName.replace(/\[序号\]/g, index < 10 ? '0' + index : index);
            const outputPath = outputDir + finalFileName + '.json';
            const prettyJSON = JSON.stringify(json)
                .replace(/\{|",/g, (m) => m + '\n  ')
                .replace(/\}$/, '\n}');
            fs.writeFileSync(outputPath, prettyJSON);
        }

        if (renameOFD) {
            const index =
                fs.readdirSync(outputDir).filter((i) => i.startsWith(prefixName) && i.endsWith('ofd')).length + 1;
            const finalFileName = formatName.replace(/\[序号\]/g, index < 10 ? '0' + index : index);
            const outputPath = outputDir + finalFileName + '.ofd';
            fs.copyFileSync(inputPath, outputPath);
        }
    }

    if (cleanInput) {
        fs.rmSync(inputDir, { recursive: true, force: true });
        fs.mkdirSync(inputDir);
        console.log('输入文件夹已清理');
    }
    openOutput && cmd.runSync('explorer ' + outputDir.replace(/\//g, '\\'));
    console.log('==============');
    console.log('输出完毕，按下Ctrl+C或Alt+F4关闭');
    process.stdin.resume();
};

Main();

module.exports = Main;
