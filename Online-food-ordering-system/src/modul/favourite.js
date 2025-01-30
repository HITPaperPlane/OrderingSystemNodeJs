const { pool } = require('../database');

module.exports = {

    // 类似 Favourite.findOne({ userId, dishId })
    async findOne(userId, dishId) {
        const sql = `SELECT * FROM favourites WHERE userId=? AND dishId=?`;
        const [rows] = await pool.query(sql, [userId, dishId]);
        return rows[0] || null;
    },

    // 类似 Favourite.create(...)
    async create(data) {
        const { userId, dishId } = data;
        const sql = `
            INSERT INTO favourites (userId, dishId, createdAt)
            VALUES (?, ?, NOW())
        `;
        const [result] = await pool.query(sql, [userId, dishId]);
        return { id: result.insertId, ...data };
    },

    // 类似 Favourite.find({ userId: xxx })
    async findByUser(userId) {
        const sql = `SELECT * FROM favourites WHERE userId=? ORDER BY createdAt DESC`;
        const [rows] = await pool.query(sql, [userId]);
        return rows;
    }
};