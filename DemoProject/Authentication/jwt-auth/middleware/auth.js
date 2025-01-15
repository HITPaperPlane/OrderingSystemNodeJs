const User = require('../models/User');
const { verifyToken } = require('./jwt'); // 引入刚刚新增的 jwt 工具文件

// 检查用户是否已认证 (使用 JWT)
const isAuthenticated = async (req, res, next) => {
    // 从 Cookie 中获取 Token（也可改成从 Header 获取，例如 req.headers.authorization）
    const token = req.cookies.token;
    if (!token) {
        // 若没有 Token，跳转到登录页
        return res.redirect('/login');
    }
    try {
        // 验证 Token，获取解码后的信息 (比如 userId, role 等)
        const decoded = verifyToken(token);
        // 根据 Token 中的 id，查询用户信息
        const user = await User.findById(decoded.id);
        if (!user) {
            // 若用户不存在，跳转到登录页
            return res.redirect('/login');
        }
        // 将用户信息附加到请求对象
        req.user = user;
        // 继续执行后续中间件
        next();
    } catch (err) {
        console.error(err);
        // Token 无效或过期，也跳转到登录页
        return res.redirect('/login');
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

