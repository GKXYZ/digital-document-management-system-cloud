const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

// Load env vars
dotenv.config();

// Validate required env vars before proceeding
const validateEnv = require('./utils/validateEnv');
validateEnv();

const startCronJobs = require('./jobs/cronJobs');

const app = express();

// Passport config
require('./config/passport');
const passport = require('passport');
app.use(passport.initialize());

// Security middleware
app.use(helmet());

// CORS
const allowedOrigins = process.env.CLIENT_URL 
  ? process.env.CLIENT_URL.split(',').map(url => url.trim())
  : ['http://localhost:3000'];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  })
);

// Body parser
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Logging (dev only)
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/documents', require('./routes/documentRoutes'));
app.use('/api/folders', require('./routes/folderRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/shares', require('./routes/shareRoutes'));
app.use('/api/share', require('./routes/sharedWithMeRoutes'));
app.use('/api/share', require('./routes/sharedLinksRoutes'));
app.use('/api/versions', require('./routes/versionRoutes'));

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'CloudVault API is running',
    timestamp: new Date().toISOString(),
  });
});

// 404 handler — forward to global error handler instead of responding directly
app.use((req, res, next) => {
  const error = new Error(`Route ${req.originalUrl} not found`);
  error.statusCode = 404;
  next(error);
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Server Error:', err);

  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File is too large. Maximum size is 50MB.',
      });
    }
    return res.status(400).json({
      success: false,
      message: err.message || 'File upload error',
    });
  }

  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

const PORT = process.env.PORT || 5000;

if (process.env.VERCEL !== '1') {
  connectDB();
  startCronJobs();

  app.listen(PORT, () => {
    console.log(`\n🚀 CloudVault Server running on port ${PORT}`);
    console.log(`📡 Environment: ${process.env.NODE_ENV}`);
    console.log(`🔗 http://localhost:${PORT}\n`);
  });
}

module.exports = { app, connectDB };
