const express = require('express');
const bodyParser = require('body-parser');
const exphbs = require('express-handlebars');
const path = require('path');
const mysql = require('mysql2');
const userRouter = require('./routers/main');

const app = express();
const port = 3000;

// 配置模板引擎
/*
模板引擎是一种工具，它可以帮助你创建动态的网页。你可以把它想象成一个魔法盒子，
你把一些数据和一个模板放进去，然后它就会给你一个完整的网页。
*/
const { engine } = require('express-handlebars');

// 使用新版的方式来设置模板引擎
app.engine('hbs', engine({ 
    extname: 'hbs' ,
    defaultLayout: false // 禁用布局
}));

app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, '../views'));

// 使用body-parser来处理POST请求数据
app.use(bodyParser.urlencoded({ extended: true }));

// 静态文件
app.use(express.static(path.join(__dirname, '../public')));

// 路由
app.use('/', userRouter);

// 启动服务器
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
