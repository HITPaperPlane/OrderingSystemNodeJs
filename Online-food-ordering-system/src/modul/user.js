const mongoose = require('mongoose');

// 在原有类型的基础上，增加“manager”角色
const User = mongoose.Schema({
    name: String,
    email: String,
    phone: String,
    password: String,
    address: String,
    photo: { type: String, default: "" },  // 用于上传用户头像
    type: {
        type: String,
        enum: ['normal', 'admin', 'employee', 'manager'], // 新增 'manager'
        default: 'normal'
    }
});

module.exports = mongoose.model("user", User);
