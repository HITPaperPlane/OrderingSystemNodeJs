const fs = require('fs');
const { AlipaySdk } = require('alipay-sdk');

// 实例化支付宝 SDK
const alipaySdk = new AlipaySdk({
  appId: '9021000143680387',
  privateKey: fs.readFileSync('test/pk.pem', 'utf8'),
  alipayPublicKey: fs.readFileSync('test/sk.pem', 'utf8'),
  gateway: 'https://openapi-sandbox.dl.alipaydev.com/gateway.do',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8'
  }
});

async function main() {
  try {
    // 生成网页支付链接（正确用法）
    const payResult = await alipaySdk.exec('alipay.trade.page.pay', {
      method: 'GET',
      bizContent: {
        out_trade_no: Date.now().toString(),
        product_code: 'FAST_INSTANT_TRADE_PAY',
        total_amount: '0.10',
        subject: '测试订单',
      },
      returnUrl: 'http://cta6pu.natappfree.cc',
      notifyUrl: '',
    });
    
    console.log('支付链接:', payResult);
    console.log('请在浏览器中打开该链接进行支付');
  } catch (err) {
    console.error('操作失败:', err);
  }
}

// 执行主函数
main();