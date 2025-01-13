const express = require('express');
const router = express.Router();
const User = require('../models/User');

// 注册
router.post('/register', async (req, res) => {
  const { username, password } = req.body;
  try {
    let user = await User.findOne({ username });
    if (user) {
      return res.status(400).send('用户已存在');
    }
    user = new User({ username, password });
    await user.save();
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
    // 这里直接在Cookie中存储了username，仅作示例
    res.cookie('username', username, { httpOnly: true, maxAge: 3600000 }); // 1小时
    res.redirect('/protected');
  } catch (err) {
    console.error(err);
    res.status(500).send('服务器错误');
  }
});

// 登出
router.get('/logout', (req, res) => {
  res.clearCookie('username');
  res.redirect('/login');
});

module.exports = router;
