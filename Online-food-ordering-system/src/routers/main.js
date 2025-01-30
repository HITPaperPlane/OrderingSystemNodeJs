const { Router } = require('express');
const express = require('express');
const route = express.Router();
const path = require('path');
const fs = require('fs');
const { pool } = require('../database'); // 若需要直接用 pool.query 统计
// 数据模型
const User = require('../modul/user');
const Dish = require("../modul/dish");
const Order = require('../modul/order');
const Favourite = require('../modul/favourite');
const Feedback = require('../modul/feedback');

// 新增：引入邮件工具
const { sendSimpleEmail } = require('../utils/sendEmail');

/**
 * 首页
 */
route.get("/", (req, res) => {
    const loginUser = req.session.loginUser;
    res.render("index", {
        loginUser
    });
});

/**
 * 注册、登录、登出
 */
route.get("/register", (req, res) => {
    res.render("registration", {
        loginUser: req.session.loginUser
    });
});
route.get("/login", (req, res) => {
    res.render("login", {
        loginUser: req.session.loginUser
    });
});
route.post("/saveRegistration", async (req, res) => {
    try {
        // 先检查是否已存在
        const allUsers = await User.findAll();
        const existing = allUsers.find(u => u.email === req.body.email);
        if(existing) {
            return res.render("registration", {
                registrationError: "该邮箱已被注册，请更换邮箱。",
                loginUser: req.session.loginUser
            });
        }
        await User.create(req.body);
        res.render("login", {
            newRegister: true
        });
    } catch (error) {
        console.error("注册错误:", error);
        res.render("registration", {
            registrationError: "注册时出现错误，请重试。",
            loginUser: req.session.loginUser
        });
    }
});

route.post("/loginUser", async (req, res) => {
    try {
        const user = await User.findByEmailAndPassword(req.body.email, req.body.password);
        if (!user) {
            // 用户名或密码错误
            return res.render("login", {
                invalid: true,
                email: req.body.email
            });
        }
        // 登录成功
        req.session.loginUser = user;
        res.redirect("/dashboard");
    } catch (error) {
        console.error("登录错误:", error);
        res.render("login", {
            loginError: "登录时出现错误，请重试。"
        });
    }
});

route.get("/logout", (req, res) => {
    req.session.destroy();
    res.render("login", {
        logout: true
    });
});

/**
 * Dashboard 根据角色跳转
 */
route.get("/dashboard", (req, res) => {
    const loginUser = req.session.loginUser;
    if (!loginUser) {
        return res.render("login", { loginFirst: true });
    }
    if (loginUser.type === 'normal') {
        return res.render("normalPages/normalDashboard", { loginUser });
    }
    else if (loginUser.type === 'admin') {
        return res.render("adminPages/adminDashboard", { loginUser });
    }
    else if (loginUser.type === 'employee') {
        return res.render("employeePages/employeeDashboard", { loginUser });
    }
});

/**
 * 菜品列表 & 搜索
 */
route.get("/foods/:page", async (req, res) => {
    const loginUser = req.session.loginUser;
    let page = parseInt(req.params.page) || 1;
    const total = 6;
    const skip = (page - 1) * total;

    // 只显示 dserve>0
    const query = { dserve: { $gt: 0 } };
    const foods = await Dish.find(query, skip, total);
    const count = Math.ceil(await Dish.countDocuments(query) / total);

    res.render("showDishes", {
        loginUser,
        foods,
        count,
        currentPage: page
    });
});

route.post("/searchFood", async (req, res) => {
    try {
        const loginUser = req.session.loginUser;
        const search = req.body.foodSearch || "";
        const foods = await Dish.searchByName(search);
        res.render("showDishes", {
            loginUser,
            foods,
            searchKey: search
        });
    } catch (error) {
        console.error("搜索错误:", error);
        res.render("showDishes", {
            loginUser: req.session.loginUser,
            searchError: "搜索时出现错误。"
        });
    }
});

/**
 * 购物车 - 结算（下单）(仅 normal 用户)
 */
route.get("/user/orderFood", (req, res) => {
    const loginUser = req.session.loginUser;
    if (!loginUser || loginUser.type !== 'normal') {
        return res.render("login", { loginFirst: true });
    }
    res.render("normalPages/normalCheckout", { loginUser });
});

route.post("/orderNowFromBasket", async (req, res) => {
    try {
        const loginUser = req.session.loginUser;
        if (!loginUser || loginUser.type !== 'normal') {
            return res.status(403).json({
                message: "无权限下单。"
            });
        }

        const basket = JSON.parse(req.body.data);
        const pickupTime = req.body.pickupTime || "";
        const specialRequests = req.body.specialRequests || "";
        const paymentType = req.body.paymentType || "online";

        // 检查库存
        for (const item of basket) {
            // item.id 为前端传递的 dishId
            const dishRecord = await Dish.findById(item.id);
            if (!dishRecord) {
                return res.status(400).json({
                    message: "有菜品不存在或已下架。"
                });
            }
            if (dishRecord.dserve < item.quantity) {
                return res.status(400).json({
                    message: `菜品【${dishRecord.dname}】库存不足，下单失败。`
                });
            }
        }

        // 扣减库存 & 创建订单
        for (const item of basket) {
            const dishRecord = await Dish.findById(item.id);

            // 1) 创建订单
            const orderData = {
                dishId: dishRecord.id,   // 注意用id
                userId: loginUser.id,
                time: new Date(),        // 下单时间
                pickupTime,
                specialRequests,
                photo: dishRecord.photo,
                dname: dishRecord.dname,
                price: dishRecord.dprice,
                quantity: item.quantity,
                paymentType,
                states: "NA"
            };
            await Order.create(orderData);

            // 2) 更新库存
            const newServe = dishRecord.dserve - item.quantity;
            await Dish.updateOne(dishRecord.id, { dserve: newServe });
        }

        return res.status(200).json({
            message: "订单创建成功！"
        });
    } catch (error) {
        console.error("下单错误详情:", error);
        return res.status(500).json({
            message: "下单失败，请重试。",
            error: error.message
        });
    }
});

