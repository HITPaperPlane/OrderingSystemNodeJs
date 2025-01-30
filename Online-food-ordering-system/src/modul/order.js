const { pool } = require('../database');

module.exports = {

    // 创建订单
    async create(data) {
        const {
            dishId, userId, time, pickupTime, specialRequests, 
            photo, dname, price, quantity, paymentType, states
        } = data;
        const sql = `
            INSERT INTO orders
            (dishId, userId, time, pickupTime, specialRequests,
             photo, dname, price, quantity, paymentType, states)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const [result] = await pool.query(sql, [
            dishId, userId, time, pickupTime,
            specialRequests || '', photo || '', dname || '',
            price || 0, quantity || 1, paymentType || '',
            states || 'NA'
        ]);
        return { id: result.insertId, ...data };
    },

    // 按 id 找
    async findById(id) {
        const sql = `SELECT * FROM orders WHERE id=?`;
        const [rows] = await pool.query(sql, [id]);
        return rows[0] || null;
    },

    // 删除 (取消订单)
    async deleteOne(id, userId) {
        const sql = `DELETE FROM orders WHERE id=? AND userId=?`;
        const [result] = await pool.query(sql, [id, userId]);
        return result.affectedRows;
    },

    // 更新 (修改 states 等)
    async updateOne(id, updateData) {
        let fields = [];
        let values = [];

        if (updateData.states !== undefined) {
            fields.push(`states=?`);
            values.push(updateData.states);
        }
        if (updateData.pickupTime !== undefined) {
            fields.push(`pickupTime=?`);
            values.push(updateData.pickupTime);
        }
        // 可按需增加其他字段更新

        if(!fields.length) return;
        const sql = `UPDATE orders SET ${fields.join(', ')} WHERE id=?`;
        values.push(id);
        const [r] = await pool.query(sql, values);
        return r.affectedRows;
    },

    // 查找(支持 states != 'Order completed.')
    // 同时支持分页排序
    async find(filter = {}, sortField = 'pickupTime', sortOrder = 'ASC', skip=0, limit=999999) {
        let sql = `SELECT * FROM orders`;
        let wheres = [];
        let params = [];

        // 若指定 userId
        if(filter.userId !== undefined) {
            wheres.push(`userId=?`);
            params.push(filter.userId);
        }
        // 若指定 statesNe => states <> 'xxx'
        if(filter.statesNe !== undefined) {
            wheres.push(`states<>?`);
            params.push(filter.statesNe);
        }
        // 若指定 states= 'Order completed.'
        if(filter.states === 'Order completed.') {
            wheres.push(`states='Order completed.'`);
        }

        if(wheres.length) {
            sql += ' WHERE ' + wheres.join(' AND ');
        }
        // 排序
        sql += ` ORDER BY ${sortField} ${sortOrder}`;
        // 分页
        sql += ` LIMIT ?,?`;
        params.push(skip, limit);

        const [rows] = await pool.query(sql, params);
        return rows;
    },

    // 统计行数
    async count(filter = {}) {
        let sql = `SELECT COUNT(*) as cnt FROM orders`;
        let wheres = [];
        let params = [];

        if(filter.userId !== undefined) {
            wheres.push(`userId=?`);
            params.push(filter.userId);
        }
        if(filter.statesNe !== undefined) {
            wheres.push(`states<>?`);
            params.push(filter.statesNe);
        }
        if(filter.states === 'Order completed.') {
            wheres.push(`states='Order completed.'`);
        }

        if(wheres.length) {
            sql += ' WHERE ' + wheres.join(' AND ');
        }
        const [rows] = await pool.query(sql, params);
        return rows[0].cnt;
    },

    // 用于每周/每月报表: 找 time >= X
    // time 存 DATETIME，比较时可将 JS Date => MySQL datetime
    async findByTimeRange(startDate) {
        const startStr = formatDateTime(startDate);
        const sql = `SELECT * FROM orders WHERE time >= ?`;
        const [rows] = await pool.query(sql, [startStr]);
        return rows;
    }
};

// 工具函数：简单时间格式化(yyyy-mm-dd hh:mm:ss)
function formatDateTime(dt) {
    let yyyy = dt.getFullYear();
    let mm = String(dt.getMonth()+1).padStart(2, '0');
    let dd = String(dt.getDate()).padStart(2, '0');
    let hh = String(dt.getHours()).padStart(2, '0');
    let mi = String(dt.getMinutes()).padStart(2, '0');
    let ss = String(dt.getSeconds()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
}