const { app, connectDB } = require('../server');

let connectionPromise;

module.exports = async (req, res) => {
  connectionPromise = connectionPromise || connectDB();
  await connectionPromise;
  return app(req, res);
};
