const express = require('express');
const router = express.Router();

// 引入认证路由和受保护路由
const authRoutes = require('./auth');
const protectedRoutes = require('./protected');

// 首页
router.get('/', (req, res) => {
    res.render('home');
});

// 使用认证路由
router.use('/', authRoutes);

// 使用受保护路由
router.use('/protected', protectedRoutes);

// 处理未定义的路由
router.use((req, res) => {
    res.status(404).send('页面未找到');
});

module.exports = router;

