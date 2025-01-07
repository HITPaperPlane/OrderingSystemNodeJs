const { Router } = require('express');
const express = require('express');
const session = require('express-session');
const route = express.Router();
const path = require('path');
const User = require('../modul/user');
const dish = require("../modul/dish");
const order = require('../modul/order');
const { __express } = require('hbs');
const fs = require('fs');

route.get("/", (req, res) => {
    const loginUser = req.session.loginUser;
    res.render("index", {
        loginUser: loginUser
    });
});

route.get("/register", (req, res) => {
    const loginUser = req.session.loginUser;
    res.render("registration", {
        loginUser: loginUser
    });
});

route.get('/login', (req, res) => {
    const loginUser = req.session.loginUser;
    res.render("login", {
        loginUser: loginUser
    });
});

// Food page for normal users
route.get("/foods/:page", async (req, res) => {
    const loginUser = req.session.loginUser;
    let currentPage = 1;
    let page = parseInt(req.params.page);
    if (page && !isNaN(page))
        currentPage = page;
    const total = 6;
    const start = (currentPage - 1) * total;
    const foods = await dish.find().skip(start).limit(total);
    const count = Math.ceil(await dish.find().countDocuments() / total);

    console.log(count + " :=> " + foods);
    res.render("showDishes", {
        loginUser: loginUser,
        foods: foods,
        count: count,
        currentPage: currentPage
    });
});

route.post("/saveRegistration", async (req, res) => {
    try {
        const existingUser = await User.findOne({ email: req.body.email });
        if (existingUser) {
            return res.render("registration", {
                registrationError: "Email already exists.",
                loginUser: req.session.loginUser
            });
        }
        const data = await User.create(req.body);
        res.render("login", {
            newRegister: true
        });
    } catch (error) {
        console.error("Registration Error:", error);
        res.render("registration", {
            registrationError: "An error occurred. Please try again.",
            loginUser: req.session.loginUser
        });
    }
});

route.post("/loginUser", async (req, res) => {
    try {
        const data = await User.findOne({ email: req.body.email, password: req.body.password });
        console.log(data);

        if (!data) {
            console.log("Invalid password or email");
            res.render("login", {
                invalid: true,
                email: req.body.email
            });
        } else {
            req.session.loginUser = data;
            console.log('Logged in user name: ' + req.session.loginUser.name);
            res.redirect("/dashboard");
        }
    } catch (error) {
        console.error("Login Error:", error);
        res.render("login", {
            loginError: "An error occurred during login. Please try again."
        });
    }
});

route.get("/dashboard", (req, res) => {
    if (req.session.loginUser) {
        const loginUser = req.session.loginUser;
        if (loginUser.type === 'normal') {
            console.log("Normal user");
            res.render("normalPages/normalDashboard", {
                loginUser: loginUser
            });
        } else if (loginUser.type === 'admin') {
            console.log('Admin user');
            res.render("adminPages/adminDashboard", {
                loginUser: loginUser
            });
        } else if (loginUser.type === 'employee') {
            console.log('Employee user');
            res.render("employeePages/employeeDashboard", {
                loginUser: loginUser
            });
        }
    } else {
        res.render("login", {
            loginFirst: true
        });
    }
});

// Admin Routes
route.get("/admin/addDish", (req, res) => {
    if (req.session.loginUser) {
        const loginUser = req.session.loginUser;

        if (loginUser.type === "admin") {
            res.render("adminPages/adminAddNewDish", {
                loginUser: loginUser
            });
        } else {
            res.status(403).send(`<h1>Access Denied!</h1><h2>You do not have permission to access this page.</h2>`);
        }
    } else {
        res.render("login", {
            loginFirst: true
        });
    }
});

// Show food table in admin panel
route.get("/admin/dishMenus/:page", async function (req, res) {
    if (req.session.loginUser) {
        const loginUser = req.session.loginUser;
        let currentPage = 1;
        let page = parseInt(req.params.page);
        if (page && !isNaN(page))
            currentPage = page;
        const total = 6;
        const start = (currentPage - 1) * total;
        const data = await dish.find().skip(start).limit(total);
        const totalPage = Math.ceil(await dish.find().countDocuments() / total);
        if (loginUser.type === "admin") {
            res.render("adminPages/adminFoodTable", {
                loginUser: loginUser,
                foods: data,
                currentPage: currentPage,
                count: totalPage
            });
        } else {
            res.status(403).send(`<h1>Access Denied!</h1><h2>You do not have permission to access this page.</h2>`);
        }
    } else {
        res.render("login", {
            loginFirst: true
        });
    }
});

