const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.example.com',
  port: parseInt(process.env.EMAIL_PORT || '465'),
  secure: process.env.EMAIL_SECURE !== 'false',
  auth: {
    user: process.env.EMAIL_USER || 'contact@example.com',
    pass: process.env.EMAIL_PASSWORD
  },
  tls: {
    rejectUnauthorized: false
  }
});

const EMAIL_FROM = `"${process.env.EMAIL_FROM || 'CEAS Planning Center'}" <${process.env.EMAIL_USER || 'contact@example.com'}>`;

module.exports = { transporter, EMAIL_FROM };
