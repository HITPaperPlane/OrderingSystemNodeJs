const mongoose = require("mongoose");

const dishSchema = mongoose.Schema({
    dname: String,         // 菜品名称
    dtype: String,         // 菜品类型
    dprice: Number,        // 价格
    dtime: String,         // 制作时间
    photo: String,         // 图片
    discription: String,   // 描述
    ddiscount: Number,     // 折扣
    dserve: Number         // 可供应数量(库存)
});

module.exports = mongoose.model("dish", dishSchema);
