const jwt = require('jsonwebtoken');

/**
 * 实际项目中请使用更安全的方式管理 SECRET_KEY，
 * 可以放在 .env 文件中并使用 process.env.SECRET_KEY 获取。
 */
const SECRET_KEY = 'secret-key';

// 签发 Token，payload 可以包含用户 id、角色等关键信息
function signToken(payload) {
  return jwt.sign(payload, SECRET_KEY, { expiresIn: '1h' }); // 1h 代表1小时后失效
}

// 验证 Token 并返回解码后的数据
function verifyToken(token) {
  return jwt.verify(token, SECRET_KEY);
}

module.exports = {
  signToken,
  verifyToken
};

