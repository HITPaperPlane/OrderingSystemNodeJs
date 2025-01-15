const express = require('express');
const router = express.Router();
const User = require('../models/User');

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
    // 在Session中存储用户ID
    req.session.userId = user._id;
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
  req.session.destroy(err => {
    if (err) {
      console.error(err);
      return res.status(500).send('服务器错误');
    }
    res.redirect('/login');
  });
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
