const generateEmailTemplate = ({ title, preheader, name, content, otp }) => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      <style>
        body { margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F5F7FA; color: #111827; }
        .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 16px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05); overflow: hidden; }
        .header { padding: 40px 40px 24px; text-align: center; }
        .logo { color: #2563EB; font-size: 28px; font-weight: 800; letter-spacing: -0.5px; margin: 0; }
        .content { padding: 0 40px; text-align: left; }
        .greeting { font-size: 18px; font-weight: 600; margin-top: 0; margin-bottom: 16px; }
        .text { font-size: 15px; line-height: 1.6; color: #4B5563; margin-top: 0; margin-bottom: 24px; }
        .otp-container { background-color: #F8FAFC; border-radius: 12px; padding: 32px 24px; text-align: center; margin: 32px 0; border: 1px solid #E2E8F0; }
        .otp-code { font-size: 44px; font-weight: 700; letter-spacing: 12px; color: #111827; margin: 0; padding-left: 12px; }
        .otp-hint { font-size: 14px; color: #64748B; margin-top: 16px; margin-bottom: 0; }
        
        .security-notice { background-color: #ffffff; margin-bottom: 40px; }
        .security-notice p { margin: 0 0 12px 0; font-size: 14px; color: #64748B; line-height: 1.6; font-weight: 600; }
        .security-list { margin: 0; padding-left: 20px; font-size: 14px; color: #64748B; line-height: 1.8; }
        
        .divider { height: 1px; background-color: #E2E8F0; margin: 0 40px; }
        .footer { padding: 32px 40px; text-align: center; background-color: #ffffff; }
        .footer-logo { font-size: 16px; font-weight: 700; color: #94A3B8; margin: 0 0 4px 0; }
        .footer-tagline { font-size: 13px; color: #94A3B8; margin: 0 0 24px 0; }
        .footer-text { font-size: 12px; color: #94A3B8; line-height: 1.6; margin: 0; }
      </style>
    </head>
    <body>
      <div style="display: none; max-height: 0px; overflow: hidden;">
        ${preheader || title}
      </div>
      <div class="container">
        <div class="header">
          <h1 class="logo">CloudVault</h1>
        </div>
        <div class="content">
          <p class="greeting">Hi ${name || 'there'},</p>
          ${content ? `<p class="text">${content}</p>` : ''}
          
          ${otp ? `
          <div class="otp-container">
            <p class="otp-code">${otp}</p>
            <p class="otp-hint">Use this verification code to continue.</p>
          </div>
          <div class="security-notice">
            <ul class="security-list">
              <li>This verification code expires in 5 minutes.</li>
              <li>Never share this code with anyone.</li>
              <li>CloudVault will never ask for your OTP.</li>
              <li>If you did not request this verification, simply ignore this email.</li>
            </ul>
          </div>
          ` : ''}
        </div>
        <div class="divider"></div>
        <div class="footer">
          <p class="footer-logo">CloudVault Team</p>
          <p class="footer-tagline">Secure Cloud Document Management System</p>
          <p class="footer-text">This is an automated email.<br>Please do not reply to this message.</p>
          <p class="footer-text" style="margin-top: 16px;">&copy; ${new Date().getFullYear()} CloudVault. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

module.exports = { generateEmailTemplate };
