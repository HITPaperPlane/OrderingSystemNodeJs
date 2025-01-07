const mysql = require('mysql2');

// 创建数据库连接
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '#gmrGMR110202', // 请根据你的MySQL设置修改密码
  database: 'nodejs_crud_example'
});

// 打开数据库连接
db.connect((err) => {
  if (err) {
    console.error('Database connection failed: ' + err.stack);
    return;
  }
  console.log('Connected to the database.');
});

// 获取所有用户
const getAllUsers = (callback) => {
  db.query('SELECT * FROM users', (err, results) => {
    if (err) throw err;
    callback(results);
  });
};

// 添加用户
const addUser = (name, email, callback) => {
  db.query('INSERT INTO users (name, email) VALUES (?, ?)', [name, email], (err, results) => {
    if (err) throw err;
    callback(results);
  });
};

// 删除用户
const deleteUser = (id, callback) => {
  db.query('DELETE FROM users WHERE id = ?', [id], (err, results) => {
    if (err) throw err;
    callback(results);
  });
};

// 更新用户
const updateUser = (id, name, email, callback) => {
  db.query('UPDATE users SET name = ?, email = ? WHERE id = ?', [name, email, id], (err, results) => {
    if (err) throw err;
    callback(results);
  });
};

// 获取单个用户
const getUserById = (id, callback) => {
    db.query('SELECT * FROM users WHERE id = ?', [id], (err, results) => {
      if (err) throw err;
      callback(results[0]);  // 返回匹配的第一个用户
    });
    
  };

const searchUsers = (name, email, callback) => {
    const query = 'SELECT * FROM users WHERE name LIKE ? AND email LIKE ?';
    db.query(query, [`%${name}%`, `%${email}%`], (err, results) => {
      if (err) throw err;
      callback(results);
    });
};

module.exports = { getAllUsers, addUser, deleteUser, updateUser ,getUserById, searchUsers};