/**
 * member(普通用户) - 当前订单 / 取消订单 / 订单历史
 */
route.get("/user/orders", async (req, res) => {
    const loginUser = req.session.loginUser;
    if (!loginUser || loginUser.type !== 'normal') {
        return res.render("login", { loginFirst: true });
    }
    try {
        // “未完成”的订单
        const data = await Order.find({
            userId: loginUser.id,
            statesNe: "Order completed."
        }, 'pickupTime', 'ASC');
        res.render("normalPages/normalOrders", {
            loginUser,
            orderFood: data
        });
    } catch (err) {
        console.error("获取当前订单错误:", err);
        res.render("normalPages/normalOrders", {
            loginUser,
            orderFood: [],
            fetchError: "获取订单失败。"
        });
    }
});

// 取消订单
route.get("/user/cancelOrder/:id", async (req, res) => {
    const loginUser = req.session.loginUser;
    if (!loginUser || loginUser.type !== 'normal') {
        return res.render("login", { loginFirst: true });
    }
    try {
        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).send("订单不存在。");
        }
        if (order.userId !== loginUser.id) {
            return res.status(403).send("无权操作他人订单。");
        }

        // 判断取餐时间
        if(order.pickupTime){
            const pickupTime = new Date(order.pickupTime);
            const now = new Date();
            const diff = pickupTime.getTime() - now.getTime();
            const minutesDiff = Math.floor(diff / 1000 / 60);
            if(minutesDiff < 30) {
                // 回到当前订单列表
                const orderFood = await Order.find({
                    userId: loginUser.id,
                    statesNe: "Order completed."
                }, 'pickupTime', 'ASC');
                return res.render("normalPages/normalOrders", {
                    loginUser,
                    orderFood,
                    cancelError: "距离取餐时间不足30分钟，无法取消订单。"
                });
            }
        }

        // 允许取消 (删除订单)
        const delCount = await Order.deleteOne(req.params.id, loginUser.id);
        if(delCount > 0) {
            // 重新获取当前未完成订单
            const data = await Order.find({
                userId: loginUser.id,
                statesNe: "Order completed."
            }, 'pickupTime', 'ASC');
            return res.render("normalPages/normalOrders", {
                loginUser,
                orderFood: data,
                cancelOrder: true
            });
        } else {
            return res.status(500).send("无法取消订单。");
        }
    } catch (error) {
        console.error("取消订单错误:", error);
        res.status(500).send("取消订单时出现错误。");
    }
});

// 历史订单
route.get("/user/history", async (req, res) => {
    const loginUser = req.session.loginUser;
    if (!loginUser || loginUser.type !== 'normal') {
        return res.render("login", { loginFirst: true });
    }
    try {
        // 查所有订单(无分页, 按pickupTime倒序)
        const data = await Order.find({ userId: loginUser.id }, 'pickupTime', 'DESC');

        // 拿到所有订单ID
        const orderIds = data.map(o => o.id);

        // 找所有 feedback
        let feedbackList = [];
        if(orderIds.length){
            const cond = `orderId IN (${orderIds.join(',')})`;
            feedbackList = await Feedback.findByCondition(cond, []);
        }
        const feedbackMap = {};
        feedbackList.forEach(fb => {
            feedbackMap[fb.orderId] = fb;
        });
        data.forEach(o => {
            o.feedback = feedbackMap[o.id] || null;
        });

        res.render("normalPages/normalHistory", {
            loginUser,
            history: data
        });
    } catch (error) {
        console.error("获取历史订单错误:", error);
        res.render("normalPages/normalHistory", {
            loginUser,
            history: [],
            fetchError: "获取历史订单失败。"
        });
    }
});

/**
 * member - 收藏夹
 */
route.post("/user/addFavourite/:dishId", async (req, res) => {
    const loginUser = req.session.loginUser;
    if (!loginUser || loginUser.type !== 'normal') {
        return res.status(403).send("只有普通用户才能收藏。");
    }
    try {
        const found = await Favourite.findOne(loginUser.id, req.params.dishId);
        if (!found) {
            await Favourite.create({
                userId: loginUser.id,
                dishId: req.params.dishId
            });
        }
        return res.json({
            success: true,
            message: "收藏成功"
        });
    } catch (err) {
        console.error("收藏错误:", err);
        return res.status(500).json({
            success: false,
            message: "收藏时出错"
        });
    }
});

route.get("/user/favourites", async (req, res) => {
    const loginUser = req.session.loginUser;
    if (!loginUser || loginUser.type !== 'normal') {
        return res.render("login", { loginFirst: true });
    }
    try {
        const favs = await Favourite.findByUser(loginUser.id);
        const dishIds = favs.map(f => f.dishId);
        let favDishes = [];
        if(dishIds.length){
            // 简单查出全部 dish，再筛选
            const allDishes = await Dish.find({});
            favDishes = allDishes.filter(d => dishIds.includes(d.id));
        }
        res.render("normalPages/normalFavourites", {
            loginUser,
            favDishes
        });
    } catch (err) {
        console.error("获取收藏夹错误:", err);
        res.render("normalPages/normalFavourites", {
            loginUser,
            favDishes: [],
            fetchError: "获取收藏夹失败。"
        });
    }
});

/**
 * member - 评价
 */
