const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { signToken } = require('../middleware/jwt'); // 引入签发 Token 方法

// 注册
router.post('/register', async (req, res) => {
  const { username, password, role } = req.body;
  try {
    let user = await User.findOne({ username });
    if (user) {
      return res.status(400).send('用户已存在');
    }
    user = new User({ username, password, role });
    await user.save();
    // 注册完成后，跳转到登录页
    res.redirect('/login');
  } catch (err) {
    console.error(err);
    res.status(500).send('服务器错误');
  }
});

// 登录
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).send('用户名或密码错误');
    }
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(400).send('用户名或密码错误');
    }

    // 使用 signToken 方法基于用户 ID（和角色）生成 JWT
    const token = signToken({ id: user._id, role: user.role });

    // 将 Token 存储在 Cookie 中，httpOnly 能防止客户端 JS 跨站获取
    res.cookie('token', token, { httpOnly: true });

    // 根据角色重定向到不同的受保护页面
    if (user.role === 'manager') {
      res.redirect('/protected/manager');
    } else if (user.role === 'employee') {
      res.redirect('/protected/employee');
    } else {
      res.status(400).send('未知的用户角色');
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('服务器错误');
  }
});

// 登出
router.get('/logout', (req, res) => {
  // 清除 Cookie 中的 Token
  res.clearCookie('token');
  res.redirect('/login');
});

// 显示注册页面
router.get('/register', (req, res) => {
  res.render('register');
});

// 显示登录页面
router.get('/login', (req, res) => {
  res.render('login');
});

module.exports = router;

