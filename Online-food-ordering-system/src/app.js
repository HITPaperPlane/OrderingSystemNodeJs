const express = require('express');
const hbs = require('hbs');
const route = require('./routers/main');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const session = require('express-session');
const fileUpload = require('express-fileupload');
const path = require('path');
const { handlebars } = require('hbs');
require("./handlebar"); // User-made handlebars

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

app.use('', route);

// Static folder
app.use(express.static(path.join(__dirname, 'public')));
app.use("/static", express.static("public"));

// Template engine
app.set("view engine", 'hbs');
app.set("views", path.join(__dirname, 'views')); // Ensure correct path
hbs.registerPartials(path.join(__dirname, 'views', 'partials')); // Ensure correct path

mongoose.connect("mongodb://127.0.0.1:27017/foodOrderingSystem", { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => {
        console.log("Server connected to MongoDB successfully.");
    })
    .catch((err) => {
        console.error("Failed to connect to MongoDB. Error:", err);
    });

// Mongoose connection events
const db = mongoose.connection;

db.on("connected", () => {
    console.log("Mongoose connected to MongoDB.");
});

db.on("error", (err) => {
    console.error("Mongoose connection error:", err);
});

db.on("disconnected", () => {
    console.log("Mongoose connection disconnected.");
});

// Handle process termination
process.on("SIGINT", async () => {
    await db.close();
    console.log("Mongoose connection closed due to app termination.");
    process.exit(0);
});

app.listen(5656, () => {
    console.log('Server is running on port 5656...');
});
