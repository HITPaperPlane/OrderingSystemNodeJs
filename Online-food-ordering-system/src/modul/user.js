const mongoose = require('mongoose');

const User = mongoose.Schema({
    name: String,
    email: String,
    phone: String,
    password: String,
    address: String,
    type: {
        type: String,
        enum: ['normal', 'admin', 'employee'], // Added 'employee' role
        default: 'normal' // 默认值是 'normal'
    },
});

module.exports = mongoose.model("user", User);