route.post("/user/feedback", async (req, res) => {
    const loginUser = req.session.loginUser;
    if (!loginUser || loginUser.type !== 'normal') {
        return res.render("login", { loginFirst: true });
    }
    try {
        const { orderId, rating, comment } = req.body;
        const existing = await Feedback.findOne(orderId, loginUser.id);
        if(existing) {
            // update
            await Feedback.updateFeedback(orderId, loginUser.id, rating, comment);
        } else {
            // create
            await Feedback.create({
                orderId: parseInt(orderId,10),
                userId: loginUser.id,
                rating: parseInt(rating,10),
                comment
            });
        }
        res.redirect("/user/history");
    } catch (error) {
        console.error("评价错误:", error);
        res.status(500).send("评价失败，请重试。");
    }
});

/**
 * 所有角色都能编辑自己的个人资料
 */
route.get("/user/editProfile", (req, res) => {
    if (!req.session.loginUser) {
        return res.render("login", { loginFirst: true });
    }
    // 无论什么角色，都可用不同模板
    if (req.session.loginUser.type === 'normal') {
        return res.render("normalPages/normalEditProfile", {
            loginUser: req.session.loginUser
        });
    } else if (req.session.loginUser.type === 'admin') {
        // 可以跳到管理员用户列表，这里看需求
        return res.redirect("/admin/users");
    } else {
        // employee
        return res.render("employeePages/employeeEditProfile", {
            loginUser: req.session.loginUser
        });
    }
});

route.post("/user/saveProfile", async (req, res) => {
    if (!req.session.loginUser) {
        return res.render("login", { loginFirst: true });
    }
    const loginUser = req.session.loginUser;
    try {
        let updateData = {...req.body};

        // 如果有上传新头像
        if (req.files && req.files.photo) {
            const { photo } = req.files;
            const imageName = `${Date.now()}_${photo.name}`;
            const uploadDir = path.join(__dirname, '../../public/userImages');
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }
            const imagePath = path.join(uploadDir, imageName);
            await photo.mv(imagePath);

            updateData.photo = imageName;
        } else {
            // 如果没上传，就不要覆盖
            delete updateData.photo;
        }

        await User.updateOne(loginUser.id, updateData);

        // 重新查一下最新用户信息存到 session
        const newUser = await User.findById(loginUser.id);
        req.session.loginUser = newUser;

        return res.redirect("/dashboard");
    } catch (err) {
        console.error("更新个人资料错误:", err);
        res.status(500).send("更新失败，请稍后再试。");
    }
});

/**
 * manager(=admin) - 菜品管理
 */
route.get("/admin/addDish", (req, res) => {
    const loginUser = req.session.loginUser;
    if (!loginUser || loginUser.type !== 'admin') {
        return res.status(403).send("无权限。");
    }
    res.render("adminPages/adminAddNewDish", { loginUser });
});

route.post("/saveDish", async (req, res) => {
    const loginUser = req.session.loginUser;
    if (!loginUser || loginUser.type !== 'admin') {
        return res.status(403).send("无权限。");
    }
    try {
        if (!req.files || !req.files.photo ||
            !req.body.dname.trim() ||
            req.body.dprice <= 0 ||
            Number(req.body.ddiscount) > 100
        ) {
            return res.render("adminPages/adminAddNewDish", {
                notsave: true,
                loginUser
            });
        }
        const { photo } = req.files;
        const imageName = `${Date.now()}_${photo.name}`;
        const uploadPath = path.join(__dirname, '../../public/dishImages');
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        await photo.mv(path.join(uploadPath, imageName));

        req.body.photo = imageName;
        const newDish = await Dish.create(req.body);
        if (newDish) {
            return res.render("adminPages/adminAddNewDish", {
                save: true,
                loginUser
            });
        } else {
            return res.render("adminPages/adminAddNewDish", {
                notsave: true,
                loginUser
            });
        }
    } catch (error) {
        console.error("保存菜品出错:", error);
        return res.render("adminPages/adminAddNewDish", {
            notsave: true,
            loginUser
        });
    }
});

route.get("/admin/dishMenus/:page", async (req, res) => {
    const loginUser = req.session.loginUser;
    if (!loginUser || loginUser.type !== 'admin') {
        return res.render("login", { loginFirst: true });
    }
    let page = parseInt(req.params.page) || 1;
    const total = 6;
    const skip = (page - 1) * total;

    const data = await Dish.find({}, skip, total);
    const totalCount = await Dish.countAll();
    const totalPage = Math.ceil(totalCount / total);

    res.render("adminPages/adminFoodTable", {
        loginUser,
        foods: data,
        currentPage: page,
        count: totalPage
    });
});

route.get('/admin/deleteDish/:id', async (req, res) => {
    const loginUser = req.session.loginUser;
    if (!loginUser || loginUser.type !== 'admin') {
        return res.render("login", { loginFirst: true });
    }
    try {
        const dishToDel = await Dish.findById(req.params.id);
        if (dishToDel && dishToDel.photo) {
            const target = path.join(__dirname, '../../public/dishImages', dishToDel.photo);
            if (fs.existsSync(target)) fs.unlinkSync(target);
        }
        const delResult = await Dish.deleteOne(req.params.id);
        if (delResult > 0) {
            let currentPage = 1;
            const total = 6;
            const foods = await Dish.find({}, 0, total);
            const totalCount = await Dish.countAll();
            const totalPage = Math.ceil(totalCount / total);
            return res.render("adminPages/adminFoodTable", {
                loginUser,
                foods,
                currentPage,
                count: totalPage,
                delete: true
            });
        } else {
            return res.status(500).send("删除失败");
        }
    } catch (err) {
        console.error("删除菜品错误:", err);
        return res.status(500).send("删除时发生错误");
    }
});

route.get("/admin/editDish/:id/:flag", async (req, res) => {
    const loginUser = req.session.loginUser;
    if (!loginUser || loginUser.type !== 'admin') {
        return res.status(403).send("无权限。");
    }
    try {
        const dishData = await Dish.findById(req.params.id);
        if (!dishData) {
            return res.status(404).send("找不到菜品。");
        }
        res.render("adminPages/adminEditDish", {
            food: dishData,
            loginUser
        });
    } catch (error) {
        console.error("编辑菜品错误:", error);
        res.status(500).send("服务器错误。");
    }
});

