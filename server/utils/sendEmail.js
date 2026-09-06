const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  // Use user-provided SMTP credentials or a fallback for testing
  let transporter;
  
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    const pass = process.env.EMAIL_PASS.replace(/\s+/g, '');
    
    if (process.env.EMAIL_USER.endsWith('@gmail.com') && pass.length !== 16) {
      throw new Error('Email server configuration failed: Please use a 16-character Gmail App Password instead of your standard account password.');
    }

    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      auth: {
        user: process.env.EMAIL_USER,
        pass: pass,
      },
    });
  } else {
    // Generate test SMTP service account from ethereal.email
    // Only used if no real credentials are provided
    console.log("No SMTP credentials provided, using test account...");
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
  }

  const senderEmail = process.env.EMAIL_FROM || 'cloudvault.noreply@gmail.com';
  
  const message = {
    from: `"CloudVault Team" <${senderEmail}>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: options.html,
    replyTo: senderEmail,
    messageId: `<${Date.now()}.${Math.random().toString(36).substring(2)}@cloudvault.com>`,
    date: new Date(),
    headers: {
      'X-Priority': '1 (Highest)',
      'X-Mailer': 'CloudVault Mailer',
      'List-Unsubscribe': `<mailto:${senderEmail}>`,
    }
  };

  const info = await transporter.sendMail(message);

  console.log('Message sent: %s', info.messageId);
  if (!process.env.SMTP_HOST) {
    console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
  }
};

module.exports = sendEmail;
