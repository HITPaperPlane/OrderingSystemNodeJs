require('dotenv').config();
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const { engine } = require('express-handlebars');
const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');

const app = express();

// 连接数据库
connectDB();

// 中间件
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

// 使用新版的方式来设置模板引擎
app.engine('hbs', engine({
    extname: 'hbs',
    defaultLayout: 'main', // 设置默认布局
    layoutsDir: path.join(__dirname, 'views', 'layouts') // 指定布局目录
  }));
  

app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));

// 路由保护中间件示例：除了首页/注册/登录外，都需要检查 Cookie
app.use((req, res, next) => {
  const openPaths = ['/', '/register', '/login'];
  if (openPaths.includes(req.path)) {
    return next();
  }
  if (!req.cookies.username) {
    return res.redirect('/login');
  }
  next();
});

// 路由
app.get('/', (req, res) => {
  res.render('home');
});
app.get('/register', (req, res) => {
  res.render('register');
});
app.get('/login', (req, res) => {
  res.render('login');
});
app.get('/protected', (req, res) => {
  if (!req.cookies.username) {
    return res.redirect('/login');
  }
  res.render('protected', { username: req.cookies.username });
});
app.use('/', authRoutes);

// 启动服务器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Cookie Auth Server running on port ${PORT}`);
});
