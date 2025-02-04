const User = require('../models/User');

// 检查用户是否已认证
const isAuthenticated = async (req, res, next) => {
    const userId = req.session.userId;
    if (!userId) {
        return res.redirect('/login');
    }
    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.redirect('/login');
        }
        req.user = user; // 将用户信息附加到请求对象
        next();
    } catch (err) {
        console.error(err);
        res.status(500).send('服务器错误');
    }
};

// 检查用户角色是否为经理
const isManager = (req, res, next) => {
    if (req.user.role === 'manager') {
        return next();
    }
    res.status(403).send('没有权限访问此页面');
};

// 检查用户角色是否为员工
const isEmployee = (req, res, next) => {
    if (req.user.role === 'employee') {
        return next();
    }
    res.status(403).send('没有权限访问此页面');
};

module.exports = {
    isAuthenticated,
    isManager,
    isEmployee
};