// Search food dish by user
route.post("/searchFood", async (req, res) => {
    try {
        const loginUser = req.session.loginUser;
        const search = req.body.foodSearch;
        const data = await dish.find({ "dname": new RegExp(search, 'i') });
        res.render("showDishes", {
            loginUser: loginUser,
            foods: data,
            searchKey: search
        });
    } catch (error) {
        console.error("Search Error:", error);
        res.render("showDishes", {
            loginUser: req.session.loginUser,
            searchError: "An error occurred during search. Please try again."
        });
    }
});

// Save the dish
route.post('/saveDish', async (req, res) => {
    try {
        // Validate uploaded file and form inputs
        if (
            !req.files ||
            req.body.ddiscount > 100 ||
            req.body.dname.trim() === '' ||
            req.body.dprice <= 0
        ) {
            return res.render("adminPages/adminAddNewDish", {
                notsave: true,
                loginUser: req.session.loginUser
            });
        }

        // Get uploaded image file
        const { photo } = req.files;
        const imageName = `${Date.now()}_${photo.name}`; // Generate unique filename

        // Construct image storage path
        const uploadPath = path.join(__dirname, '../../public/dishImages');
        console.log(uploadPath);
        const imagePath = path.join(uploadPath, imageName);

        // Ensure directory exists
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }

        // Move image to target path
        await photo.mv(imagePath);

        // Save image path to req.body
        req.body.photo = `${imageName}`;

        // Create dish in database
        const data = await dish.create(req.body);
        console.log(req.body);
        if (data) {
            console.log("Dish saved successfully");
            return res.render("adminPages/adminAddNewDish", {
                save: true,
                loginUser: req.session.loginUser
            });
        } else {
            console.error("Failed to save dish");
            return res.render("adminPages/adminAddNewDish", {
                notsave: true,
                loginUser: req.session.loginUser
            });
        }
    } catch (error) {
        console.error("Error while saving dish:", error);
        return res.render("adminPages/adminAddNewDish", {
            notsave: true,
            loginUser: req.session.loginUser
        });
    }
});

// Delete the dish
route.get('/admin/deleteDish/:id', async (req, res) => {
    if (req.session.loginUser) {
        const loginUser = req.session.loginUser;
        if (loginUser.type !== 'admin') {
            return res.status(403).send(`<h1>Access Denied!</h1><h2>You do not have permission to perform this action.</h2>`);
        }
        try {
            const dishToDelete = await dish.findById(req.params.id);
            if (dishToDelete && dishToDelete.photo) {
                const imagePath = path.join(__dirname, '../../public/dishImages', dishToDelete.photo);
                if (fs.existsSync(imagePath)) {
                    fs.unlinkSync(imagePath);
                    console.log('Deleted image:', imagePath);
                }
            }
            const data = await dish.deleteOne({ "_id": req.params.id });
            if (data.deletedCount > 0) {
                console.log("Dish is deleted...");
                const currentPage = 1;
                const total = 6;
                const start = (currentPage - 1) * total;
                const foods = await dish.find().skip(start).limit(total);
                const totalPage = Math.ceil(await dish.find().countDocuments() / total);
                res.render("adminPages/adminFoodTable", {
                    loginUser: loginUser,
                    foods: foods,
                    currentPage: 1,
                    count: totalPage,
                    delete: true
                });
            } else {
                res.status(500).send("<h1>Server Error!</h1><h2>Sorry, the dish was not deleted. Please try again.</h2>");
            }
        } catch (error) {
            console.error("Delete Dish Error:", error);
            res.status(500).send("<h1>Server Error!</h1><h2>Sorry, an error occurred while deleting the dish.</h2>");
        }
    } else {
        res.render("login", {
            loginFirst: true
        });
    }
});

