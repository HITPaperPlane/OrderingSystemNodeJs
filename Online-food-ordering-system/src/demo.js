const express = require("express");
const app = express();

app.get("/", (req, res) => {
    res.send("<h2>你好，这里是测试Demo</h2>");
    console.log("访问了demo服务器根路径");
});

app.listen(3232, () => {
    console.log("Demo 服务器已启动，端口号：3232...");
});