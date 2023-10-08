// ==UserScript==
// @name         ofd2json Demo
// @namespace    https://bbs.tampermonkey.net.cn/
// @version      0.1.0
// @description  try to take over the world!
// @author       DreamNya
// @match        https://bbs.tampermonkey.net.cn/
// @require      https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js
// @require      https://cdn.jsdelivr.net/npm/invoice-ofd2json/src/parser.js
// @grant        GM_xmlhttpRequest
// ==/UserScript==

GM_xmlhttpRequest({
    url: 'file://D:/test.ofd', // 从指定URL获取ofd *如果为本地URL 需要设置插件权限 允许访问本地URL
    responseType: 'blob', // 指定Blob格式读取ofd文件 不设置则默认UTF-8 会造成不可逆转换无法读取
    onload: async (xhr) => {
        console.log(xhr);
        console.log(await ofd2json(xhr.response));
    },
});