route.post("/admin/saveEditDish/:id", async (req, res) => {
    const loginUser = req.session.loginUser;
    if (!loginUser || loginUser.type !== 'admin') {
        return res.status(403).send("无权限。");
    }
    try {
        const dishId = req.params.id;
        const oldDish = await Dish.findById(dishId);
        if (!oldDish) {
            return res.redirect("/admin/editDish/" + dishId + "/error");
        }
        // 如果上传了新图片
        if (req.files && req.files.photo) {
            // 删旧
            const oldPath = path.join(__dirname, '../../public/dishImages', req.body.tempImage);
            if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);

            const { photo } = req.files;
            const imgName = Date.now() + "_" + photo.name;
            await photo.mv(path.join(__dirname, '../../public/dishImages', imgName));
            req.body.photo = imgName;
        } else {
            delete req.body.photo;
        }

        await Dish.updateOne(dishId, req.body);
        return res.redirect("/admin/editDish/" + dishId + "/success");
    } catch (error) {
        console.error("编辑菜品保存时错误:", error);
        return res.redirect("/admin/editDish/" + req.params.id + "/error");
    }
});

/**
 * manager(=admin) - 订单管理
 */
route.get("/admin/adminOrder/:page", async (req, res) => {
    const loginUser = req.session.loginUser;
    if (!loginUser || loginUser.type !== 'admin') {
        return res.status(403).send("无权限。");
    }

    let page = parseInt(req.params.page) || 1;
    const total = 10;
    const skip = (page - 1) * total;

    const orders = await Order.find({}, 'pickupTime', 'ASC', skip, total);
    const totalCount = await Order.count({});
    const totalPage = Math.ceil(totalCount / total);

    // 取 feedback
    const allFeedbacks = await Feedback.findAll();
    const fbMap = {};
    allFeedbacks.forEach(f => {
        fbMap[f.orderId] = f;
    });

    // 取 user
    const allUsers = await User.findAll();
    const userMap = {};
    allUsers.forEach(u => {
        userMap[u.id] = u;
    });

    orders.forEach(o => {
        o.feedback = fbMap[o.id] || null;
        o.user = userMap[o.userId] || {};
    });

    res.render("adminPages/adminOrders", {
        loginUser,
        orders,
        currentPage: page,
        count: totalPage
    });
});

// 更新状态
route.get("/admin/cooking/:id", async (req, res) => {
    const loginUser = req.session.loginUser;
    if (!loginUser || loginUser.type !== 'admin') {
        return res.status(403).send("无权限。");
    }
    try {
        await Order.updateOne(req.params.id, { states: "Cooking" });
        res.redirect("/admin/adminOrder/1");
    } catch (error) {
        console.error("更新为Cooking错误:", error);
        res.status(500).send("更新状态失败");
    }
});
route.get("/admin/deliver/:id", async (req, res) => {
    const loginUser = req.session.loginUser;
    if (!loginUser || loginUser.type !== 'admin') {
        return res.status(403).send("无权限。");
    }
    try {
        await Order.updateOne(req.params.id, { states: "Out for delivery." });
        // 发邮件
        const order = await Order.findById(req.params.id);
        if(order){
            const userInfo = await User.findById(order.userId);
            if(userInfo && userInfo.email){
                const subject = "您的订单已准备好取货";
                const text = `尊敬的${userInfo.name}，您好！
您的订单【${order.dname}】已经准备好取餐啦！
请在指定时间内前往餐厅取货。感谢您的支持！`;
                await sendSimpleEmail(userInfo.email, subject, text);
            }
        }
        res.redirect("/admin/adminOrder/1");
    } catch (error) {
        console.error("更新为Out for delivery错误:", error);
        res.status(500).send("更新状态失败");
    }
});

route.get("/admin/handover/:id", async (req, res) => {
    const loginUser = req.session.loginUser;
    if (!loginUser || loginUser.type !== 'admin') {
        return res.status(403).send("无权限。");
    }
    try {
        await Order.updateOne(req.params.id, { states: "Order completed." });
        res.redirect("/admin/adminOrder/1");
    } catch (error) {
        console.error("更新为完成错误:", error);
        res.status(500).send("更新状态失败");
    }
});

/**
 * ========== 新增：4种更详细的周报、月报 ========== 
 */
function formatDateTime(dt) {
    let y = dt.getFullYear();
    let m = String(dt.getMonth()+1).padStart(2,'0');
    let d = String(dt.getDate()).padStart(2,'0');
    let hh = String(dt.getHours()).padStart(2,'0');
    let mm = String(dt.getMinutes()).padStart(2,'0');
    let ss = String(dt.getSeconds()).padStart(2,'0');
    return `${y}-${m}-${d} ${hh}:${mm}:${ss}`;
}

/**
 * 周报 - 趋势与偏好
 */
