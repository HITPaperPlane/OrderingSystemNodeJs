const express = require("express");
const app = express();

app.get("/", (req, res) => {
    res.send("<h2>HI</h2>");
    console.log("Hello");
});

app.listen(3232, () => {
    console.log("Demo server is running on port 3232...");
});
