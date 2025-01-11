const mongoose = require('mongoose');

const orderSchema = mongoose.Schema({
    dishId: String,           // 关联dish
    userId: String,           // 关联user
    time: String,             // 下单时间
    pickupTime: String,       // 取餐时间
    specialRequests: String,  // 特殊需求
    photo: String,
    dname: String,
    price: Number,
    quantity: Number,
    paymentType: String,      // 支付方式
    states: String,           // 订单状态
    user: Object              // 用户信息存储
});

module.exports = mongoose.model("orders", orderSchema);
