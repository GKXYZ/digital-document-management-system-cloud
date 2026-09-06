/**
 * Validates that all required environment variables are set.
 * Call this at startup AFTER dotenv.config() to fail fast
 * instead of crashing later with cryptic errors.
 */
const validateEnv = () => {
  const required = [
    'MONGO_URI',
    'JWT_SECRET',
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY',
    'AWS_REGION',
    'AWS_S3_BUCKET',
  ];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error('\n❌ Missing required environment variables:\n');
    missing.forEach((key) => console.error(`   • ${key}`));
    console.error('\n💡 Copy .env.example to .env and fill in your values:');
    console.error('   cp .env.example .env\n');
    process.exit(1);
  }

  // Warn about insecure defaults
  if (process.env.JWT_SECRET === 'CHANGE_ME_TO_A_STRONG_RANDOM_SECRET') {
    console.warn('⚠️  WARNING: Using default JWT_SECRET. Generate a strong one for production!');
    console.warn('   Run: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"');
  }
};

module.exports = validateEnv;