// Place order for admin (possibly to view all orders)
route.get("/admin/adminOrder/:page", async (req, res) => {
    if (req.session.loginUser) {
        const loginUser = req.session.loginUser;
        if (loginUser.type === 'admin') {
            let currentPage = 1;
            const page = parseInt(req.params.page);
            if (page && !isNaN(page))
                currentPage = page;
            const total = 10;
            const start = (currentPage - 1) * total;
            const data = await order.find().sort({ pickupTime: 1 }).skip(start).limit(total); // Prioritize by pickup time
            const totalPage = Math.ceil(await order.find().countDocuments() / total);
            console.log("Place order: " + data);
            res.render('adminPages/adminOrders', {
                loginuser: loginUser,
                orders: data,
                currentPage: currentPage,
                count: totalPage
            });
        } else {
            res.status(403).send("<h2>Access Denied!</h2>");
        }
    } else {
        res.render("login", {
            loginFirst: true
        });
    }
});

// Change order states
route.get("/admin/cooking/:id", async (req, res) => {
    if (req.session.loginUser && req.session.loginUser.type === 'admin') {
        try {
            await order.updateOne({ _id: req.params.id }, { $set: { states: "Cooking" } });
            res.redirect("/admin/adminOrder/1");
        } catch (error) {
            console.error("Update Order to Cooking Error:", error);
            res.status(500).send("<h2>Failed to update order status.</h2>");
        }
    } else {
        res.status(403).send("<h2>Access Denied!</h2>");
    }
});

route.get("/admin/deliver/:id", async (req, res) => {
    if (req.session.loginUser && req.session.loginUser.type === 'admin') {
        try {
            await order.updateOne({ _id: req.params.id }, { $set: { states: "Out for delivery." } });
            res.redirect("/admin/adminOrder/1");
        } catch (error) {
            console.error("Update Order to Out for Delivery Error:", error);
            res.status(500).send("<h2>Failed to update order status.</h2>");
        }
    } else {
        res.status(403).send("<h2>Access Denied!</h2>");
    }
});

route.get("/admin/handover/:id", async (req, res) => {
    if (req.session.loginUser && req.session.loginUser.type === 'admin') {
        try {
            await order.updateOne({ _id: req.params.id }, { $set: { states: "Order completed." } });
            res.redirect("/admin/adminOrder/1");
        } catch (error) {
            console.error("Update Order to Completed Error:", error);
            res.status(500).send("<h2>Failed to update order status.</h2>");
        }
    } else {
        res.status(403).send("<h2>Access Denied!</h2>");
    }
});

// Edit dish
route.get("/admin/editDish/:id/:flag", async (req, res) => {
    if (req.session.loginUser && req.session.loginUser.type === 'admin') {
        try {
            const data = await dish.findById(req.params.id);
            const flag = req.params.flag;
            if (data) {
                res.render("adminPages/adminEditDish", {
                    food: data,
                    loginUser: req.session.loginUser
                });
            } else {
                res.status(404).send(`<h1>Dish Not Found!</h1>`);
            }
        } catch (error) {
            console.error("Edit Dish Error:", error);
            res.status(500).send(`<h1>Server Error!</h1>`);
        }
    } else {
        res.status(403).send(`<h1>Access Denied!</h1>`);
    }
});

route.post("/admin/saveEditDish/:id", async (req, res) => {
    if (req.session.loginUser && req.session.loginUser.type === 'admin') {
        try {
            if (req.files && req.files.photo) {
                console.log("Photo is selected. Old photo is " + req.body.tempImage);
                const oldImagePath = path.join(__dirname, '../../public/dishImages', req.body.tempImage);
                if (fs.existsSync(oldImagePath)) {
                    fs.unlinkSync(oldImagePath);
                    console.log('Old file is deleted');
                }
                const { photo } = req.files;
                const imageName = `${Date.now()}_${photo.name}`;
                req.body.photo = imageName;
                await photo.mv(path.join(__dirname, '../../public/dishImages/', imageName));
                console.log(req.body.photo);
            } else {
                delete req.body.photo; // Prevent overwriting if no new photo is uploaded
            }

            const updateData = { ...req.body };
            if (!updateData.photo) {
                delete updateData.photo;
            }

            const data = await dish.updateOne({ _id: req.params.id }, { $set: updateData });
            if (data.modifiedCount > 0) {
                console.log("Dish updated");
                res.redirect("/admin/editDish/" + req.params.id + "/success");
            } else {
                console.log('Dish not updated');
                res.redirect("/admin/editDish/" + req.params.id + "/error");
            }
        } catch (error) {
            console.error("Save Edit Dish Error:", error);
            res.redirect("/admin/editDish/" + req.params.id + "/error");
        }
    } else {
        res.status(403).send(`<h1>Access Denied!</h1>`);
    }
});

