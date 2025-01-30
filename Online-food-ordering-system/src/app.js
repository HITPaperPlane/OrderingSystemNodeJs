const express = require('express');
const hbs = require('hbs');
const route = require('./routers/main');
const bodyParser = require('body-parser');
const session = require('express-session');
const fileUpload = require('express-fileupload');
const path = require('path');
require("./handlebar"); // 自定义handlebars helper

// 1) 新增: 引入 node-cron 用于定时任务
const cron = require('node-cron');

// 2) 引入 Order 模型，用于在定时任务里做统计
const Order = require('./modul/order');

// ========== 新增：引入 sendEmail ========== 
const { sendSimpleEmail, sendEmailWithAttachment } = require('./utils/sendEmail');
// ========== 新增：引入 User 模型，以便找出管理员发邮件 ========== 
const User = require('./modul/user');

// ========== 【移除】Mongoose 相关 ==========
// (注释掉或删除 mongoose.connect(...)、mongoose.connection 等相关监听)

const app = express();

app.use(fileUpload());
app.use(session({
    secret: "restorent_datails",
    resave: false,
    saveUninitialized: true
}));

app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(express.json());

// 路由
app.use('', route);

// 静态文件夹
app.use(express.static(path.join(__dirname, 'public')));
app.use("/static", express.static("public"));

// 模板引擎
app.set("view engine", 'hbs');
app.set("views", path.join(__dirname, 'views'));
hbs.registerPartials(path.join(__dirname, 'views', 'partials'));

// 注册 and 辅助函数
hbs.registerHelper('and', function() {
    // 移除最后一个参数（handlebars 的选项对象）
    const args = Array.prototype.slice.call(arguments, 0, -1);
    return args.every(Boolean);
});

// =============================
// 定时任务 - 每周日自动生成销售摘要
// =============================
cron.schedule('0 0 * * 0', async () => {
    try {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        // 调用我们在 Order 模块里编写的“按时间筛选订单”方法
        const recentOrders = await Order.findByTimeRange(oneWeekAgo); 
        let totalSales = 0;
        let totalOrders = recentOrders.length;
        let dishCountMap = {};

        recentOrders.forEach(order => {
            const orderTotal = order.price * order.quantity;
            totalSales += orderTotal;
            const key = order.dname || "未命名菜品";
            if (!dishCountMap[key]) {
                dishCountMap[key] = 0;
            }
            dishCountMap[key] += order.quantity;
        });

        // 找出最畅销菜品
        let popularDish = "";
        let maxCount = 0;
        for (let dishName in dishCountMap) {
            if (dishCountMap[dishName] > maxCount) {
                maxCount = dishCountMap[dishName];
                popularDish = dishName;
            }
        }

        let reportText = `
【周报 - 最近7天】
- 订单总数：${totalOrders} 单
- 总销售额：￥${totalSales.toFixed(2)}
- 最畅销菜品：${popularDish} (销量 ${maxCount})
`;
        console.log("===== 每周销售摘要(控制台) =====");
        console.log(reportText);

        // 给所有管理员发送邮件
        const admins = await User.findByType('admin');
        for (let admin of admins) {
            await sendSimpleEmail(admin.email, "【每周报告】餐厅周度总结", reportText);
        }

    } catch (error) {
        console.error("生成每周销售摘要时出错:", error);
    }
});

// =============================
// 定时任务 - 每月1日自动生成月报
// =============================
cron.schedule('0 0 1 * *', async () => {
    try {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);

        const ordersInPeriod = await Order.findByTimeRange(startDate);
        let totalSales = 0;
        let totalOrders = ordersInPeriod.length;
        let dishCountMap = {};

        ordersInPeriod.forEach(o => {
            totalSales += (o.price * o.quantity);
            const key = o.dname || "未命名菜品";
            if (!dishCountMap[key]) {
                dishCountMap[key] = 0;
            }
            dishCountMap[key] += o.quantity;
        });

        let popularDish = "";
        let maxCount = 0;
        for (let dishName in dishCountMap) {
            if (dishCountMap[dishName] > maxCount) {
                maxCount = dishCountMap[dishName];
                popularDish = dishName;
            }
        }

        const reportText = `
【月报 - 最近30天】
- 订单总数：${totalOrders} 单
- 总销售额：￥${totalSales.toFixed(2)}
- 最畅销菜品：${popularDish} (销量 ${maxCount})
`;
        console.log("===== 每月销售摘要(控制台) =====");
        console.log(reportText);

        const admins = await User.findByType('admin');
        for (let admin of admins) {
            await sendSimpleEmail(admin.email, "【每月报告】餐厅月度总结", reportText);
        }
    } catch (err) {
        console.error("生成每月报告时出错:", err);
    }
});

app.listen(5656, () => {
    console.log('服务器已启动，端口号：5656...');
});