route.get("/admin/weeklyTrendReport", async (req, res) => {
    const loginUser = req.session.loginUser;
    if (!loginUser || loginUser.type !== 'admin') {
        return res.status(403).send("无权限。");
    }
    try {
        // 过去7天
        const today = new Date();
        const start = new Date();
        start.setDate(today.getDate() - 7);

        const pickupTimeStr = formatDateTime(start);
        // 1) 订单趋势
        const [trendRows] = await pool.query(
            `SELECT DATE_FORMAT(pickupTime, '%Y-%m-%d') as _id,
                    COUNT(*) as orderCount
             FROM orders
             WHERE pickupTime >= ?
             GROUP BY _id
             ORDER BY _id ASC`,
            [pickupTimeStr]
        );
        const trendData = trendRows.map(r => ({
            _id: r._id,
            orderCount: r.orderCount
        }));

        // 2) 客户偏好(销量前5)
        const [prefRows] = await pool.query(
            `SELECT dname as _id, SUM(quantity) as totalQty
             FROM orders
             WHERE pickupTime >= ?
             GROUP BY dname
             ORDER BY totalQty DESC
             LIMIT 5`,
            [pickupTimeStr]
        );
        const preferenceData = prefRows.map(r => ({
            _id: r._id || '未命名菜品',
            totalQty: r.totalQty
        }));

        res.render("adminPages/adminWeeklyTrendReport", {
            loginUser,
            trendData,
            preferenceData
        });
    } catch (error) {
        console.error("周报 - 趋势与偏好 出错:", error);
        res.status(500).send("生成周报趋势与偏好报告时出错");
    }
});

/**
 * 周报 - 销售
 */
route.get("/admin/weeklySalesReport", async (req, res) => {
    const loginUser = req.session.loginUser;
    if (!loginUser || loginUser.type !== 'admin') {
        return res.status(403).send("无权限。");
    }
    try {
        // 过去7天
        const today = new Date();
        const start = new Date();
        start.setDate(today.getDate() - 7);

        const pickupTimeStr = formatDateTime(start);
        const [rows] = await pool.query(`
            SELECT *
            FROM orders
            WHERE pickupTime >= ?
        `, [pickupTimeStr]);

        const orders = rows;
        const totalOrders = orders.length;
        let totalSales = 0;
        orders.forEach(o => {
            totalSales += (o.price * o.quantity);
        });
        const avgSales = totalOrders > 0 ? (totalSales / totalOrders).toFixed(2) : 0;

        res.render("adminPages/adminWeeklySalesReport", {
            loginUser,
            totalOrders,
            totalSales,
            avgSales
        });
    } catch (error) {
        console.error("周报 - 销售 出错:", error);
        res.status(500).send("生成周报销售报告时出错");
    }
});

/**
 * 月报 - 趋势与偏好
 */
route.get("/admin/monthlyTrendReport", async (req, res) => {
    const loginUser = req.session.loginUser;
    if (!loginUser || loginUser.type !== 'admin') {
        return res.status(403).send("无权限。");
    }
    try {
        // 过去30天
        const today = new Date();
        const start = new Date();
        start.setDate(today.getDate() - 30);

        const pickupTimeStr = formatDateTime(start);
        // 1) 订单趋势
        const [trendRows] = await pool.query(
            `SELECT DATE_FORMAT(pickupTime, '%Y-%m-%d') as _id,
                    COUNT(*) as orderCount
             FROM orders
             WHERE pickupTime >= ?
             GROUP BY _id
             ORDER BY _id ASC`,
            [pickupTimeStr]
        );
        const trendData = trendRows.map(r => ({
            _id: r._id,
            orderCount: r.orderCount
        }));

        // 2) 客户偏好(销量前5)
        const [prefRows] = await pool.query(
            `SELECT dname as _id, SUM(quantity) as totalQty
             FROM orders
             WHERE pickupTime >= ?
             GROUP BY dname
             ORDER BY totalQty DESC
             LIMIT 5`,
            [pickupTimeStr]
        );
        const preferenceData = prefRows.map(r => ({
            _id: r._id || '未命名菜品',
            totalQty: r.totalQty
        }));

        res.render("adminPages/adminMonthlyTrendReport", {
            loginUser,
            trendData,
            preferenceData
        });
    } catch (error) {
        console.error("月报 - 趋势与偏好 出错:", error);
        res.status(500).send("生成月报趋势与偏好报告时出错");
    }
});

/**
 * 月报 - 销售
 */
route.get("/admin/monthlySalesReport", async (req, res) => {
    const loginUser = req.session.loginUser;
    if (!loginUser || loginUser.type !== 'admin') {
        return res.status(403).send("无权限。");
    }
    try {
        // 过去30天
        const today = new Date();
        const start = new Date();
        start.setDate(today.getDate() - 30);

        const pickupTimeStr = formatDateTime(start);
        const [rows] = await pool.query(`
            SELECT *
            FROM orders
            WHERE pickupTime >= ?
        `, [pickupTimeStr]);

        const orders = rows;
        const totalOrders = orders.length;
        let totalSales = 0;
        orders.forEach(o => {
            totalSales += (o.price * o.quantity);
        });
        const avgSales = totalOrders > 0 ? (totalSales / totalOrders).toFixed(2) : 0;

        res.render("adminPages/adminMonthlySalesReport", {
            loginUser,
            totalOrders,
            totalSales,
            avgSales
        });
    } catch (error) {
        console.error("月报 - 销售 出错:", error);
        res.status(500).send("生成月报销售报告时出错");
    }
});

/**
 * 新增：管理员(manager=admin) 可以查看并编辑所有用户
 */
