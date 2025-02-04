const nodemailer = require('nodemailer');
const path = require('path');
// 用协议沟通服务器
// 创建一个 SMTP 传输对象
const transporter = nodemailer.createTransport({
  service: 'gmail', 
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: 'starkwilion@gmail.com', 
    pass: 'azif fgfj suei pujr'
  }
});

// 发送邮件辅助函数 (无附件)
const sendSimpleEmail = async (to, subject, text) => {
  const mailOptions = {
    from: {
      name: 'Stark',
      address: 'starkwilion@gmail.com'
    },
    to: to,  
    subject: subject, 
    text: text 
  };
  const info = await transporter.sendMail(mailOptions);
  console.log('Email sent: ' + info.response);
};

// 发送邮件辅助函数 (带附件)
const sendEmailWithAttachment = async (to, subject, text, attachmentPath) => {
  const mailOptions = {
    from: {
      name: 'Stark',
      address: 'starkwilion@gmail.com'
    },
    to: to, 
    subject: subject, 
    text: text,
    attachments: [
      {
        filename: path.basename(attachmentPath),
        path: attachmentPath, 
        contentType: 'application/pdf'
      }
    ]
  };
  const info = await transporter.sendMail(mailOptions);
  console.log('Email sent: ' + info.response);
};

module.exports = { sendSimpleEmail, sendEmailWithAttachment };