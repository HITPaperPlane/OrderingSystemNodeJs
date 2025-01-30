const { pool } = require('../database');

module.exports = {

    // 注册
    async create(userData) {
        const { name, email, phone, password, address, photo, type } = userData;
        const sql = `
            INSERT INTO users
            (name, email, phone, password, address, photo, type)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        const [result] = await pool.query(sql, [
            name, email, phone, password,
            address, photo || '', type || 'normal'
        ]);
        return { id: result.insertId, ...userData };
    },

    // 根据邮箱+密码找用户(登录)
    async findByEmailAndPassword(email, password) {
        const sql = `SELECT * FROM users WHERE email=? AND password=?`;
        const [rows] = await pool.query(sql, [email, password]);
        return rows[0] || null;
    },

    // 根据id查用户
    async findById(id) {
        const sql = `SELECT * FROM users WHERE id=?`;
        const [rows] = await pool.query(sql, [id]);
        return rows[0] || null;
    },

    // 更新
    async updateOne(id, userData) {
        let fields = [];
        let values = [];

        if (userData.name !== undefined) {
            fields.push(`name=?`);
            values.push(userData.name);
        }
        if (userData.email !== undefined) {
            fields.push(`email=?`);
            values.push(userData.email);
        }
        if (userData.phone !== undefined) {
            fields.push(`phone=?`);
            values.push(userData.phone);
        }
        if (userData.password !== undefined) {
            fields.push(`password=?`);
            values.push(userData.password);
        }
        if (userData.address !== undefined) {
            fields.push(`address=?`);
            values.push(userData.address);
        }
        if (userData.photo !== undefined) {
            fields.push(`photo=?`);
            values.push(userData.photo);
        }
        if (userData.type !== undefined) {
            fields.push(`type=?`);
            values.push(userData.type);
        }

        if(!fields.length) return;

        const sql = `UPDATE users SET ${fields.join(',')} WHERE id=?`;
        values.push(id);
        const [r] = await pool.query(sql, values);
        return r.affectedRows;
    },

    // 取所有
    async findAll() {
        const sql = `SELECT * FROM users ORDER BY id DESC`;
        const [rows] = await pool.query(sql);
        return rows;
    },

    // 根据 type 查
    async findByType(type) {
        const sql = `SELECT * FROM users WHERE type=?`;
        const [rows] = await pool.query(sql, [type]);
        return rows;
    }
};