// Logout
route.get("/logout", (req, res) => {
    req.session.destroy();
    res.render("login", {
        logout: true
    });
});

// Check out
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

// Place order from basket
route.post("/orderNowFromBasket", async (req, res) => {
    if (req.session.loginUser) {
        const loginUser = req.session.loginUser;
        const basket = JSON.parse(req.body.data);
        const pickupTime = req.body.pickupTime || "ASAP"; // Get pickup time
        const specialRequests = req.body.specialRequests || ""; // Get special requests
        const paymentType = req.body.paymentType;

        const dt_ob = new Date();
        const dateTime = `${("0" + dt_ob.getDate()).slice(-2)}/${("0" + (dt_ob.getMonth() + 1)).slice(-2)}/${dt_ob.getFullYear()} T ${("0" + dt_ob.getHours()).slice(-2)}:${("0" + dt_ob.getMinutes()).slice(-2)}:${("0" + dt_ob.getSeconds()).slice(-2)}`;

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
                    states: "NA" // Not active order
                };
                console.log(object);
                const data = await order.create(object);
                console.log(data);
                if (data) {
                    console.log('Order data saved');
                }
            }
            res.redirect("/");
        } catch (error) {
            console.error("Order Placement Error:", error);
            res.status(500).send("<h2>Failed to place order. Please try again.</h2>");
        }
    } else {
        res.render("login", {
            loginFirst: true
        });
    }
});

// User Orders
route.get("/user/orders", async (req, res) => {
    if (req.session.loginUser) {
        const loginUser = req.session.loginUser;
        try {
            const data = await order.find({ $and: [{ "states": { $ne: "Order completed." } }, { "userId": loginUser._id }] }).sort({ pickupTime: 1 });
            console.log("Find data: " + data);
            res.render("normalPages/normalOrders", {
                loginUser: loginUser,
                orderFood: data
            });
        } catch (error) {
            console.error("Fetch Orders Error:", error);
            res.render("normalPages/normalOrders", {
                loginUser: loginUser,
                orderFood: [],
                fetchError: "Failed to fetch orders."
            });
        }
    } else {
        res.render("login", {
            loginFirst: true
        });
    }
});

// Cancel Order
route.get("/user/cancelOrder/:id", async (req, res) => {
    if (req.session.loginUser) {
        const loginUser = req.session.loginUser;
        try {
            const deleteData = await order.deleteOne({ _id: req.params.id });
            if (deleteData.deletedCount > 0) {
                const data = await order.find({ $and: [{ "states": { $ne: "Order completed." } }, { "userId": loginUser._id }] }).sort({ pickupTime: 1 });
                res.render("normalPages/normalOrders", {
                    loginUser: loginUser,
                    orderFood: data,
                    cancelOrder: true
                });
            } else {
                res.status(500).send("<h2>Failed to cancel order. Please try again.</h2>");
            }
        } catch (error) {
            console.error("Cancel Order Error:", error);
            res.status(500).send("<h2>An error occurred while canceling the order.</h2>");
        }
    } else {
        res.render("login", {
            loginFirst: true
        });
    }
});

// User Order History
route.get("/user/history", async (req, res) => {
    if (req.session.loginUser) {
        const loginUser = req.session.loginUser;
        try {
            const data = await order.find({ "userId": loginUser._id }).sort({ pickupTime: -1 });
            res.render("normalPages/normalHistory", {
                loginUser: loginUser,
                history: data
            });
        } catch (error) {
            console.error("Fetch History Error:", error);
            res.render("normalPages/normalHistory", {
                loginUser: loginUser,
                history: [],
                fetchError: "Failed to fetch order history."
            });
        }
    } else {
        res.render("login", {
            loginFirst: true
        });
    }
});

