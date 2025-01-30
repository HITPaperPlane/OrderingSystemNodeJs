const { pool } = require('../database');

module.exports = {

    // 类似 Dish.create(...)
    async create(dishData) {
        const {
            dname, dtype, dprice, dtime,
            photo, discription, ddiscount, dserve
        } = dishData;

        const sql = `
            INSERT INTO dishes
            (dname, dtype, dprice, dtime, photo, discription, ddiscount, dserve)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const [result] = await pool.query(sql, [
            dname, dtype, dprice, dtime, photo || '',
            discription || '', ddiscount || 0, dserve || 0
        ]);
        return { id: result.insertId, ...dishData };
    },

    // 类似 Dish.find(query).skip(...).limit(...)
    // 这里只做最简单的处理，比如 query 可能是 { dserve: { $gt: 0 } }
    // page, total 用于分页
    async find(query, skip = 0, limit = 9999999) {
        let baseSql = `SELECT * FROM dishes`;
        let whereClauses = [];
        let params = [];

        if (query.dserve && query.dserve.$gt !== undefined) {
            whereClauses.push(`dserve > ?`);
            params.push(query.dserve.$gt);
        }
        if (whereClauses.length) {
            baseSql += ' WHERE ' + whereClauses.join(' AND ');
        }
        // 排序可以按 id DESC 或不排
        baseSql += ` LIMIT ?, ?`;
        params.push(skip, limit);

        const [rows] = await pool.query(baseSql, params);
        return rows;
    },

    // 类似 Dish.findById(...)
    async findById(id) {
        const sql = `SELECT * FROM dishes WHERE id = ?`;
        const [rows] = await pool.query(sql, [id]);
        return rows[0] || null;
    },

    // 统计数量
    async countDocuments(query) {
        let baseSql = `SELECT COUNT(*) as cnt FROM dishes`;
        let whereClauses = [];
        let params = [];
        if (query.dserve && query.dserve.$gt !== undefined) {
            whereClauses.push(`dserve > ?`);
            params.push(query.dserve.$gt);
        }
        if (whereClauses.length) {
            baseSql += ' WHERE ' + whereClauses.join(' AND ');
        }
        const [rows] = await pool.query(baseSql, params);
        return rows[0].cnt;
    },

    // 直接查全表总数
    async countAll() {
        const [rows] = await pool.query(`SELECT COUNT(*) as cnt FROM dishes`);
        return rows[0].cnt;
    },

    // 类似 Dish.deleteOne({ _id: ... })
    async deleteOne(id) {
        const sql = `DELETE FROM dishes WHERE id = ?`;
        const [result] = await pool.query(sql, [id]);
        return result.affectedRows; // >0 表示删除成功
    },

    // 类似 Dish.updateOne({_id:...}, {$set: {...}})
    async updateOne(id, updateData) {
        // 需要根据 updateData 拼接
        let fields = [];
        let values = [];
        if (updateData.dname !== undefined) {
            fields.push(`dname=?`);
            values.push(updateData.dname);
        }
        if (updateData.dtype !== undefined) {
            fields.push(`dtype=?`);
            values.push(updateData.dtype);
        }
        if (updateData.dprice !== undefined) {
            fields.push(`dprice=?`);
            values.push(updateData.dprice);
        }
        if (updateData.dserve !== undefined) {
            fields.push(`dserve=?`);
            values.push(updateData.dserve);
        }
        if (updateData.dtime !== undefined) {
            fields.push(`dtime=?`);
            values.push(updateData.dtime);
        }
        if (updateData.ddiscount !== undefined) {
            fields.push(`ddiscount=?`);
            values.push(updateData.ddiscount);
        }
        if (updateData.discription !== undefined) {
            fields.push(`discription=?`);
            values.push(updateData.discription);
        }
        if (updateData.photo !== undefined) {
            fields.push(`photo=?`);
            values.push(updateData.photo);
        }

        if (!fields.length) return; // 无更新字段

        const sql = `UPDATE dishes SET ${fields.join(', ')} WHERE id = ?`;
        values.push(id);

        const [result] = await pool.query(sql, values);
        return result.affectedRows;
    },

    // 供搜索用
    async searchByName(keyword) {
        const sql = `
          SELECT * FROM dishes
          WHERE dserve > 0 AND dname LIKE ?
        `;
        const [rows] = await pool.query(sql, [`%${keyword}%`]);
        return rows;
    }

};
