const { handlebars } = require("hbs");

// 已有的helper
handlebars.registerHelper('times', function (n, block) {
    let accum = '';
    for (let i = 1; i <= n; i++){
        accum += block.fn(i);
    }
    return accum;
});
handlebars.registerHelper('nextPage', function (n, block) {
    return Number(n) + 1;
});
handlebars.registerHelper('prevPage', function (n, block) {
    return Number(n) - 1;
});
handlebars.registerHelper('ifnext', function (currentPage, endPage, block) {
    if (Number(currentPage) >= Number(endPage)) {
        return 'disabled';
    } else {
        return false;
    }
});
handlebars.registerHelper('ifprev', function (currentPage, block) {
    if (Number(currentPage) <= 1) {
        return 'disabled';
    } else {
        return false;
    }
});
handlebars.registerHelper("active", function (active, currentPage, block) {
    if (active == currentPage) {
        return 'active';
    } else {
        return false;
    }
});
handlebars.registerHelper('json', function (context) {
    return JSON.stringify(context).replace(/"/g, '&quot;');
});
handlebars.registerHelper('discount', function (price, discount, block) {
    const discountPrice = parseFloat(price - ((price * discount) / 100)).toFixed(2);
    return discountPrice;
});
handlebars.registerHelper("ifStates", function (states, id, block) {
    if (states === "NA") {
        return '<td><a href="/admin/cooking/' + id + '" class="btn states-btn btn-outline-success btn-sm">烹饪中</a></td>';
    } else if (states === "Cooking") {
        return '<td><a href="/admin/deliver/' + id + '" class="btn states-btn btn-outline-warning btn-sm ">派送中</a></td>';
    } else if (states === "Out for delivery.") {
        return '<td><a href="/admin/handover/' + id + '" class="btn states-btn btn-outline-danger btn-sm">订单完成</a></td>';
    } else {
        return '<td><a class="btn btn-outline-dark states-btn btn-sm disabled">已完成</a></td>';
    }
});
handlebars.registerHelper("ifCancelOrder", function (states, id, block) {
    if (states === "NA") {
        return '<a href="/user/cancelOrder/' + id + '" class="main-btn">取消订单</a>';
    }
});
handlebars.registerHelper('eq', function (a, b) {
    return a === b;
});