// Employee Routes
// Employee Dashboard
route.get("/employee/dashboard", (req, res) => {
    if (req.session.loginUser && req.session.loginUser.type === 'employee') {
        const loginUser = req.session.loginUser;
        res.render("employeePages/employeeDashboard", {
            loginUser: loginUser
        });
    } else {
        res.status(403).send(`<h1>Access Denied!</h1>`);
    }
});

// Employee View Orders
route.get("/employee/orders/:page", async (req, res) => {
    if (req.session.loginUser && req.session.loginUser.type === 'employee') {
        const loginUser = req.session.loginUser;
        let currentPage = 1;
        let page = parseInt(req.params.page);
        if (page && !isNaN(page))
            currentPage = page;
        const total = 10;
        const start = (currentPage - 1) * total;
        try {
            const data = await order.find({ states: { $ne: "Order completed." } }).sort({ pickupTime: 1 }).skip(start).limit(total);
            const totalPage = Math.ceil(await order.find({ states: { $ne: "Order completed." } }).countDocuments() / total);
            res.render("employeePages/employeeOrders", {
                loginUser: loginUser,
                orders: data,
                currentPage: currentPage,
                count: totalPage
            });
        } catch (error) {
            console.error("Employee Fetch Orders Error:", error);
            res.status(500).send("<h2>Failed to fetch orders.</h2>");
        }
    } else {
        res.status(403).send(`<h1>Access Denied!</h1>`);
    }
});

// Employee Update Order Status
route.post("/employee/updateOrderStatus", async (req, res) => {
    if (req.session.loginUser && req.session.loginUser.type === 'employee') {
        const { orderId, status } = req.body;
        const validStatuses = ["in progress", "completed"];
        if (!validStatuses.includes(status.toLowerCase())) {
            return res.status(400).json({ message: "Invalid status." });
        }
        try {
            await order.updateOne({ _id: orderId }, { $set: { states: status } });
            res.json({ message: "Order status updated successfully." });
        } catch (error) {
            console.error("Employee Update Order Status Error:", error);
            res.status(500).json({ message: "Failed to update order status." });
        }
    } else {
        res.status(403).json({ message: "Access denied." });
    }
});

// Employee View Order History
route.get("/employee/history/:page", async (req, res) => {
    if (req.session.loginUser && req.session.loginUser.type === 'employee') {
        const loginUser = req.session.loginUser;
        let currentPage = 1;
        let page = parseInt(req.params.page);
        if (page && !isNaN(page))
            currentPage = page;
        const total = 10;
        const start = (currentPage - 1) * total;
        try {
            const data = await order.find({ userId: req.session.loginUser._id }).sort({ pickupTime: -1 }).skip(start).limit(total);
            const totalPage = Math.ceil(await order.find({ userId: req.session.loginUser._id }).countDocuments() / total);
            res.render("employeePages/employeeHistory", {
                loginUser: loginUser,
                history: data,
                currentPage: currentPage,
                count: totalPage
            });
        } catch (error) {
            console.error("Employee Fetch History Error:", error);
            res.status(500).send("<h2>Failed to fetch order history.</h2>");
        }
    } else {
        res.status(403).send(`<h1>Access Denied!</h1>`);
    }
});

// Employee Mark Out-of-Stock Dish
route.post("/employee/markOutOfStock", async (req, res) => {
    if (req.session.loginUser && req.session.loginUser.type === 'employee') {
        const { dishId } = req.body;
        try {
            await dish.updateOne({ _id: dishId }, { $set: { dserve: 0 } }); // Assuming dserve represents available quantity
            res.json({ message: "Dish marked as out-of-stock." });
        } catch (error) {
            console.error("Employee Mark Out-of-Stock Error:", error);
            res.status(500).json({ message: "Failed to mark dish as out-of-stock." });
        }
    } else {
        res.status(403).json({ message: "Access denied." });
    }
});

module.exports = route;
