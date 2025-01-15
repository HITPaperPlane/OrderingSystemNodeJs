const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const exphbs = require('express-handlebars');
const mongoose = require('mongoose');
const routes = require('./routes');
const session = require('express-session');
const app = express();

// 数据库连接
mongoose.connect('mongodb://127.0.0.1:27017/sessionAuthDemo', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log('MongoDB 已连接'))
  .catch(err => console.error('MongoDB 连接错误:', err));

// 中间件
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// 设置Handlebars作为视图引擎
app.engine('hbs', exphbs.engine({
    extname: 'hbs',
    defaultLayout: 'main',
    layoutsDir: path.join(__dirname, 'views', 'layouts')
}));
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));

// 中间件
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// 配置Session中间件
app.use(session({
    secret: 'your_secret_key', // 请替换为强密码
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 3600000 } // 1小时
}));

// 使用路由
app.use('/', routes);
// 处理未定义的路由
app.use((req, res) => {
    res.status(404).send('页面未找到');
});

// 启动服务器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
});

