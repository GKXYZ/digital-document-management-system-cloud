const express = require('express');
const router = express.Router();
const { getSharedItems } = require('../controllers/sharedWithMeController');
const { protect } = require('../middleware/auth');

router.get('/shared-with-me', protect, getSharedItems);

module.exports = router;
