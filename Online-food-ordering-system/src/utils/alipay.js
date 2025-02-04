// alipay.js
const { AlipaySdk } = require('alipay-sdk');
const fs = require('fs');
const path = require('path');
// 
const alipaySdk = new AlipaySdk({
    appId: "9021000143680387",
    gateway: "https://openapi-sandbox.dl.alipaydev.com/gateway.do",
    // 使用 __dirname 来获取当前目录并拼接文件路径
    alipayPublicKey: fs.readFileSync(path.join(__dirname, 'pk.pem'), 'utf8'),
    privateKey: fs.readFileSync(path.join(__dirname, 'sk.pem'), 'utf8'),
});
async function generateAlipayPaymentLink(orderId, price, name) {
    const bizContent = {
      out_trade_no: orderId,
      product_code: "FAST_INSTANT_TRADE_PAY",
      total_amount: price,
      subject: name,
      body: "商品详情", // 商品描述
    };
  
    try {
      const result = await alipaySdk.pageExec(
        "alipay.trade.page.pay",
        'GET',
        { bizContent, returnUrl: "http://localhost:5656" }
      );
      return result;
    } catch (error) {
      console.error("生成支付宝支付链接时出错:", error);
      throw error; // 可以选择抛出错误，让调用方处理
    }
  }
  
// // 示例调用
// async function testGenerateLink(){
//     try {
//     const paymentLink = await generateAlipayPaymentLink("20240725001", "10.00", "测试商品");
//     console.log("生成的支付链接:", paymentLink);
//     } catch (error) {
//     console.error("测试调用失败:", error);
//     }
// }

// testGenerateLink();

async function checkAlipayPayment(out_trade_no) {
    const bizContent = {
      out_trade_no,
    };
  
    try {
      const result = await alipaySdk.exec(
        "alipay.trade.query",
        { bizContent }
      );
  
      console.log("支付宝查询结果:", result);
  
      // 检查支付状态
      if (result.code === "10000" && result.tradeStatus === "TRADE_SUCCESS") {
        return true; // 支付成功
      } else if (result.code === "10000" && result.tradeStatus === "TRADE_FINISHED"){
          return true; // 支付成功
      }
      else {
        return false; // 支付失败
      }
    } catch (error) {
      console.error("查询支付宝支付状态出错:", error);
      return false; // 发生错误，也返回false
    }
}
  
// // 示例调用
// async function testCheckPayment(orderNumber){
//     const isSuccess = await checkAlipayPayment(orderNumber);
//     if (isSuccess) {
//     console.log("支付成功");
//     } else {
//     console.log("支付失败");
//     }
// }

// testCheckPayment(1383182);
  
module.exports = {generateAlipayPaymentLink, checkAlipayPayment};
