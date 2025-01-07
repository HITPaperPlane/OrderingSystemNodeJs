const express = require('express');
const router = express.Router();
const userModule = require('../modul/user');

// 首页，展示所有用户
router.get('/', (req, res) => {
  userModule.getAllUsers((users) => {
    res.render('index', { users });
  });
});

// 添加用户
router.post('/add', (req, res) => {
  const { name, email } = req.body;
  userModule.addUser(name, email, () => {
    res.redirect('/');
  });
});

// 删除用户
router.get('/delete/:id', (req, res) => {
  const { id } = req.params;
  userModule.deleteUser(id, () => {
    res.redirect('/');
  });
});

// 更新用户
// router.get('/edit/:id', (req, res) => {
//   const { id } = req.params;
//   userModule.getAllUsers((users) => {
//     const user = users.find(u => u.id == id);
//     res.render('edit', { user });
//   });
// });
router.get('/edit/:id', (req, res) => {
    const { id } = req.params;
    userModule.getUserById(id, (user) => {
      if (user) {
        res.render('edit', { user });
      } else {
        res.status(404).send('User not found');
      }
    });
  });
// 处理更新请求
router.post('/edit/:id', (req, res) => {
  const { id } = req.params;
  const { name, email } = req.body;
  userModule.updateUser(id, name, email, () => {
    res.redirect('/');
  });
});

router.get('/search', (req, res) => {
    const { name, email } = req.query; // 获取查询参数
    userModule.searchUsers(name || '', email || '', (users) => {
        res.status(200).json(users);
        // res.render('index', { users });
    });
  });

module.exports = router;
