const Share = require('../models/Share');
const User = require('../models/User');
const Document = require('../models/Document');
const Folder = require('../models/Folder');
const Notification = require('../models/Notification');
const crypto = require('crypto');

/**
 * @desc    Create a new share (Phase 1: People sharing)
 * @route   POST /api/shares
 * @access  Private
 */
exports.createShare = async (req, res, next) => {
  try {
    const { email, fileId, folderId, permission } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }
    if (!fileId && !folderId) {
      return res.status(400).json({ success: false, message: 'File or Folder ID is required' });
    }

    const targetUser = await User.findOne({ email: email.toLowerCase() });
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User with this email not found' });
    }

    if (targetUser._id.toString() === req.user.id) {
      return res.status(400).json({ success: false, message: 'You cannot share with yourself' });
    }

    if (fileId) {
      const doc = await Document.findOne({ _id: fileId, uploadedBy: req.user.id });
      if (!doc) {
        return res.status(404).json({ success: false, message: 'File not found or you do not have permission to share it' });
      }
    } else if (folderId) {
      const folder = await Folder.findOne({ _id: folderId, owner: req.user.id });
      if (!folder) {
        return res.status(404).json({ success: false, message: 'Folder not found or you do not have permission to share it' });
      }
    }

    const existingShare = await Share.findOne({
      sharedWithUserId: targetUser._id,
      fileId: fileId || null,
      folderId: folderId || null,
      shareType: 'people'
    });

    if (existingShare) {
      existingShare.permission = permission;
      await existingShare.save();

      const owner = await User.findById(req.user.id);
      let itemName = fileId ? (await Document.findById(fileId)).name : (await Folder.findById(folderId)).name;

      await Notification.create({
        user: targetUser._id,
        title: 'Permission Changed',
        message: `${owner.name} changed your permission on "${itemName}" to ${permission}.`,
        type: 'permission_changed',
        icon: 'Shield',
        referenceId: fileId || folderId,
        referenceType: fileId ? 'Document' : 'Folder'
      });

      return res.status(200).json({
        success: true,
        message: 'Share permissions updated',
        data: existingShare,
      });
    }

    const share = await Share.create({
      ownerId: req.user.id,
      sharedWithUserId: targetUser._id,
      fileId: fileId || null,
      folderId: folderId || null,
      permission: permission || 'viewer',
      shareType: 'people'
    });

    const owner = await User.findById(req.user.id);
    let itemName = fileId ? (await Document.findById(fileId)).name : (await Folder.findById(folderId)).name;

    await Notification.create({
      user: targetUser._id,
      title: 'Item Shared',
      message: `${owner.name} shared "${itemName}" with you.`,
      type: 'share_received',
      icon: 'UserPlus',
      referenceId: fileId || folderId,
      referenceType: fileId ? 'Document' : 'Folder'
    });

    res.status(201).json({
      success: true,
      message: 'Successfully shared',
      data: share,
    });

    
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get link info for a specific file/folder
 * @route   GET /api/shares/link/info
 * @access  Private
 */
exports.getLinkInfo = async (req, res, next) => {
  try {
    const { fileId, folderId } = req.query;

    if (!fileId && !folderId) {
      return res.status(400).json({ success: false, message: 'File or Folder ID is required' });
    }

    const query = { ownerId: req.user.id, shareType: 'link' };
    if (fileId) query.fileId = fileId;
    if (folderId) query.folderId = folderId;

    const share = await Share.findOne(query);

    res.status(200).json({
      success: true,
      data: share || null
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Generate/Copy a share link
 * @route   POST /api/shares/link/copy
 * @access  Private
 */
exports.copyLink = async (req, res, next) => {
  try {
    const { fileId, folderId } = req.body;

    if (!fileId && !folderId) {
      return res.status(400).json({ success: false, message: 'File or Folder ID is required' });
    }

    // Verify ownership
    if (fileId) {
      const doc = await Document.findOne({ _id: fileId, uploadedBy: req.user.id });
      if (!doc) return res.status(404).json({ success: false, message: 'File not found or no permission' });
    } else if (folderId) {
      const folder = await Folder.findOne({ _id: folderId, owner: req.user.id });
      if (!folder) return res.status(404).json({ success: false, message: 'Folder not found or no permission' });
    }

    let share = await Share.findOne({
      ownerId: req.user.id,
      fileId: fileId || null,
      folderId: folderId || null,
      shareType: 'link'
    });

    if (!share) {
      const token = crypto.randomBytes(12).toString('hex');
      share = await Share.create({
        ownerId: req.user.id,
        fileId: fileId || null,
        folderId: folderId || null,
        shareType: 'link',
        linkToken: token,
        linkEnabled: true,
        generalAccess: 'restricted',
        permission: 'viewer'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Link generated successfully',
      data: share
    });

    
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update link settings
 * @route   PATCH /api/shares/link/settings
 * @access  Private
 */
exports.updateLinkSettings = async (req, res, next) => {
  try {
    const { fileId, folderId, generalAccess, permission, linkEnabled } = req.body;

    const share = await Share.findOne({
      ownerId: req.user.id,
      fileId: fileId || null,
      folderId: folderId || null,
      shareType: 'link'
    });

    if (!share) {
      return res.status(404).json({ success: false, message: 'Link share not found. Generate a link first.' });
    }

    if (generalAccess !== undefined) share.generalAccess = generalAccess;
    if (permission !== undefined) share.permission = permission;
    if (linkEnabled !== undefined) share.linkEnabled = linkEnabled;

    await share.save();

    res.status(200).json({
      success: true,
      message: 'Link settings updated',
      data: share
    });

    if (permission !== undefined) {
      
    }
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get shared item via token (Public route)
 * @route   GET /api/shares/link/:token
 * @access  Public
 */
exports.getSharedItem = async (req, res, next) => {
  try {
    const { token } = req.params;

    const share = await Share.findOne({ linkToken: token, shareType: 'link' })
                             .populate('ownerId', 'name email avatar')
                             .populate('fileId')
                             .populate('folderId');

    if (!share) {
      return res.status(404).json({ success: false, message: 'Link not found.' });
    }
    
    if (share.generalAccess !== 'anyone') {
      // Prompt says "Private links require authentication". Currently, they return 404/403.
      // If it's restricted, we can say it's private. The user must use people sharing.
      return res.status(403).json({ success: false, message: 'This link is restricted.' });
    }

    if (!share.linkEnabled) {
      return res.status(403).json({ success: false, message: 'This link has been disabled.' });
    }

    if (share.expiresAt && new Date(share.expiresAt) < new Date()) {
      return res.status(403).json({ success: false, message: 'This link has expired.' });
    }

    // Increment access count and last accessed
    share.accessCount = (share.accessCount || 0) + 1;
    share.lastAccessed = new Date();
    await share.save();

    res.status(200).json({
      success: true,
      data: {
        itemType: share.fileId ? 'document' : 'folder',
        item: share.fileId || share.folderId,
        permission: share.permission,
        owner: share.ownerId
      }
    });
  } catch (error) {
    next(error);
  }
};
