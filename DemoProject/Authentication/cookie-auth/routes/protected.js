const express = require('express');
const router = express.Router();
const { isAuthenticated, isManager, isEmployee } = require('../middleware/auth');

// 经理受保护页面
router.get('/manager', isAuthenticated, isManager, (req, res) => {
    res.render('protectedManager', { username: req.user.username });
});

// 员工受保护页面
router.get('/employee', isAuthenticated, isEmployee, (req, res) => {
    res.render('protectedEmployee', { username: req.user.username });
});

module.exports = router;

