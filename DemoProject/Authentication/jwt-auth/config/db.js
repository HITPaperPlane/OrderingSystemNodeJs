const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

function connectDB(){
    mongoose.connect(process.env.MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    })
    .then(()=> console.log("MongoDB connected for cookie-based auth"))
    .catch((err)=> console.log(err));
}

module.exports = connectDB;
