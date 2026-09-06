const User = require('../models/User');
const OTP = require('../models/OTP');
const { validationResult } = require('express-validator');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const sendEmail = require('../utils/sendEmail');
const { generateEmailTemplate } = require('../utils/emailTemplate');

// @desc    Send OTP for email verification
// @route   POST /api/auth/send-otp
// @access  Public
const sendOTP = async (req, res) => {
  console.log('\n===== OTP DEBUG START =====');
  console.log('Request received for /api/auth/send-otp');
  
  try {
    const { name } = req.body;
    const email = req.body.email?.toLowerCase().trim();
    console.log(`Email received from frontend: ${email}`);
    
    if (!email) {
      console.log('Failed: No email provided');
      console.log('===== OTP DEBUG END =====\n');
      return res.status(400).json({ success: false, message: 'Please provide an email' });
    }

    const existingUser = await User.findOne({ email });
    const userExists = !!existingUser;

    const emailUser = process.env.EMAIL_USER;
    if (emailUser) {
      const maskedEmail = emailUser.substring(0, 2) + '****' + (emailUser.includes('@') ? emailUser.substring(emailUser.indexOf('@')) : '');
      console.log(`EMAIL_USER loaded: ${maskedEmail}`);
    } else {
      console.log(`EMAIL_USER loaded: undefined`);
    }
    console.log(`EMAIL_PASS exists: ${!!process.env.EMAIL_PASS}`);

    const nodemailer = require('nodemailer');
    let transporter;
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      console.log('Nodemailer transporter configuration status: Using custom SMTP with EMAIL_USER/EMAIL_PASS');
      const pass = process.env.EMAIL_PASS.replace(/\s+/g, '');
      
      // Requirement 9: Check whether Gmail App Password is being used
      if (process.env.EMAIL_USER.endsWith('@gmail.com') && pass.length !== 16) {
        console.log('Failed: Invalid Gmail App Password length');
        console.log('===== OTP DEBUG END =====\n');
        return res.status(400).json({ 
          success: false, 
          message: 'Email server configuration failed: Please use a 16-character Gmail App Password instead of your standard account password.',
          error: 'Invalid App Password'
        });
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
      console.log('Nodemailer transporter configuration status: Using ethereal fallback');
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

    try {
      const verifyResult = await transporter.verify();
      console.log('Result of transporter.verify():', verifyResult);
    } catch (error) {
      console.log('Result of transporter.verify(): FAILED');
      console.error('Full error message:', error.message);
      console.error('Full error stack:', error.stack);
      console.error('File name: authController.js');
      console.error('SMTP error code:', error.code || 'UNKNOWN');
      console.log('Continuing without SMTP verification...');
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    console.log(`Generated OTP: ${otp}`);
    console.log(`OTP expiry time: 5 minutes from now`);

    const salt = await bcrypt.genSalt(10);
    const hashedOTP = await bcrypt.hash(otp, salt);

    // Upsert OTP document
    await OTP.findOneAndUpdate(
      { email },
      {
        otp: hashedOTP,
        otpExpiry: Date.now() + 5 * 60 * 1000,
        otpAttempts: 0,
        isVerified: false,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const messageText = `Your CloudVault verification code is: ${otp}. It expires in 5 minutes.`;
    const html = generateEmailTemplate({
      title: 'Your CloudVault Security Verification Code',
      preheader: `Your verification code is ${otp}`,
      name: name,
      otp: otp
    });

    const senderEmail = process.env.EMAIL_FROM || 'cloudvault.noreply@gmail.com';
    const message = {
      from: `"CloudVault Team" <${senderEmail}>`,
      to: email,
      subject: 'Your CloudVault Security Verification Code',
      text: messageText,
      html: html,
      replyTo: senderEmail,
      messageId: `<${Date.now()}.${Math.random().toString(36).substring(2)}@cloudvault.com>`,
      date: new Date(),
      headers: {
        'X-Priority': '1 (Highest)',
        'X-Mailer': 'CloudVault Mailer',
        'List-Unsubscribe': `<mailto:${senderEmail}>`,
      }
    };

    try {
      const info = await transporter.sendMail(message);
      console.log('Result of transporter.sendMail(): SUCCESS');
      console.log('Message ID:', info.messageId);
      console.log('Accepted recipients:', info.accepted);
      console.log('Rejected recipients:', info.rejected);
      console.log('SMTP response:', info.response);
      console.log('===== OTP DEBUG END =====\n');
      
      res.status(200).json({ success: true, message: 'OTP has been sent to your email.', userExists });
    } catch (error) {
      console.log('Result of transporter.sendMail(): FAILED');
      console.error('Full error message:', error.message);
      console.error('Full error stack:', error.stack);
      console.error('File name: authController.js');
      console.error('SMTP error code:', error.code || 'UNKNOWN');
      console.log('===== OTP DEBUG END =====\n');
      // If email fails to send, we still want to allow testing the UI flow in development
      // The OTP is logged to the console, so we can use it to login.
      res.status(200).json({ success: true, message: 'OTP generated (Email sending failed)', userExists });
    }
  } catch (error) {
    console.error('Send OTP Error:', error);
    console.log('===== OTP DEBUG END =====\n');
    res.status(500).json({ success: false, message: 'Server error during OTP generation' });
  }
};

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg,
      });
    }

    const { name } = req.body;
    const email = req.body.email?.toLowerCase().trim();
    let { password } = req.body;

    // For passwordless registration, generate a secure random password if not provided
    if (!password) {
      password = crypto.randomBytes(20).toString('hex') + 'A1!';
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email already exists',
      });
    }

    // Verify OTP was completed
    const otpDoc = await OTP.findOne({ email });
    if (!otpDoc || !otpDoc.isVerified) {
      return res.status(400).json({
        success: false,
        message: 'Please verify your email before registering',
      });
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      isEmailVerified: true,
    });

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
    });
  } catch (error) {
    console.error('Register Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration',
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg,
      });
    }

    const password = req.body.password;
    const email = req.body.email?.toLowerCase().trim();

    // Check for user (include password field)
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Check password
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    if (!user.isEmailVerified) {
      return res.status(403).json({
        success: false,
        message: 'Please verify your email address before logging in.',
        requireVerification: true,
        email: user.email,
      });
    }

    // Generate token
    const token = user.getSignedJwtToken();

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        storageUsed: user.storageUsed,
        storageLimit: user.storageLimit,
        createdAt: user.createdAt,
      },
    });

    // We can't use req.user.id because we just generated the token. We can spoof a req object for the logger or modify logger to accept userId directly.
    // Actually, `req.user` isn't set on login route.
    
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login',
    });
  }
};

