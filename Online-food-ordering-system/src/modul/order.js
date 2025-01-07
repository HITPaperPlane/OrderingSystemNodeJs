const mongoose = require('mongoose');

const order = mongoose.Schema({
    dishId: String,
    userId: String,
    time: String,
    pickupTime: String, // 新增字段: 取餐时间
    specialRequests: String, // 新增字段: 特殊需求
    photo: String,
    dname: String,
    price: Number,
    quantity: Number,
    paymentType: String,
    states: String,
    user: Object,
});

module.exports = mongoose.model("orders", order);
