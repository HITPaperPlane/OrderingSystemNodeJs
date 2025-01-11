const mongoose = require('mongoose');

/**
 * 只有三种角色：
 *   - 'normal' => member
 *   - 'admin'  => manager
 *   - 'employee' => staff
 */
const User = mongoose.Schema({
    name: String,
    email: String,
    phone: String,
    password: String,
    address: String,
    photo: { type: String, default: "" },  // 用户头像
    type: {
        type: String,
        enum: ['normal', 'admin', 'employee'], 
        default: 'normal'
    }
});

module.exports = mongoose.model("user", User);
