const mongoose = require('mongoose');

const feedbackSchema = mongoose.Schema({
    orderId: String,   // 关联订单
    userId: String,    // 关联用户
    rating: Number,    // 评分
    comment: String,   // 评论
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model("feedbacks", feedbackSchema);
