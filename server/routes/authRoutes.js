const express = require('express');
const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');
const { sendOTP, register, login, getMe, forgotPassword, resetPassword, verifyOTP, resendOTP, passwordlessLogin, googleAuthCallback, logout } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const passport = require('passport');

const router = express.Router();

// Rate limiting for auth routes (brute force protection)
const authLimiter = rateLimit({
  windowMs: process.env.NODE_ENV === 'development' ? 60 * 1000 : 15 * 60 * 1000, // 1 minute in dev, 15 in prod
  max: process.env.NODE_ENV === 'development' ? 1000 : 10, // 1000 requests in dev, 10 in prod
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later',
  },
});

// @route   POST /api/auth/send-otp
router.post(
  '/send-otp',
  authLimiter,
  [
    body('email', 'Please provide a valid email').isEmail().normalizeEmail(),
  ],
  sendOTP
);

// @route   POST /api/auth/register
router.post(
  '/register',
  authLimiter,
  [
    body('name', 'Name is required').notEmpty().trim(),
    body('email', 'Please provide a valid email').isEmail().normalizeEmail(),
    body('password', 'Password must be at least 8 characters long, contain at least one uppercase letter, one lowercase letter, and one special character')
      .optional()
      .isLength({ min: 8 })
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[\W_]).{8,}$/),
  ],
  register
);

// @route   POST /api/auth/login
router.post(
  '/login',
  authLimiter,
  [
    body('email', 'Please provide a valid email').isEmail().normalizeEmail(),
    body('password', 'Password is required').notEmpty(),
  ],
  login
);

// @route   POST /api/auth/passwordless-login
router.post(
  '/passwordless-login',
  authLimiter,
  [
    body('email', 'Please provide a valid email').isEmail().normalizeEmail(),
  ],
  passwordlessLogin
);

// @route   POST /api/auth/logout
router.post('/logout', protect, logout);

// @route   GET /api/auth/me
router.get('/me', protect, getMe);

// @route   POST /api/auth/forgotpassword
router.post(
  '/forgotpassword',
  authLimiter,
  [
    body('email', 'Please provide a valid email').isEmail().normalizeEmail(),
  ],
  forgotPassword
);

// @route   PUT /api/auth/resetpassword/:resettoken
router.put(
  '/resetpassword/:resettoken',
  authLimiter,
  [
    body('password', 'Password must be at least 8 characters long, contain at least one uppercase letter, one lowercase letter, and one special character')
      .isLength({ min: 8 })
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[\W_]).{8,}$/),
  ],
  resetPassword
);

// @route   POST /api/auth/verify-otp
router.post(
  '/verify-otp',
  authLimiter,
  [
    body('email', 'Please provide a valid email').isEmail().normalizeEmail(),
    body('otp', 'Please provide a 6-digit OTP').isLength({ min: 6, max: 6 }).isNumeric(),
  ],
  verifyOTP
);

// @route   POST /api/auth/resend-otp
router.post(
  '/resend-otp',
  authLimiter,
  [
    body('email', 'Please provide a valid email').isEmail().normalizeEmail(),
  ],
  resendOTP
);

// @route   GET /api/auth/google
// @desc    Auth with Google
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// @route   GET /api/auth/google/callback
// @desc    Google auth callback
router.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: '/login?error=auth_failed', session: false }),
  googleAuthCallback
);

module.exports = router;
