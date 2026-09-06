const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
  },
  otp: {
    type: String,
  },
  otpExpiry: {
    type: Date,
  },
  otpAttempts: {
    type: Number,
    default: 0,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 86400, // The document will be automatically deleted after 24 hours
  },
});

module.exports = mongoose.model('OTP', otpSchema);