// @desc    Passwordless Login
// @route   POST /api/auth/passwordless-login
// @access  Public
const passwordlessLogin = async (req, res) => {
  try {
    const email = req.body.email?.toLowerCase().trim();

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Account not found. Please register first.',
      });
    }

    // Verify OTP was completed
    const otpDoc = await OTP.findOne({ email });
    if (!otpDoc || !otpDoc.isVerified) {
      return res.status(400).json({
        success: false,
        message: 'Please verify your email before logging in',
      });
    }

    // Generate token
    const token = user.getSignedJwtToken();

    // Delete the OTP document as it's no longer needed
    await OTP.deleteOne({ email });

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        storageUsed: user.storageUsed,
        storageLimit: user.storageLimit,
        createdAt: user.createdAt,
      },
    });

    
  } catch (error) {
    console.error('Passwordless Login Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during passwordless login',
    });
  }
};

// @desc    Get current logged-in user
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        storageUsed: user.storageUsed,
        storageLimit: user.storageLimit,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('GetMe Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// @desc    Forgot password
// @route   POST /api/auth/forgotpassword
// @access  Public
const forgotPassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }

    const email = req.body.email?.toLowerCase().trim();
    console.log(`[ForgotPassword] Looking up user with email: ${email}`);
    const user = await User.findOne({ email });
    if (!user) {
      console.log(`[ForgotPassword] User not found for email: ${email}`);
      return res.status(404).json({ success: false, message: 'There is no user with that email' });
    }

    // Get reset token
    console.log(`[ForgotPassword] Generating reset token for ${user.email}`);
    const resetToken = user.getResetPasswordToken();
    await user.save({ validateBeforeSave: false });
    console.log(`[ForgotPassword] Reset token saved to database`);

    // Create reset url
    const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/reset-password/${resetToken}`;

    const messageText = `You requested a password reset. Please click on this link to reset your password: \n\n ${resetUrl}`;
    const html = generateEmailTemplate({
      title: 'Reset Your CloudVault Password',
      preheader: 'Password reset request for your CloudVault account',
      name: user.name,
      content: `You recently requested to reset your password for your CloudVault account. Click the button below to reset it.<br><br>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #2563EB; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">Reset Password</a>
        </div>
        <p style="font-size: 13px; color: #64748B; margin-top: 24px;">If you did not request a password reset, please ignore this email. This password reset link is only valid for the next 10 minutes.</p>`
    });

    try {
      console.log(`[ForgotPassword] Sending email to ${user.email}`);
      await sendEmail({
        email: user.email,
        subject: 'Reset Your CloudVault Password',
        message: messageText,
        html
      });
      console.log(`[ForgotPassword] Email delivered successfully to ${user.email}`);
      res.status(200).json({
        success: true,
        message: 'Reset link sent to your email',
      });
    } catch (err) {
      console.error('[ForgotPassword] Email send error:', err);
      // Rollback
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });
      
      return res.status(500).json({ 
        success: false, 
        message: 'Email could not be sent', 
        error: err.message 
      });
    }
  } catch (error) {
    console.error('[ForgotPassword] Server error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error generating reset token',
      error: error.message 
    });
  }
};

// @desc    Reset password
// @route   PUT /api/auth/resetpassword/:resettoken
// @access  Public
const resetPassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }

    // Get hashed token
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(req.params.resettoken)
      .digest('hex');

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired token' });
    }

    // Set new password
    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    const token = user.getSignedJwtToken();
    res.status(200).json({
        success: true,
        token
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error resetting password' });
  }
};

// @desc    Verify OTP
// @route   POST /api/auth/verify-otp
// @access  Public
const verifyOTP = async (req, res) => {
  console.log('\n===== OTP VERIFICATION START =====');
  try {
    const otp = req.body.otp;
    const email = req.body.email?.toLowerCase().trim();
    console.log(`Email received: ${email}`);
    console.log(`OTP received: ${otp}`);

    if (!email || !otp) {
      console.log('Failed: Missing email or OTP');
      console.log('===== OTP VERIFICATION END =====\n');
      return res.status(400).json({ success: false, message: 'Please provide email and OTP' });
    }

    const otpDoc = await OTP.findOne({ email });
    console.log(`OTP document found: ${!!otpDoc}`);
    
    if (!otpDoc) {
      console.log('Failed: OTP session not found or expired');
      console.log('===== OTP VERIFICATION END =====\n');
      return res.status(404).json({ success: false, message: 'OTP session not found or expired. Please request a new one.' });
    }

    console.log(`Stored OTP: ${otpDoc.otp}`);
    console.log(`Stored expiry time: ${new Date(otpDoc.otpExpiry).toISOString()}`);
    console.log(`Current server time: ${new Date().toISOString()}`);
    
    const isExpired = !otpDoc.otpExpiry || Date.now() > otpDoc.otpExpiry;
    console.log(`OTP expiry comparison result (isExpired): ${isExpired}`);

    if (otpDoc.isVerified) {
      console.log('Failed: Email is already verified');
      console.log('===== OTP VERIFICATION END =====\n');
      return res.status(400).json({ success: false, message: 'Email is already verified' });
    }

    if (otpDoc.otpAttempts >= 3) {
      console.log('Failed: Maximum OTP attempts reached');
      console.log('===== OTP VERIFICATION END =====\n');
      return res.status(403).json({ success: false, message: 'Maximum OTP attempts reached. Please request a new OTP.' });
    }

    if (isExpired) {
      console.log('Failed: OTP has expired');
      console.log('===== OTP VERIFICATION END =====\n');
      return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });
    }

    const isMatch = await bcrypt.compare(otp.toString(), otpDoc.otp);
    console.log(`OTP match result: ${isMatch}`);

    if (!isMatch) {
      otpDoc.otpAttempts += 1;
      await otpDoc.save();
      console.log(`Failed: Invalid OTP (Attempt ${otpDoc.otpAttempts})`);
      console.log('===== OTP VERIFICATION END =====\n');
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }

    // Success
    otpDoc.isVerified = true;
    otpDoc.otp = undefined; // clear hash
    otpDoc.otpExpiry = undefined;
    otpDoc.otpAttempts = 0;
    console.log(`Database update result: Marking OTP doc as verified`);
    await otpDoc.save();

    console.log(`Final success/failure: SUCCESS`);
    console.log('===== OTP VERIFICATION END =====\n');
    res.status(200).json({
      success: true,
      message: 'Email verified successfully',
    });
  } catch (error) {
    console.log('Final success/failure: FAILED (Exception)');
    console.error('Full error message:', error.message);
    console.error('Full stack trace:', error.stack);
    console.error('File name: authController.js');
    console.error('Line number: verifyOTP');
    console.log('===== OTP VERIFICATION END =====\n');
    res.status(500).json({ success: false, message: 'Server error during OTP verification', error: error.message, stack: error.stack });
  }
};

// @desc    Resend OTP
// @route   POST /api/auth/resend-otp
// @access  Public
const resendOTP = async (req, res) => {
  try {
    const { name } = req.body;
    const email = req.body.email?.toLowerCase().trim();
    if (!email) {
      return res.status(400).json({ success: false, message: 'Please provide an email' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'An account with this email already exists' });
    }

    // Generate new OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const salt = await bcrypt.genSalt(10);
    const hashedOTP = await bcrypt.hash(otp, salt);

    // Upsert OTP document
    await OTP.findOneAndUpdate(
      { email },
      {
        otp: hashedOTP,
        otpExpiry: Date.now() + 5 * 60 * 1000,
        otpAttempts: 0,
        isVerified: false,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    try {
      const messageText = `Your CloudVault verification code is: ${otp}. It expires in 5 minutes.`;
      const html = generateEmailTemplate({
        title: 'Your CloudVault Security Verification Code',
        preheader: `Your new verification code is ${otp}`,
        name: name,
        otp: otp
      });

      await sendEmail({
        email,
        subject: 'Your CloudVault Security Verification Code',
        message: messageText,
        html,
      });

      res.status(200).json({ success: true, message: 'A new OTP has been sent to your email.' });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: 'Email could not be sent' });
    }
  } catch (error) {
    console.error('Resend OTP Error:', error);
    res.status(500).json({ success: false, message: 'Server error during OTP resend' });
  }
};

// @desc    Google OAuth Callback
// @route   GET /api/auth/google/callback
// @access  Public
const googleAuthCallback = async (req, res) => {
  try {
    // passport attaches the authenticated user to req.user
    if (!req.user) {
      return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/login?error=auth_failed`);
    }

    const token = req.user.getSignedJwtToken();
    
    

    // Redirect to frontend with token
    res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/login?token=${token}`);
  } catch (error) {
    console.error('Google Auth Callback Error:', error);
    res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/login?error=server_error`);
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
const logout = async (req, res) => {
  try {
    
    res.status(200).json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error during logout' });
  }
};

module.exports = {
  sendOTP,
  register,
  login,
  getMe,
  forgotPassword,
  resetPassword,
  verifyOTP,
  resendOTP,
  passwordlessLogin,
  googleAuthCallback,
  logout,
};
