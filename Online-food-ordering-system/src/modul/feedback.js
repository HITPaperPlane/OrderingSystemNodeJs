const { pool } = require('../database');

module.exports = {

    // 新增评价
    async create(data) {
        const {
            orderId, userId, rating, comment
        } = data;
        const sql = `
            INSERT INTO feedbacks
            (orderId, userId, rating, comment, createdAt, updatedAt, adminReply, adminReplyCreatedAt, adminReplyRead)
            VALUES (?, ?, ?, ?, NOW(), NOW(), '', NULL, 0)
        `;
        const [result] = await pool.query(sql, [
            orderId, userId, rating, comment
        ]);
        return { id: result.insertId, ...data };
    },

    // 查找是否有已有评价
    async findOne(orderId, userId) {
        const sql = `SELECT * FROM feedbacks WHERE orderId=? AND userId=?`;
        const [rows] = await pool.query(sql, [orderId, userId]);
        return rows[0] || null;
    },

    // 更新已有评价
    async updateFeedback(orderId, userId, rating, comment) {
        const sql = `
            UPDATE feedbacks
            SET rating=?, comment=?, updatedAt=NOW()
            WHERE orderId=? AND userId=?
        `;
        const [result] = await pool.query(sql, [rating, comment, orderId, userId]);
        return result.affectedRows;
    },

    // 仅用于 findById
    async findById(id) {
        const sql = `SELECT * FROM feedbacks WHERE id=?`;
        const [rows] = await pool.query(sql, [id]);
        return rows[0] || null;
    },

    async saveAdminReply(feedbackId, replyText) {
        const sql = `
            UPDATE feedbacks
            SET adminReply=?, adminReplyCreatedAt=NOW(), adminReplyRead=0
            WHERE id=?
        `;
        const [result] = await pool.query(sql, [replyText, feedbackId]);
        return result.affectedRows;
    },

    async markRead(feedbackId) {
        const sql = `
            UPDATE feedbacks
            SET adminReplyRead=1
            WHERE id=?
        `;
        await pool.query(sql, [feedbackId]);
    },

    // 根据若干查询条件去找
    // dishId => 先找 orders ？(在 routes 里做也行)
    // 此处直接给出 findAll, 再由路由层自己判断
    async findAll() {
        const sql = `SELECT * FROM feedbacks ORDER BY createdAt DESC`;
        const [rows] = await pool.query(sql);
        return rows;
    },

    // 按指定条件找
    async findByCondition(whereClause, params) {
        let sql = `SELECT * FROM feedbacks`;
        if(whereClause) {
            sql += ` WHERE ${whereClause}`;
        }
        sql += ` ORDER BY createdAt DESC`;
        const [rows] = await pool.query(sql, params);
        return rows;
    }
};
