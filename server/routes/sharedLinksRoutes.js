const express = require('express');
const router = express.Router();
const { 
  getAllLinks, updateLink, deleteLink, disableLink, enableLink 
} = require('../controllers/sharedLinksController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/links', getAllLinks);
router.patch('/link/:id', updateLink);
router.delete('/link/:id', deleteLink);
router.post('/link/:id/disable', disableLink);
router.post('/link/:id/enable', enableLink);

module.exports = router;
