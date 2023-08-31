# 说明
## 功能
轻量化JavaScript库，可解析输入的ofd发票文件内容，并将其提取转为json格式输出
## 特点
- [x] 可解析电子发票
- [x] 可解析全电发票
- [x] 轻量化JavaScript库
- [x] 即开即用 易于使用
- [x] 兼容前端浏览器
- [x] 兼容后端Node.js
## TODO（欢迎PR）
- [ ] 兼容特殊类型发票（例如：成品油、建筑服务类特殊发票，缺少特殊发票样本）
- [ ] 可解析多页发票、销货清单（目前暂时只支持解析发票第一页，缺少多页发票样本）
## 原理
通过`JSZip`解压ofd发票，提取`CustomTag.xml`以及`Pages/*/Content.xml`文件并对其进行解析  
（所有解析内容来源均为ofd发票文件，仅支持正规格式。受ofd格式限制，文件内部分信息缺失，暂时无法做到100%准确，仅能依靠预定义解决）

# 使用方法
## Node.js
### 安装（NPM）
```
npm install invoice-ofd2json
```
### 使用
```js
const ofd2json = require("invoice-ofd2json");
/**
 * 解析输入的ofd文件内容并将其转换为json输出
 * @param ofd 任意符合JSZip输入格式的ofd文件格式
 * @param logMessage 用于调试输出时附带的信息
 * @return json格式的解析后的ofd内容
 */
await ofd2json(ofd, ?logMessage)
```

## Browser
### 安装（CDN）
```html
<script src="https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js" crossorigin="anonymous"></script>
<script src="https://cdn.jsdelivr.net/npm/invoice-ofd2json/src/parser.js" crossorigin="anonymous"></script>
```
### 使用
```js
/**
 * 解析输入的ofd文件内容并将其转换为json输出
 * @param ofd 任意符合JSZip输入格式的ofd文件格式
 * @param logMessage 用于调试输出时附带的信息
 * @return json格式的解析后的ofd内容
 */
await ofd2json(ofd, ?logMessage)
```

## ScriptManager
...
## 应用场景
详见Demo

# License
MIT
