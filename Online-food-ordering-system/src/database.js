const mysql = require('mysql2/promise');

// 创建连接池
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '#gmrGMR110202', // 如果有密码请在此处填写
    database: 'online-food-ordering-system',
    // 可自行添加其他参数，如 connectionLimit
});

module.exports = { pool };