route.get("/admin/users", async (req, res) => {
    const loginUser = req.session.loginUser;
    if (!loginUser || loginUser.type !== 'admin') {
        return res.status(403).send("无权限。");
    }
    try {
        const allUsers = await User.findAll();
        res.render("adminPages/adminUsersList", {
            loginUser,
            users: allUsers,
            editSuccess: req.query.editSuccess
        });
    } catch (err) {
        console.error("获取用户列表失败:", err);
        res.status(500).send("获取用户列表失败");
    }
});
route.get("/admin/editUser/:id", async (req, res) => {
    const loginUser = req.session.loginUser;
    if (!loginUser || loginUser.type !== 'admin') {
        return res.status(403).send("无权限。");
    }
    try {
        const userId = parseInt(req.params.id,10);
        const targetUser = await User.findById(userId);
        if (!targetUser) {
            return res.status(404).send("用户不存在");
        }
        
        res.render("adminPages/adminEditUser", {
            loginUser,
            targetUser
        });
    } catch (err) {
        console.error("管理员编辑用户出错:", err);
        res.status(500).send("服务器错误");
    }
});
route.post("/admin/saveUser/:id", async (req, res) => {
    const loginUser = req.session.loginUser;
    if (!loginUser || loginUser.type !== 'admin') {
        return res.status(403).send("无权限。");
    }
    try {
        const userId = parseInt(req.params.id,10);
        const oldUser = await User.findById(userId);
        if (!oldUser) {
            return res.status(404).send("找不到此用户");
        }

        let updateData = {...req.body};
        if (req.files && req.files.photo) {
            const { photo } = req.files;
            const imageName = `${Date.now()}_${photo.name}`;
            const uploadDir = path.join(__dirname, '../../public/userImages');
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }
            const imagePath = path.join(uploadDir, imageName);
            await photo.mv(imagePath);

            updateData.photo = imageName;
        } else {
            delete updateData.photo;
        }

        await User.updateOne(userId, updateData);
        res.redirect("/admin/users?editSuccess=1");
    } catch (err) {
        console.error("管理员保存用户资料出错:", err);
        res.status(500).send("更新失败，请稍后再试。");
    }
});

/**
 * 简易报告（示例）
 */
