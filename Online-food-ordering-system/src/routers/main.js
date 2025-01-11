const { Router } = require('express');
const express = require('express');
const route = express.Router();
const path = require('path');
const fs = require('fs');

// 数据模型
const User = require('../modul/user');
const Dish = require("../modul/dish");
const Order = require('../modul/order');
const Favourite = require('../modul/favourite');
const Feedback = require('../modul/feedback');

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
        const existingUser = await User.findOne({ email: req.body.email });
        if (existingUser) {
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
        const user = await User.findOne({ email: req.body.email, password: req.body.password });
        if (!user) {
            // 用户名或密码错误
            return res.render("login", {
                invalid: true,
                email: req.body.email
            });
        }
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
 * Dashboard 根据角色跳转：
 *   - normal => member
 *   - admin  => manager
 *   - employee => staff
 */
route.get("/dashboard", (req, res) => {
    const loginUser = req.session.loginUser;
    if (!loginUser) {
        return res.render("login", { loginFirst: true });
    }
    if (loginUser.type === 'normal') {
        // member
        return res.render("normalPages/normalDashboard", { loginUser });
    }
    else if (loginUser.type === 'admin') {
        // manager
        return res.render("adminPages/adminDashboard", { loginUser });
    }
    else if (loginUser.type === 'employee') {
        // staff
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

    // 只显示 dserve>0(有库存) 的菜品
    const query = { dserve: { $gt: 0 } };
    const foods = await Dish.find(query).skip(skip).limit(total);
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
        // 同样只搜库存>0的
        const query = {
            dserve: { $gt: 0 },
            dname: new RegExp(search, 'i')
        };
        const foods = await Dish.find(query);
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
 * 购物车 - 结算（下单）
 */
route.get("/user/orderFood", (req, res) => {
    const loginUser = req.session.loginUser;
    if (!loginUser || loginUser.type !== 'normal') {
        // 必须是member才能下单
        return res.render("login", { loginFirst: true });
    }
    res.render("normalPages/normalCheckout", { loginUser });
});
route.post("/orderNowFromBasket", async (req, res) => {
    const loginUser = req.session.loginUser;
    if (!loginUser || loginUser.type !== 'normal') {
        return res.status(403).send("无权限下单。");
    }
    try {
        const basket = JSON.parse(req.body.data);
        const pickupTime = req.body.pickupTime || "尽快";
        const specialRequests = req.body.specialRequests || "";
        const paymentType = req.body.paymentType || "online";

        const now = new Date();
        const dateTimeStr = `${now.getFullYear()}-${(now.getMonth()+1).toString().padStart(2,'0')}-${now.getDate().toString().padStart(2,'0')} `
                           + `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}:${now.getSeconds().toString().padStart(2,'0')}`;

        for (const item of basket) {
            // 生成订单
            await Order.create({
                dishId: item.id,
                userId: loginUser._id,
                user: loginUser,
                photo: item.image,
                dname: item.name,
                time: dateTimeStr,
                pickupTime,
                specialRequests,
                price: item.price,
                quantity: item.quantity,
                paymentType,
                states: "NA" // 未处理
            });
        }
        return res.redirect("/");
    } catch (error) {
        console.error("下单错误:", error);
        return res.status(500).send("下单失败，请重试。");
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
        // “未完成”的订单(不包括 Order completed.)
        const data = await Order.find({
            userId: loginUser._id,
            states: { $ne: "Order completed." }
        }).sort({ pickupTime: 1 });
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
route.get("/user/cancelOrder/:id", async (req, res) => {
    const loginUser = req.session.loginUser;
    if (!loginUser || loginUser.type !== 'normal') {
        return res.render("login", { loginFirst: true });
    }
    try {
        // 简单示例：直接删除该订单（实际可判断pick-up时间与当前时间差）
        const del = await Order.deleteOne({ _id: req.params.id, userId: loginUser._id });
        if (del.deletedCount > 0) {
            // 重新获取剩余未完成订单
            const data = await Order.find({
                userId: loginUser._id,
                states: { $ne: "Order completed." }
            }).sort({ pickupTime: 1 });
            res.render("normalPages/normalOrders", {
                loginUser,
                orderFood: data,
                cancelOrder: true
            });
        } else {
            res.status(500).send("无法取消订单。");
        }
    } catch (error) {
        console.error("取消订单错误:", error);
        res.status(500).send("取消订单时出现错误。");
    }
});

/**
 * 普通用户查看历史订单 & 显示/提交评价
 */
route.get("/user/history", async (req, res) => {
    const loginUser = req.session.loginUser;
    if (!loginUser || loginUser.type !== 'normal') {
        return res.render("login", { loginFirst: true });
    }
    try {
        // 当前用户的所有订单（含已完成/未完成），默认按pickupTime倒序
        const data = await Order.find({ userId: loginUser._id }).sort({ pickupTime: -1 });

        // 找出这些订单对应的feedback
        const orderIds = data.map(o => o._id.toString());
        const feedbacks = await Feedback.find({ orderId: { $in: orderIds } });

        // 构建一个映射 { orderId: feedbackObj }
        const feedbackMap = {};
        feedbacks.forEach(f => {
            feedbackMap[f.orderId] = f;
        });

        // 把 feedback 附到对应的订单对象上
        data.forEach(o => {
            o._doc.feedback = feedbackMap[o._id.toString()] || null;
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
    // 只有 normal 用户才允许真的收藏；其余弹窗警告（可在前端处理，也可后端判断）
    if (!loginUser || loginUser.type !== 'normal') {
        return res.status(403).send("只有普通用户才能收藏。");
    }
    try {
        const found = await Favourite.findOne({ userId: loginUser._id, dishId: req.params.dishId });
        if (!found) {
            await Favourite.create({ userId: loginUser._id, dishId: req.params.dishId });
        }
        // 改成返回JSON，而不是res.redirect
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
        const favs = await Favourite.find({ userId: loginUser._id });
        let dishIds = favs.map(f => f.dishId);
        let favDishes = [];
        if (dishIds.length) {
            favDishes = await Dish.find({ _id: { $in: dishIds } });
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
 * member - 对已完成订单做评价
 */
route.post("/user/feedback", async (req, res) => {
    const loginUser = req.session.loginUser;
    if (!loginUser || loginUser.type !== 'normal') {
        return res.render("login", { loginFirst: true });
    }
    try {
        const { orderId, rating, comment } = req.body;
        await Feedback.create({
            orderId,
            userId: loginUser._id,
            rating,
            comment
        });
        res.redirect("/user/history");
    } catch (error) {
        console.error("评价错误:", error);
        res.status(500).send("评价失败，请重试。");
    }
});

/**
 * member - 编辑个人资料
 */
route.get("/user/editProfile", (req, res) => {
    if (!req.session.loginUser || req.session.loginUser.type !== 'normal') {
        return res.render("login", { loginFirst: true });
    }
    res.render("normalPages/normalEditProfile", {
        loginUser: req.session.loginUser
    });
});
route.post("/user/saveProfile", async (req, res) => {
    if (!req.session.loginUser || req.session.loginUser.type !== 'normal') {
        return res.render("login", { loginFirst: true });
    }
    const loginUser = req.session.loginUser;
    try {
        if (req.files && req.files.photo) {
            const { photo } = req.files;
            const imageName = `${Date.now()}_${photo.name}`;
            const uploadDir = path.join(__dirname, '../../public/userImages');
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }
            const imagePath = path.join(uploadDir, imageName);
            await photo.mv(imagePath);

            // 若有旧头像则尝试删除
            if (loginUser.photo) {
                const oldPath = path.join(uploadDir, loginUser.photo);
                if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
            }
            req.body.photo = imageName;
        }
        // 更新
        await User.updateOne({ _id: loginUser._id }, { $set: req.body });
        // 更新session
        const newUser = await User.findById(loginUser._id);
        req.session.loginUser = newUser;
        res.redirect("/dashboard");
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
        }
        else {
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
    const data = await Dish.find().skip(skip).limit(total);
    const totalCount = await Dish.countDocuments();
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
        const delResult = await Dish.deleteOne({ _id: req.params.id });
        if (delResult.deletedCount > 0) {
            // 重新渲染列表
            let currentPage = 1;
            const total = 6;
            const foods = await Dish.find().limit(total);
            const totalCount = await Dish.countDocuments();
            const totalPage = Math.ceil(totalCount / total);
            return res.render("adminPages/adminFoodTable", {
                loginUser,
                foods,
                currentPage,
                count: totalPage,
                delete: true
            });
        }
        else {
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
        // 如果新上传了图片
        if (req.files && req.files.photo) {
            // 删旧
            const oldPath = path.join(__dirname, '../../public/dishImages', req.body.tempImage);
            if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);

            const { photo } = req.files;
            const imgName = Date.now() + "_" + photo.name;
            await photo.mv(path.join(__dirname, '../../public/dishImages', imgName));
            req.body.photo = imgName;
        }
        else {
            // 若无新图片，就不要更新photo
            delete req.body.photo;
        }

        // 更新
        await Dish.updateOne({ _id: dishId }, { $set: req.body });
        return res.redirect("/admin/editDish/" + dishId + "/success");
    } catch (error) {
        console.error("编辑菜品保存时错误:", error);
        return res.redirect("/admin/editDish/" + req.params.id + "/error");
    }
});

/**
 * manager(=admin) - 订单管理
 */
// 示例: routes/admin.js 或 main.js 等
route.get("/admin/adminOrder/:page", async (req, res) => {
    const loginUser = req.session.loginUser;
    if (!loginUser || loginUser.type !== 'admin') {
        return res.status(403).send("无权限。");
    }

    let page = parseInt(req.params.page) || 1;
    const total = 10;
    const skip = (page - 1) * total;

    // 1) 查找所有订单
    const orders = await Order.find().sort({ pickupTime: 1 }).skip(skip).limit(total);

    // 2) 收集这些订单的 _id 列表(注意, order._id 是个 ObjectId, 需要转成字符串来对比 feedback.orderId)
    const orderIds = orders.map(o => o._id.toString());

    // 3) 根据 orderIds 查找 feedbacks
    const feedbacks = await Feedback.find({ orderId: { $in: orderIds } });

    // 4) 以 orderId 为 key，构建一个 map，快速查询
    const feedbackMap = {};
    feedbacks.forEach(f => {
        feedbackMap[f.orderId] = f;
    });

    // 5) 把 feedback 合并到每个 order 对象中
    //    在 mongoose 返回的对象里，可以使用 o._doc 来追加自定义字段
    orders.forEach(o => {
        // 如果 feedbackMap 里有，以 o._id.toString() 为 key 的 feedback，就赋给 o._doc.feedback
        const fid = o._id.toString();
        if (feedbackMap[fid]) {
            o._doc.feedback = feedbackMap[fid];
        } else {
            o._doc.feedback = null;
        }
    });

    // 分页总数
    const totalCount = await Order.countDocuments();
    const totalPage = Math.ceil(totalCount / total);

    // 6) 渲染模板
    res.render("adminPages/adminOrders", {
        loginuser: loginUser,
        orders,             // now orders[i]._doc.feedback 里有feedback对象
        currentPage: page,
        count: totalPage
    });
});

// 更新订单状态
route.get("/admin/cooking/:id", async (req, res) => {
    const loginUser = req.session.loginUser;
    if (!loginUser || loginUser.type !== 'admin') {
        return res.status(403).send("无权限。");
    }
    try {
        await Order.updateOne({ _id: req.params.id }, { $set: { states: "Cooking" } });
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
        await Order.updateOne({ _id: req.params.id }, { $set: { states: "Out for delivery." } });
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
        await Order.updateOne({ _id: req.params.id }, { $set: { states: "Order completed." } });
        res.redirect("/admin/adminOrder/1");
    } catch (error) {
        console.error("更新为完成错误:", error);
        res.status(500).send("更新状态失败");
    }
});

/**
 * staff(=employee) - 订单管理（只显示未完成订单），完成后进“历史订单”
 */
route.get("/employee/dashboard", (req, res) => {
    const loginUser = req.session.loginUser;
    if (!loginUser || loginUser.type !== 'employee') {
        return res.status(403).send("无权限。");
    }
    res.render("employeePages/employeeDashboard", { loginUser });
});
route.get("/employee/orders/:page", async (req, res) => {
    const loginUser = req.session.loginUser;
    if (!loginUser || loginUser.type !== 'employee') {
        return res.status(403).send("无权限。");
    }
    let page = parseInt(req.params.page) || 1;
    const total = 10;
    const skip = (page - 1) * total;
    // 只查非 completed 的订单
    const data = await Order.find({ states: { $ne: "Order completed." } })
        .sort({ pickupTime: 1 })
        .skip(skip)
        .limit(total);
    const totalCount = await Order.countDocuments({ states: { $ne: "Order completed." } });
    const totalPage = Math.ceil(totalCount / total);
    res.render("employeePages/employeeOrders", {
        loginUser,
        orders: data,
        currentPage: page,
        count: totalPage
    });
});
// staff更新订单状态
route.post("/employee/updateOrderStatus", async (req, res) => {
    const loginUser = req.session.loginUser;
    if (!loginUser || loginUser.type !== 'employee') {
        return res.status(403).json({ message: "无权限。" });
    }
    try {
        const { orderId, status } = req.body;
        // 统一映射： 'in progress' => 'Cooking'， 'completed' => 'Order completed.'
        let newStatus;
        if (status.toLowerCase() === "in progress") {
            newStatus = "Cooking";
        } else if (status.toLowerCase() === "completed") {
            newStatus = "Order completed.";
        } else {
            return res.status(400).json({ message: "状态无效。" });
        }
        await Order.updateOne({ _id: orderId }, { $set: { states: newStatus } });
        return res.json({ message: "订单状态更新成功。" });
    } catch (error) {
        console.error("员工更新订单状态错误:", error);
        return res.status(500).json({ message: "更新订单状态失败。" });
    }
});
// staff查看历史订单(只看已完成)

route.get("/employee/history/:page", async (req, res) => {
    const loginUser = req.session.loginUser;
    if (!loginUser || loginUser.type !== 'employee') {
        return res.status(403).send("无权限。");
    }

    let page = parseInt(req.params.page) || 1;
    const total = 10;
    const skip = (page - 1) * total;

    const orders = await Order.find({ states: "Order completed." })
                    .sort({ pickupTime: -1 })
                    .skip(skip)
                    .limit(total);

    const orderIds = orders.map(o => o._id.toString());
    const feedbacks = await Feedback.find({ orderId: { $in: orderIds } });

    const feedbackMap = {};
    feedbacks.forEach(f => {
        feedbackMap[f.orderId] = f;
    });

    orders.forEach(o => {
        o._doc.feedback = feedbackMap[o._id.toString()] || null;
    });

    const totalCount = await Order.countDocuments({ states: "Order completed." });
    const totalPage = Math.ceil(totalCount / total);

    res.render("employeePages/employeeHistory", {
        loginUser,
        history: orders,
        currentPage: page,
        count: totalPage
    });
});


/**
 * staff(=employee) - 库存管理
 *   1) 标记缺货 => dserve=0
 *   2) 补货 => dserve=具体数字
 */
route.get("/employee/markOutOfStock", async (req, res) => {
    const loginUser = req.session.loginUser;
    if (!loginUser || loginUser.type !== 'employee') {
        return res.status(403).send("无权限。");
    }
    // 简易分页省略，这里一次查全部
    const dishes = await Dish.find().sort({ dname: 1 });
    res.render("employeePages/employeeManageInventory", {
        loginUser,
        dishes
    });
});
route.post("/employee/markOutOfStock", async (req, res) => {
    const loginUser = req.session.loginUser;
    if (!loginUser || loginUser.type !== 'employee') {
        return res.status(403).json({ message: "无权限。" });
    }
    try {
        const { dishId } = req.body;
        await Dish.updateOne({ _id: dishId }, { $set: { dserve: 0 } });
        res.json({ message: "该菜品已标记为缺货。" });
    } catch (err) {
        console.error("标记缺货出错:", err);
        res.status(500).json({ message: "标记缺货失败。" });
    }
});

// 新增“补货”接口
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
        await Dish.updateOne({ _id: dishId }, { $set: { dserve: qty } });
        res.json({ message: "该菜品已成功补货为 " + qty + " 份。" });
    } catch (err) {
        console.error("补货错误:", err);
        res.status(500).json({ message: "补货失败。" });
    }
});

module.exports = route;
