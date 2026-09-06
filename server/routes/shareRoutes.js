const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const shareController = require('../controllers/shareController');

// Public routes
router.get('/link/:token', shareController.getSharedItem);

// All subsequent routes require authentication
router.use(protect);

// Phase 1: People Sharing
router.post('/', shareController.createShare);

// Phase 2: Link Sharing
router.get('/link/info', shareController.getLinkInfo);
router.post('/link/copy', shareController.copyLink);
router.patch('/link/settings', shareController.updateLinkSettings);

module.exports = router;
