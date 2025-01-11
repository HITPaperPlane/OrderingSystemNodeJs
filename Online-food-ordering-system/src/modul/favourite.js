const mongoose = require('mongoose');

const favouriteSchema = mongoose.Schema({
    userId: String,
    dishId: String,
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model("favourites", favouriteSchema);