route.get("/admin/reports", async (req, res) => {
    const loginUser = req.session.loginUser;
    if (!loginUser || loginUser.type !== 'admin') {
        return res.status(403).send("无权限。");
    }
    try {
        const period = req.query.period || 'week'; // 默认周报
        let startDate;
        if (period === 'month') {
            startDate = new Date();
            startDate.setDate(startDate.getDate() - 30);
        } else {
            // week
            startDate = new Date();
            startDate.setDate(startDate.getDate() - 7);
        }

        // 这里用 order.js 里 findByTimeRange 或直接 pool.query
        const ordersInPeriod = await Order.findByTimeRange(startDate);

        let totalSales = 0;
        let dishCountMap = {};
        ordersInPeriod.forEach(o => {
            totalSales += (o.price * o.quantity);
        });
        const totalOrders = ordersInPeriod.length;

        ordersInPeriod.forEach(o => {
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

        const reportData = {
            period,
            totalOrders,
            totalSales,
            popularDish,
            popularDishQuantity: maxCount
        };
        
        res.render("adminPages/adminReports", {
            loginUser,
            reportData
        });
    } catch (err) {
        console.error("生成报告时出错:", err);
        res.status(500).send("生成报告失败");
    }
});

/**
 * 反馈相关
 */
route.get("/feedbacks", async (req, res) => {
    const loginUser = req.session.loginUser;
    if(!loginUser){
        return res.render("login", { loginFirst: true });
    }

    const dishId = req.query.dishId || null;
    const onlyMine = req.query.onlyMine === '1';

    try {
        let fbList = [];
        if(loginUser.type === 'admin') {
            // 管理员可看所有，如 dishId 存在则过滤
            if(dishId){
                const allOrders = await Order.find({});
                const relatedOrderIds = allOrders
                  .filter(o=>o.dishId == dishId)
                  .map(o=>o.id);
                if(!relatedOrderIds.length){
                    fbList = [];
                } else {
                    const cond = `orderId IN (${relatedOrderIds.join(',')})`;
                    fbList = await Feedback.findByCondition(cond, []);
                }
            } else {
                fbList = await Feedback.findAll();
            }
        } else if(loginUser.type === 'normal'){
            // 普通用户可看(onlyMine=1)只看自己
            const allOrders = await Order.find({});
            let relevantOrderIds = allOrders.map(o=>o.id);
            if(dishId){
                relevantOrderIds = allOrders.filter(o=>o.dishId == dishId).map(o=>o.id);
            }

            if(onlyMine){
                if(relevantOrderIds.length){
                    const cond = `orderId IN (${relevantOrderIds.join(',')}) AND userId=?`;
                    fbList = await Feedback.findByCondition(cond, [loginUser.id]);
                } else {
                    fbList = [];
                }
            } else {
                // 不仅限自己 => 视需求，这里写成查看全部
                if(dishId){
                    if(!relevantOrderIds.length) fbList=[];
                    else {
                        const cond = `orderId IN (${relevantOrderIds.join(',')})`;
                        fbList = await Feedback.findByCondition(cond, []);
                    }
                } else {
                    fbList = await Feedback.findAll();
                }
            }
        } else {
            return res.send("只有管理员或普通用户可查看反馈。");
        }

        // 为了展示 userName / dname
        const userIds = new Set();
        const orderIds = new Set();
        fbList.forEach(f=>{
            userIds.add(f.userId);
            orderIds.add(f.orderId);
        });
        const allUsers = await User.findAll();
        const userMap = {};
        allUsers.forEach(u=>{ userMap[u.id] = u; });

        const allOrders = await Order.find({});
        const orderMap = {};
        allOrders.forEach(o=>{ orderMap[o.id] = o; });

        fbList.forEach(f=>{
            const u = userMap[f.userId] || {};
            const o = orderMap[f.orderId] || {};
            f.userName = u.name || "未知用户";
            f.dname = o.dname || "未知菜品";
            f.orderTime = o.time || "";
        });

        res.render("feedbacks", {
            loginUser,
            feedbackList: fbList,
            dishId,
            onlyMine
        });
    } catch(err){
        console.error("获取反馈列表出错:", err);
        res.status(500).send("获取反馈失败，请稍后再试。");
    }
});

route.post("/feedbacks/reply", async (req, res)=>{
    const loginUser = req.session.loginUser;
    if(!loginUser || loginUser.type!=='admin'){
        return res.status(403).json({ success:false, message: "只有管理员可回复" });
    }
    try {
        const { feedbackId, replyText } = req.body;
        const fb = await Feedback.findById(feedbackId);
        if(!fb){
            return res.status(404).json({ success:false, message:"找不到该反馈" });
        }
        await Feedback.saveAdminReply(feedbackId, replyText);
        return res.json({ success:true, message:"回复成功" });
    } catch(err){
        console.error("管理员回复反馈出错:", err);
        return res.status(500).json({ success:false, message:"回复失败" });
    }
});

route.post("/feedbacks/markRead", async (req, res)=>{
    const loginUser = req.session.loginUser;
    if(!loginUser || loginUser.type!=='normal'){
        return res.status(403).json({ success:false, message: "只有普通用户可标记为已读" });
    }
    try {
        const { feedbackId } = req.body;
        const fb = await Feedback.findById(feedbackId);
        console.log(fb);
        if(!fb){
            return res.status(404).json({ success:false, message:"找不到该反馈" });
        }
        if(fb.userId !==  parseInt(loginUser.id)){
            return res.status(403).json({ success:false, message:"无权标记他人的反馈" });
        }
        await Feedback.markRead(feedbackId);
        return res.json({ success:true, message:"已标记为已读" });
    } catch(err){
        console.error("标记已读出错:", err);
        return res.status(500).json({ success:false, message:"标记失败" });
    }
});

/**
 * 新增：手动发送“周报”或“月报”的按钮
 */
route.get("/admin/sendWeeklyNow", async (req, res) => {
    const loginUser = req.session.loginUser;
    if(!loginUser || loginUser.type!=='admin'){
        return res.status(403).send("无权限。");
    }
    try {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate()-7);
        const recentOrders = await Order.findByTimeRange(oneWeekAgo);
        let totalSales = 0;
        let totalOrders = recentOrders.length;
        let dishCountMap = {};
        recentOrders.forEach(order=>{
            totalSales += (order.price*order.quantity);
            const key = order.dname || "未命名菜品";
            if(!dishCountMap[key]) dishCountMap[key]=0;
            dishCountMap[key]+=order.quantity;
        });
        let popularDish = "";
        let maxCount = 0;
        for(let k in dishCountMap){
            if(dishCountMap[k]>maxCount){
                maxCount = dishCountMap[k];
                popularDish = k;
            }
        }
        const reportText=`
【手动发送 - 周报】
- 订单总数：${totalOrders} 单
- 总销售额：￥${totalSales.toFixed(2)}
- 最畅销菜品：${popularDish} (销量 ${maxCount})
`;
        const admins=await User.findByType('admin');
        for(let ad of admins){
            if(ad.email){
                await sendSimpleEmail(ad.email, "【手动周报】餐厅周度总结", reportText);
            }
        }
        res.redirect("/dashboard");
    } catch(e){
        console.error(e);
        res.status(500).send("发送失败，请稍后再试。");
    }
});

route.get("/admin/sendMonthlyNow", async (req, res) => {
    const loginUser = req.session.loginUser;
    if(!loginUser || loginUser.type!=='admin'){
        return res.status(403).send("无权限。");
    }
    try {
        const startDate=new Date();
        startDate.setDate(startDate.getDate()-30);
        const ordersInPeriod=await Order.findByTimeRange(startDate);
        let totalSales=0;
        let totalOrders=ordersInPeriod.length;
        let dishCountMap={};
        ordersInPeriod.forEach(o=>{
            totalSales+=(o.price*o.quantity);
            const key=o.dname||"未命名菜品";
            if(!dishCountMap[key]) dishCountMap[key]=0;
            dishCountMap[key]+=o.quantity;
        });
        let popularDish="";
        let maxCount=0;
        for(let dk in dishCountMap){
            if(dishCountMap[dk]>maxCount){
                maxCount=dishCountMap[dk];
                popularDish=dk;
            }
        }
        const reportText=`
【手动发送 - 月报】
- 订单总数：${totalOrders} 单
- 总销售额：￥${totalSales.toFixed(2)}
- 最畅销菜品：${popularDish} (销量 ${maxCount})
`;
        const admins=await User.findByType('admin');
        for(let ad of admins){
            if(ad.email){
                await sendSimpleEmail(ad.email, "【手动月报】餐厅月度总结", reportText);
            }
        }
        res.redirect("/dashboard");
    } catch(e){
        console.error(e);
        res.status(500).send("发送失败，请稍后再试。");
    }
});

/**
 * staff(=employee) - 订单、历史、库存管理
 */
route.get("/employee/dashboard", (req, res) => {
    const loginUser = req.session.loginUser;
    if (!loginUser || loginUser.type !== 'employee') {
        return res.status(403).send("无权限。");
    }
    res.render("employeePages/employeeDashboard", { loginUser });
});

// 员工查看当前(未完成)订单
route.get("/employee/orders/:page", async (req, res) => {
    const loginUser = req.session.loginUser;
    if (!loginUser || loginUser.type !== 'employee') {
        return res.status(403).send("无权限。");
    }
    let page = parseInt(req.params.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    // 查 states != 'Order completed.'
    const orders = await Order.find({ statesNe: "Order completed." }, 'pickupTime', 'ASC', skip, limit);
    const totalCount = await Order.count({ statesNe: "Order completed." });

    // 附加 feedback
    const orderIds = orders.map(o => o.id);
    let feedbackList = [];
    if(orderIds.length){
        const cond = `orderId IN (${orderIds.join(',')})`;
        feedbackList = await Feedback.findByCondition(cond, []);
    }
    const fbMap = {};
    feedbackList.forEach(f => {
        fbMap[f.orderId] = f;
    });

    // 附加 user
    const allUsers = await User.findAll();
    const userMap = {};
    allUsers.forEach(u => {
        userMap[u.id] = u;
    });

    orders.forEach(o => {
        o.feedback = fbMap[o.id] || null;
        o.user = userMap[o.userId] || {};
    });

    res.render("employeePages/employeeOrders", {
        loginUser,
        orders,
        currentPage: page,
        count: Math.ceil(totalCount / limit)
    });
});

// 员工更新订单状态
route.post("/employee/updateOrderStatus", async (req, res) => {
    const loginUser = req.session.loginUser;
    if (!loginUser || loginUser.type !== 'employee') {
        return res.status(403).json({ message: "无权限。" });
    }
    try {
        const { orderId, status } = req.body;
        let newStatus;
        if (status.toLowerCase() === "in progress") {
            newStatus = "Cooking";
        } else if (status.toLowerCase() === "completed") {
            newStatus = "Order completed.";
        } else {
            return res.status(400).json({ message: "状态无效。" });
        }

        // 更新数据库
        await Order.updateOne(orderId, { states: newStatus });

        // 如果完成 => 发送取餐邮件
        if (newStatus === "Order completed.") {
            const order = await Order.findById(orderId);
            if(order){
                // 再查用户
                const userData = await User.findById(order.userId);
                if(userData && userData.email){
                    const subject = "您的订单已准备好取货";
                    const text = `尊敬的${userData.name}，您好！
您的订单【${order.dname}】已经准备好取餐啦！
请在指定时间内前往餐厅取货。感谢您的支持！`;
                    try {
                        await sendSimpleEmail(userData.email, subject, text);
                    } catch(err){
                        console.error("发送取餐通知邮件失败:", err);
                        // 不让它阻止主流程，可根据需求决定
                    }
                }
            }
        }

        return res.json({ message: "订单状态更新成功。" });
    } catch (error) {
        console.error("员工更新订单状态错误:", error);
        return res.status(500).json({ message: "更新订单状态失败。" });
    }
});

// 员工查看历史订单
route.get("/employee/history/:page", async (req, res) => {
    const loginUser = req.session.loginUser;
    if (!loginUser || loginUser.type !== 'employee') {
        return res.status(403).send("无权限。");
    }

    let page = parseInt(req.params.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    // states = 'Order completed.'
    const orders = await Order.find({ states: "Order completed." }, 'pickupTime', 'DESC', skip, limit);
    const totalCount = await Order.count({ states: "Order completed." });

    // 查 feedback
    const orderIds = orders.map(o => o.id);
    let feedbackList = [];
    if(orderIds.length){
        const cond = `orderId IN (${orderIds.join(',')})`;
        feedbackList = await Feedback.findByCondition(cond, []);
    }
    const fbMap = {};
    feedbackList.forEach(f => {
        fbMap[f.orderId] = f;
    });

    // 用户
    const allUsers = await User.findAll();
    const userMap = {};
    allUsers.forEach(u => {
        userMap[u.id] = u;
    });

    orders.forEach(o => {
        o.feedback = fbMap[o.id] || null;
        o.user = userMap[o.userId] || {};
    });

    res.render("employeePages/employeeHistory", {
        loginUser,
        history: orders,
        currentPage: page,
        count: Math.ceil(totalCount / limit)
    });
});

// 员工库存管理
route.get("/employee/markOutOfStock", async (req, res) => {
    const loginUser = req.session.loginUser;
    if (!loginUser || loginUser.type !== 'employee') {
        return res.status(403).send("无权限。");
    }
    const allDishes = await Dish.find({}, 0, 9999999);
    // 按 dname 排序
    allDishes.sort((a,b)=> (a.dname||"").localeCompare(b.dname||""));

    res.render("employeePages/employeeManageInventory", {
        loginUser,
        dishes: allDishes
    });
});

route.post("/employee/markOutOfStock", async (req, res) => {
    const loginUser = req.session.loginUser;
    if (!loginUser || loginUser.type !== 'employee') {
        return res.status(403).json({ message: "无权限。" });
    }
    try {
        const { dishId } = req.body;
        const dish = await Dish.findById(dishId);
        if (!dish) {
            return res.status(404).json({ message: "未找到该菜品。" });
        }

        // 标记为0
        await Dish.updateOne(dishId, { dserve: 0 });

        // 给所有 employee + admin 发邮件（可直接写 pool.query 或循环两次）
        const [rows] = await pool.query("SELECT * FROM users WHERE type IN ('employee','admin')");
        const subject = "【缺货警告】有菜品库存为0";
        const text = `警告：菜品【${dish.dname}】已缺货（库存=0）。请及时处理或补货！`;
        for (let u of rows) {
            if (u.email) {
                await sendSimpleEmail(u.email, subject, text);
            }
        }

        res.json({ message: "该菜品已标记为缺货，并已发送邮件通知所有员工和管理员。" });
    } catch (err) {
        console.error("标记缺货出错:", err);
        res.status(500).json({ message: "标记缺货失败。" });
    }
});

route.post("/employee/restock", async (req, res) => {
    const loginUser = req.session.loginUser;
    if (!loginUser || loginUser.type !== 'employee') {
        return res.status(403).json({ message: "无权限。" });
    }
    try {
        const { dishId, quantity } = req.body;
        const qty = parseInt(quantity);
        if (isNaN(qty) || qty < 1) {
            return res.status(400).json({ message: "补货数量无效。" });
        }
        await Dish.updateOne(dishId, { dserve: qty });
        res.json({ message: "该菜品已成功补货为 " + qty + " 份。" });
    } catch (err) {
        console.error("补货错误:", err);
        res.status(500).json({ message: "补货失败。" });
    }
});

/**
 * ========== 员工编辑个人资料单独写在这里（也可复用 /user/editProfile） ==========
 */
route.get("/employee/editProfile", (req, res) => {
    const loginUser = req.session.loginUser;
    if (!loginUser || loginUser.type !== 'employee') {
        return res.render("login", { loginFirst: true });
    }
    res.render("employeePages/employeeEditProfile", {
        loginUser
    });
});

module.exports = route;
