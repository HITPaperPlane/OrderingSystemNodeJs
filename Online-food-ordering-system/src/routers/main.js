const { Router } = require('express');
const express = require('express');
const session = require('express-session');
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
 * 首页 - 游客可查看
 */
route.get("/", (req, res) => {
    const loginUser = req.session.loginUser;
    res.render("index", {
        loginUser: loginUser
    });
});

/**
 * 注册页面
 */
route.get("/register", (req, res) => {
    const loginUser = req.session.loginUser;
    res.render("registration", {
        loginUser: loginUser
    });
});

/**
 * 登录页面
 */
route.get('/login', (req, res) => {
    const loginUser = req.session.loginUser;
    res.render("login", {
        loginUser: loginUser
    });
});

/**
 * 保存注册信息
 */
route.post("/saveRegistration", async (req, res) => {
    try {
        const existingUser = await User.findOne({ email: req.body.email });
        if (existingUser) {
            return res.render("registration", {
                registrationError: "该邮箱已被注册，请更换邮箱。",
                loginUser: req.session.loginUser
            });
        }
        const data = await User.create(req.body);
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

/**
 * 登录处理
 */
route.post("/loginUser", async (req, res) => {
    try {
        const data = await User.findOne({ email: req.body.email, password: req.body.password });
        if (!data) {
            // 用户名或密码错误
            res.render("login", {
                invalid: true,
                email: req.body.email
            });
        } else {
            req.session.loginUser = data;
            res.redirect("/dashboard");
        }
    } catch (error) {
        console.error("登录错误:", error);
        res.render("login", {
            loginError: "登录时出现错误，请重试。"
        });
    }
});

/**
 * 不同角色的Dashboard路由
 */
route.get("/dashboard", (req, res) => {
    if (req.session.loginUser) {
        const loginUser = req.session.loginUser;
        if (loginUser.type === 'normal') {
            // 普通用户
            res.render("normalPages/normalDashboard", {
                loginUser: loginUser
            });
        } else if (loginUser.type === 'admin') {
            // 管理员
            res.render("adminPages/adminDashboard", {
                loginUser: loginUser
            });
        } else if (loginUser.type === 'employee') {
            // 员工
            res.render("employeePages/employeeDashboard", {
                loginUser: loginUser
            });
        } else if (loginUser.type === 'manager') {
            // 经理
            res.render("managerPages/managerDashboard", {
                loginUser: loginUser
            });
        }
    } else {
        res.render("login", {
            loginFirst: true
        });
    }
});

/**
 * 退出登录
 */
route.get("/logout", (req, res) => {
    req.session.destroy();
    res.render("login", {
        logout: true
    });
});

/**
 * 菜品列表（游客可浏览菜单）
 */
route.get("/foods/:page", async (req, res) => {
    const loginUser = req.session.loginUser;
    let currentPage = 1;
    let page = parseInt(req.params.page);
    if (page && !isNaN(page)) {
        currentPage = page;
    }
    const total = 6; // 每页6个菜品
    const start = (currentPage - 1) * total;
    const foods = await Dish.find().skip(start).limit(total);
    const count = Math.ceil(await Dish.find().countDocuments() / total);

    res.render("showDishes", {
        loginUser: loginUser,
        foods: foods,
        count: count,
        currentPage: currentPage
    });
});

/**
 * 搜索菜品
 */
route.post("/searchFood", async (req, res) => {
    try {
        const loginUser = req.session.loginUser;
        const search = req.body.foodSearch;
        const data = await Dish.find({ "dname": new RegExp(search, 'i') });
        res.render("showDishes", {
            loginUser: loginUser,
            foods: data,
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
 * 用户下单前的“去结算”页面
 */
route.get("/user/orderFood", (req, res) => {
    if (req.session.loginUser) {
        const loginUser = req.session.loginUser;
        res.render("normalPages/normalCheckout", {
            loginUser: loginUser
        });
    } else {
        res.render("login", {
            loginFirst: true
        });
    }
});

/**
 * 生成订单
 */
route.post("/orderNowFromBasket", async (req, res) => {
    if (req.session.loginUser) {
        const loginUser = req.session.loginUser;
        const basket = JSON.parse(req.body.data);
        const pickupTime = req.body.pickupTime || "尽快"; 
        const specialRequests = req.body.specialRequests || ""; 
        const paymentType = req.body.paymentType;

        // 下单时间
        const dt_ob = new Date();
        const dateTime = `${("0" + dt_ob.getDate()).slice(-2)}/${("0" + (dt_ob.getMonth() + 1)).slice(-2)}/${dt_ob.getFullYear()} ` +
                         `${("0" + dt_ob.getHours()).slice(-2)}:${("0" + dt_ob.getMinutes()).slice(-2)}:${("0" + dt_ob.getSeconds()).slice(-2)}`;

        try {
            for (const item of basket) {
                let object = {
                    dishId: item.id,
                    userId: loginUser._id,
                    user: loginUser,
                    photo: item.image,
                    dname: item.name,
                    time: dateTime,
                    pickupTime: pickupTime,
                    specialRequests: specialRequests,
                    price: item.price,
                    quantity: item.quantity,
                    paymentType: paymentType,
                    states: "NA" // 初始状态
                };
                await Order.create(object);
            }
            res.redirect("/");
        } catch (error) {
            console.error("下单时出现错误:", error);
            res.status(500).send("<h2>下单失败，请重试。</h2>");
        }
    } else {
        res.render("login", {
            loginFirst: true
        });
    }
});

/**
 * 查看当前订单（普通用户）
 */
route.get("/user/orders", async (req, res) => {
    if (req.session.loginUser) {
        const loginUser = req.session.loginUser;
        try {
            // 只查未完成订单
            const data = await Order.find({ $and: [{ "states": { $ne: "Order completed." } }, { "userId": loginUser._id }] }).sort({ pickupTime: 1 });
            res.render("normalPages/normalOrders", {
                loginUser: loginUser,
                orderFood: data
            });
        } catch (error) {
            console.error("获取订单错误:", error);
            res.render("normalPages/normalOrders", {
                loginUser: loginUser,
                orderFood: [],
                fetchError: "获取订单失败。"
            });
        }
    } else {
        res.render("login", {
            loginFirst: true
        });
    }
});

/**
 * 用户取消订单
 * 要求：在取餐前30分钟才能取消，这里仅作简单示例
 */
route.get("/user/cancelOrder/:id", async (req, res) => {
    if (req.session.loginUser) {
        const loginUser = req.session.loginUser;
        try {
            // 如果需要严格判断时间，可在此先查询 pickupTime ，判断是否超过可取消时间
            const del = await Order.deleteOne({ _id: req.params.id, userId: loginUser._id });
            if (del.deletedCount > 0) {
                const data = await Order.find({ $and: [{ "states": { $ne: "Order completed." } }, { "userId": loginUser._id }] }).sort({ pickupTime: 1 });
                res.render("normalPages/normalOrders", {
                    loginUser: loginUser,
                    orderFood: data,
                    cancelOrder: true
                });
            } else {
                res.status(500).send("<h2>无法取消订单，可能订单已被删除或不属于你。</h2>");
            }
        } catch (error) {
            console.error("取消订单错误:", error);
            res.status(500).send("<h2>取消订单出错。</h2>");
        }
    } else {
        res.render("login", {
            loginFirst: true
        });
    }
});

/**
 * 用户查看历史订单
 */
route.get("/user/history", async (req, res) => {
    if (req.session.loginUser) {
        const loginUser = req.session.loginUser;
        try {
            const data = await Order.find({ "userId": loginUser._id }).sort({ pickupTime: -1 });
            res.render("normalPages/normalHistory", {
                loginUser: loginUser,
                history: data
            });
        } catch (error) {
            console.error("获取历史订单错误:", error);
            res.render("normalPages/normalHistory", {
                loginUser: loginUser,
                history: [],
                fetchError: "获取历史订单失败。"
            });
        }
    } else {
        res.render("login", {
            loginFirst: true
        });
    }
});

/**
 * 用户收藏夹功能 - 添加到收藏
 */
route.post("/user/addFavourite/:dishId", async (req, res) => {
    if (req.session.loginUser) {
        const loginUser = req.session.loginUser;
        try {
            // 判断是否已经收藏
            const found = await Favourite.findOne({ userId: loginUser._id, dishId: req.params.dishId });
            if (!found) {
                await Favourite.create({ userId: loginUser._id, dishId: req.params.dishId });
            }
            // 重定向或返回成功提示
            res.redirect("/foods/1");
        } catch (error) {
            console.error("收藏出现错误:", error);
            res.status(500).send("收藏时出错。");
        }
    } else {
        res.render("login", {
            loginFirst: true
        });
    }
});

/**
 * 用户查看收藏夹
 */
route.get("/user/favourites", async (req, res) => {
    if (req.session.loginUser) {
        const loginUser = req.session.loginUser;
        try {
            // 查询收藏的dish
            const favs = await Favourite.find({ userId: loginUser._id });
            // 获取收藏的dish详细信息
            let dishIds = favs.map(f => f.dishId);
            let favDishes = [];
            if (dishIds.length > 0) {
                favDishes = await Dish.find({ _id: { $in: dishIds } });
            }
            res.render("normalPages/normalFavourites", {
                loginUser,
                favDishes
            });
        } catch (error) {
            console.error("获取收藏夹错误:", error);
            res.render("normalPages/normalFavourites", {
                loginUser,
                favDishes: [],
                fetchError: "获取收藏夹失败。"
            });
        }
    } else {
        res.render("login", {
            loginFirst: true
        });
    }
});

/**
 * 用户对订单评价
 */
route.post("/user/feedback", async (req, res) => {
    if (req.session.loginUser) {
        const { orderId, rating, comment } = req.body;
        const loginUser = req.session.loginUser;
        try {
            await Feedback.create({
                orderId: orderId,
                userId: loginUser._id,
                rating: rating,
                comment: comment
            });
            res.redirect("/user/history");
        } catch (error) {
            console.error("评价出现错误:", error);
            res.status(500).send("评价失败，请重试。");
        }
    } else {
        res.render("login", {
            loginFirst: true
        });
    }
});

/**
 * 用户编辑个人资料
 */
route.get("/user/editProfile", (req, res) => {
    if (!req.session.loginUser) {
        return res.render("login", { loginFirst: true });
    }
    res.render("normalPages/normalEditProfile", {
        loginUser: req.session.loginUser
    });
});
route.post("/user/saveProfile", async (req, res) => {
    if (!req.session.loginUser) {
        return res.render("login", { loginFirst: true });
    }
    const loginUser = req.session.loginUser;
    try {
        // 如果上传了新头像
        if (req.files && req.files.photo) {
            const oldImage = loginUser.photo;
            const { photo } = req.files;
            const imageName = `${Date.now()}_${photo.name}`;
            const uploadPath = path.join(__dirname, '../../public/userImages');
            if (!fs.existsSync(uploadPath)) {
                fs.mkdirSync(uploadPath, { recursive: true });
            }
            const imagePath = path.join(uploadPath, imageName);
            await photo.mv(imagePath);
            req.body.photo = imageName;
            // 如果有旧头像则删除(可选)
            if (oldImage) {
                const oldImagePath = path.join(uploadPath, oldImage);
                if (fs.existsSync(oldImagePath)) {
                    fs.unlinkSync(oldImagePath);
                }
            }
        }
        // 更新用户资料
        await User.updateOne({ _id: loginUser._id }, { $set: req.body });
        // 更新session
        const updatedUser = await User.findById(loginUser._id);
        req.session.loginUser = updatedUser;
        res.redirect("/dashboard");
    } catch (err) {
        console.log("更新个人资料错误:", err);
        res.status(500).send("更新个人资料失败，请稍后再试");
    }
});

/**
 * 管理员功能：添加新菜品
 */
route.get("/admin/addDish", (req, res) => {
    if (req.session.loginUser) {
        const loginUser = req.session.loginUser;
        if (loginUser.type === "admin") {
            res.render("adminPages/adminAddNewDish", {
                loginUser: loginUser
            });
        } else {
            res.status(403).send("无权访问此页面。");
        }
    } else {
        res.render("login", {
            loginFirst: true
        });
    }
});

/**
 * 管理员 - 保存新菜品
 */
route.post('/saveDish', async (req, res) => {
    if (!req.session.loginUser || req.session.loginUser.type !== 'admin') {
        return res.status(403).send("无权限。");
    }
    try {
        if (!req.files || req.body.ddiscount > 100 || req.body.dname.trim() === '' || req.body.dprice <= 0) {
            return res.render("adminPages/adminAddNewDish", {
                notsave: true,
                loginUser: req.session.loginUser
            });
        }

        const { photo } = req.files;
        const imageName = `${Date.now()}_${photo.name}`;
        const uploadPath = path.join(__dirname, '../../public/dishImages');
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        const imagePath = path.join(uploadPath, imageName);
        await photo.mv(imagePath);

        req.body.photo = imageName;
        const data = await Dish.create(req.body);
        if (data) {
            return res.render("adminPages/adminAddNewDish", {
                save: true,
                loginUser: req.session.loginUser
            });
        } else {
            return res.render("adminPages/adminAddNewDish", {
                notsave: true,
                loginUser: req.session.loginUser
            });
        }
    } catch (error) {
        console.error("保存菜品时出现错误:", error);
        return res.render("adminPages/adminAddNewDish", {
            notsave: true,
            loginUser: req.session.loginUser
        });
    }
});

/**
 * 管理员 - 展示菜品表
 */
route.get("/admin/dishMenus/:page", async function (req, res) {
    if (req.session.loginUser && req.session.loginUser.type === "admin") {
        const loginUser = req.session.loginUser;
        let currentPage = 1;
        let page = parseInt(req.params.page);
        if (page && !isNaN(page)){
            currentPage = page;
        }
        const total = 6;
        const start = (currentPage - 1) * total;
        const data = await Dish.find().skip(start).limit(total);
        const totalPage = Math.ceil(await Dish.find().countDocuments() / total);
        res.render("adminPages/adminFoodTable", {
            loginUser,
            foods: data,
            currentPage,
            count: totalPage
        });
    } else {
        res.render("login", { loginFirst: true });
    }
});

/**
 * 管理员 - 删除菜品
 */
route.get('/admin/deleteDish/:id', async (req, res) => {
    if (req.session.loginUser && req.session.loginUser.type === 'admin') {
        try {
            const dishToDelete = await Dish.findById(req.params.id);
            if (dishToDelete && dishToDelete.photo) {
                const imagePath = path.join(__dirname, '../../public/dishImages', dishToDelete.photo);
                if (fs.existsSync(imagePath)) {
                    fs.unlinkSync(imagePath);
                }
            }
            const data = await Dish.deleteOne({ "_id": req.params.id });
            if (data.deletedCount > 0) {
                let currentPage = 1;
                const total = 6;
                const start = (currentPage - 1) * total;
                const foods = await Dish.find().skip(start).limit(total);
                const totalPage = Math.ceil(await Dish.find().countDocuments() / total);
                return res.render("adminPages/adminFoodTable", {
                    loginUser: req.session.loginUser,
                    foods: foods,
                    currentPage: 1,
                    count: totalPage,
                    delete: true
                });
            } else {
                res.status(500).send("删除失败。");
            }
        } catch (error) {
            console.error("删除菜品错误:", error);
            res.status(500).send("删除时出现错误。");
        }
    } else {
        res.render("login", { loginFirst: true });
    }
});

/**
 * 管理员 - 编辑菜品
 */
route.get("/admin/editDish/:id/:flag", async (req, res) => {
    if (req.session.loginUser && req.session.loginUser.type === 'admin') {
        try {
            const data = await Dish.findById(req.params.id);
            if (data) {
                res.render("adminPages/adminEditDish", {
                    food: data,
                    loginUser: req.session.loginUser
                });
            } else {
                res.status(404).send("菜品未找到。");
            }
        } catch (error) {
            console.error("编辑菜品错误:", error);
            res.status(500).send("服务器错误。");
        }
    } else {
        res.status(403).send("无权限。");
    }
});

route.post("/admin/saveEditDish/:id", async (req, res) => {
    if (req.session.loginUser && req.session.loginUser.type === 'admin') {
        try {
            if (req.files && req.files.photo) {
                const oldImagePath = path.join(__dirname, '../../public/dishImages', req.body.tempImage);
                if (fs.existsSync(oldImagePath)) {
                    fs.unlinkSync(oldImagePath);
                }
                const { photo } = req.files;
                const imageName = `${Date.now()}_${photo.name}`;
                req.body.photo = imageName;
                await photo.mv(path.join(__dirname, '../../public/dishImages/', imageName));
            } else {
                delete req.body.photo; 
            }

            const updateData = { ...req.body };
            if (!updateData.photo) {
                delete updateData.photo;
            }
            const data = await Dish.updateOne({ _id: req.params.id }, { $set: updateData });
            if (data.modifiedCount > 0) {
                res.redirect("/admin/editDish/" + req.params.id + "/success");
            } else {
                res.redirect("/admin/editDish/" + req.params.id + "/error");
            }
        } catch (error) {
            console.error("保存编辑菜品错误:", error);
            res.redirect("/admin/editDish/" + req.params.id + "/error");
        }
    } else {
        res.status(403).send("无权限。");
    }
});

/**
 * 管理员查看所有订单
 */
route.get("/admin/adminOrder/:page", async (req, res) => {
    if (req.session.loginUser && req.session.loginUser.type === 'admin') {
        let currentPage = 1;
        const page = parseInt(req.params.page);
        if (page && !isNaN(page)){
            currentPage = page;
        }
        const total = 10;
        const start = (currentPage - 1) * total;
        const data = await Order.find().sort({ pickupTime: 1 }).skip(start).limit(total);
        const totalPage = Math.ceil(await Order.find().countDocuments() / total);
        res.render('adminPages/adminOrders', {
            loginuser: req.session.loginUser,
            orders: data,
            currentPage,
            count: totalPage
        });
    } else {
        res.status(403).send("无权限查看。");
    }
});

/**
 * 管理员 - 更新订单状态
 */
route.get("/admin/cooking/:id", async (req, res) => {
    if (req.session.loginUser && req.session.loginUser.type === 'admin') {
        try {
            await Order.updateOne({ _id: req.params.id }, { $set: { states: "Cooking" } });
            res.redirect("/admin/adminOrder/1");
        } catch (error) {
            console.error("更新订单到烹饪中错误:", error);
            res.status(500).send("更新订单状态失败。");
        }
    } else {
        res.status(403).send("无权限。");
    }
});

route.get("/admin/deliver/:id", async (req, res) => {
    if (req.session.loginUser && req.session.loginUser.type === 'admin') {
        try {
            await Order.updateOne({ _id: req.params.id }, { $set: { states: "Out for delivery." } });
            res.redirect("/admin/adminOrder/1");
        } catch (error) {
            console.error("更新订单到派送中错误:", error);
            res.status(500).send("更新订单状态失败。");
        }
    } else {
        res.status(403).send("无权限。");
    }
});

route.get("/admin/handover/:id", async (req, res) => {
    if (req.session.loginUser && req.session.loginUser.type === 'admin') {
        try {
            await Order.updateOne({ _id: req.params.id }, { $set: { states: "Order completed." } });
            res.redirect("/admin/adminOrder/1");
        } catch (error) {
            console.error("更新订单为完成错误:", error);
            res.status(500).send("更新订单状态失败。");
        }
    } else {
        res.status(403).send("无权限。");
    }
});

/**
 * 员工 - 查看/管理订单
 */
route.get("/employee/dashboard", (req, res) => {
    if (req.session.loginUser && req.session.loginUser.type === 'employee') {
        res.render("employeePages/employeeDashboard", {
            loginUser: req.session.loginUser
        });
    } else {
        res.status(403).send("无权限。");
    }
});

route.get("/employee/orders/:page", async (req, res) => {
    if (req.session.loginUser && req.session.loginUser.type === 'employee') {
        const loginUser = req.session.loginUser;
        let currentPage = 1;
        let page = parseInt(req.params.page);
        if (page && !isNaN(page)) {
            currentPage = page;
        }
        const total = 10;
        const start = (currentPage - 1) * total;
        try {
            const data = await Order.find({ states: { $ne: "Order completed." } })
                .sort({ pickupTime: 1 })
                .skip(start)
                .limit(total);
            const totalPage = Math.ceil(await Order.find({ states: { $ne: "Order completed." } }).countDocuments() / total);
            res.render("employeePages/employeeOrders", {
                loginUser: loginUser,
                orders: data,
                currentPage: currentPage,
                count: totalPage
            });
        } catch (error) {
            console.error("员工获取订单错误:", error);
            res.status(500).send("获取订单失败。");
        }
    } else {
        res.status(403).send("无权限。");
    }
});

route.post("/employee/updateOrderStatus", async (req, res) => {
    if (req.session.loginUser && req.session.loginUser.type === 'employee') {
        const { orderId, status } = req.body;
        const validStatuses = ["in progress", "completed"];
        if (!validStatuses.includes(status.toLowerCase())) {
            return res.status(400).json({ message: "状态无效。" });
        }
        try {
            await Order.updateOne({ _id: orderId }, { $set: { states: status } });
            res.json({ message: "订单状态更新成功。" });
        } catch (error) {
            console.error("员工更新订单状态错误:", error);
            res.status(500).json({ message: "更新订单状态失败。" });
        }
    } else {
        res.status(403).json({ message: "无权限。" });
    }
});

route.get("/employee/history/:page", async (req, res) => {
    if (req.session.loginUser && req.session.loginUser.type === 'employee') {
        const loginUser = req.session.loginUser;
        let currentPage = 1;
        let page = parseInt(req.params.page);
        if (page && !isNaN(page)) {
            currentPage = page;
        }
        const total = 10;
        const start = (currentPage - 1) * total;
        try {
            // 员工只查看自己下的订单历史？这看业务需求了。可改成查看所有订单的历史
            const data = await Order.find({ userId: loginUser._id })
                .sort({ pickupTime: -1 })
                .skip(start)
                .limit(total);
            const totalPage = Math.ceil(await Order.find({ userId: loginUser._id }).countDocuments() / total);
            res.render("employeePages/employeeHistory", {
                loginUser: loginUser,
                history: data,
                currentPage: currentPage,
                count: totalPage
            });
        } catch (error) {
            console.error("员工获取历史订单错误:", error);
            res.status(500).send("获取历史订单失败。");
        }
    } else {
        res.status(403).send("无权限。");
    }
});

route.post("/employee/markOutOfStock", async (req, res) => {
    if (req.session.loginUser && req.session.loginUser.type === 'employee') {
        const { dishId } = req.body;
        try {
            await Dish.updateOne({ _id: dishId }, { $set: { dserve: 0 } });
            res.json({ message: "该菜品已标记为缺货。" });
        } catch (error) {
            console.error("员工标记缺货错误:", error);
            res.status(500).json({ message: "标记缺货失败。" });
        }
    } else {
        res.status(403).json({ message: "无权限。" });
    }
});

/**
 * 经理功能示例
 */
route.get("/manager/dashboard", (req, res) => {
    if (req.session.loginUser && req.session.loginUser.type === 'manager') {
        res.render("managerPages/managerDashboard", {
            loginUser: req.session.loginUser
        });
    } else {
        res.status(403).send("无权限。");
    }
});

/**
 * 经理 - 查看所有用户（示例，可增删改）
 */
route.get("/manager/users", async (req, res) => {
    if (req.session.loginUser && req.session.loginUser.type === 'manager') {
        const users = await User.find().sort({ type: 1 });
        res.render("managerPages/managerUsers", {
            loginUser: req.session.loginUser,
            users
        });
    } else {
        res.status(403).send("无权限。");
    }
});

/**
 * 经理 - 更新用户资料
 */
route.post("/manager/updateUser/:id", async (req, res) => {
    if (req.session.loginUser && req.session.loginUser.type === 'manager') {
        try {
            await User.updateOne({ _id: req.params.id }, { $set: req.body });
            res.redirect("/manager/users");
        } catch (err) {
            console.error("经理更新用户资料错误:", err);
            res.status(500).send("更新失败。");
        }
    } else {
        res.status(403).send("无权限。");
    }
});

/**
 * 经理 - 查看所有订单和支付状态
 */
route.get("/manager/allOrders", async (req, res) => {
    if (req.session.loginUser && req.session.loginUser.type === 'manager') {
        const allOrders = await Order.find().sort({ pickupTime: 1 });
        res.render("managerPages/managerAllOrders", {
            loginUser: req.session.loginUser,
            orders: allOrders
        });
    } else {
        res.status(403).send("无权限。");
    }
});

/**
 * 经理 - 查看历史订单记录
 */
route.get("/manager/history", async (req, res) => {
    if (req.session.loginUser && req.session.loginUser.type === 'manager') {
        const allOrders = await Order.find().sort({ pickupTime: -1 });
        res.render("managerPages/managerHistory", {
            loginUser: req.session.loginUser,
            orders: allOrders
        });
    } else {
        res.status(403).send("无权限。");
    }
});

module.exports = route;
