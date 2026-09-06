const mongoose = require('mongoose');
const dns = require('dns');

const connectDB = async () => {
  // Temporarily switch to Google/Cloudflare DNS for MongoDB SRV resolution
  // (fixes ISP DNS blocking) then restore originals after connecting
  const originalServers = dns.getServers();
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    console.error('💡 Tip: Check your network connection and MongoDB Atlas IP whitelist.');
    process.exit(1);
  } finally {
    // Restore original DNS so other network operations aren't affected
    dns.setServers(originalServers);
  }
};

module.exports = connectDB;
