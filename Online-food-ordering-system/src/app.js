const express = require('express');
const hbs = require('hbs');
const route = require('./routers/main');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const session = require('express-session');
const fileUpload = require('express-fileupload');
const path = require('path');
require("./handlebar"); // 自定义handlebars helper

const app = express();

app.use(fileUpload());
app.use(session({
    secret: "restorent_datails",
    resave: false,
    saveUninitialized: true
}));

app.use(bodyParser.urlencoded({
    extended: true
}));

// 路由
app.use('', route);

// 静态文件夹
app.use(express.static(path.join(__dirname, 'public')));
app.use("/static", express.static("public"));

// 模板引擎
app.set("view engine", 'hbs');
app.set("views", path.join(__dirname, 'views'));
hbs.registerPartials(path.join(__dirname, 'views', 'partials'));

// 连接数据库
mongoose.connect("mongodb://127.0.0.1:27017/foodOrderingSystem", { 
    useNewUrlParser: true, 
    useUnifiedTopology: true 
})
    .then(() => {
        console.log("成功连接MongoDB数据库。");
    })
    .catch((err) => {
        console.error("连接MongoDB失败，错误原因:", err);
    });

// 监听mongoose连接事件
const db = mongoose.connection;
db.on("connected", () => {
    console.log("Mongoose已连接至MongoDB。");
});
db.on("error", (err) => {
    console.error("Mongoose连接出错:", err);
});
db.on("disconnected", () => {
    console.log("Mongoose连接已断开。");
});

// 进程终止处理
process.on("SIGINT", async () => {
    await db.close();
    console.log("由于应用程序终止，Mongoose连接已关闭。");
    process.exit(0);
});

// 启动服务
app.listen(5656, () => {
    console.log('服务器已启动，端口号：5656...');
});
