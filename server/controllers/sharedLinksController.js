const Share = require('../models/Share');
const crypto = require('crypto');

const getAllLinks = async (req, res, next) => {
  try {
    const shares = await Share.find({
      ownerId: req.user.id,
      shareType: 'link'
    })
      .populate('fileId')
      .populate('folderId')
      .lean();

    const formattedData = shares.map(share => {
      const item = share.fileId || share.folderId;
      const isDocument = !!share.fileId;
      
      // Calculate status dynamically
      let status = 'active';
      if (!share.linkEnabled) {
        status = 'disabled';
      } else if (share.expiresAt) {
        const now = new Date();
        const expires = new Date(share.expiresAt);
        const timeDiff = expires.getTime() - now.getTime();
        const daysLeft = Math.ceil(timeDiff / (1000 * 3600 * 24));
        
        if (timeDiff < 0) status = 'expired';
        else if (daysLeft <= 3) status = 'expiring_soon';
      }

      return {
        _id: share._id,
        linkToken: share.linkToken,
        documentId: item ? item._id : null,
        documentName: item ? (item.name || item.originalName) : 'Deleted Item',
        documentType: isDocument && item ? item.fileType : 'folder',
        isFolder: !isDocument,
        permission: share.permission,
        visibility: share.generalAccess,
        createdAt: share.createdAt,
        expiresAt: share.expiresAt,
        accessCount: share.accessCount || 0,
        lastAccessed: share.lastAccessed,
        status,
        linkEnabled: share.linkEnabled
      };
    }).filter(s => s.documentId); // Do not expose deleted links (deleted items)

    res.status(200).json({
      success: true,
      data: formattedData
    });
  } catch (error) {
    next(error);
  }
};

const updateLink = async (req, res, next) => {
  try {
    const { permission, expiresAt } = req.body;
    const share = await Share.findOne({ _id: req.params.id, ownerId: req.user.id, shareType: 'link' });

    if (!share) {
      return res.status(404).json({ success: false, message: 'Link not found' });
    }

    if (permission !== undefined) share.permission = permission;
    if (expiresAt !== undefined) share.expiresAt = expiresAt === null ? null : new Date(expiresAt);

    await share.save();
    res.status(200).json({ success: true, data: share });
  } catch (error) {
    next(error);
  }
};

const deleteLink = async (req, res, next) => {
  try {
    const share = await Share.findOne({ _id: req.params.id, ownerId: req.user.id, shareType: 'link' });
    if (!share) {
      return res.status(404).json({ success: false, message: 'Link not found' });
    }
    
    await share.deleteOne();
    res.status(200).json({ success: true, message: 'Link deleted successfully' });
  } catch (error) {
    next(error);
  }
};

const disableLink = async (req, res, next) => {
  try {
    const share = await Share.findOne({ _id: req.params.id, ownerId: req.user.id, shareType: 'link' });
    if (!share) {
      return res.status(404).json({ success: false, message: 'Link not found' });
    }
    
    share.linkEnabled = false;
    await share.save();
    res.status(200).json({ success: true, data: share });
  } catch (error) {
    next(error);
  }
};

const enableLink = async (req, res, next) => {
  try {
    const share = await Share.findOne({ _id: req.params.id, ownerId: req.user.id, shareType: 'link' });
    if (!share) {
      return res.status(404).json({ success: false, message: 'Link not found' });
    }
    
    share.linkEnabled = true;
    await share.save();
    res.status(200).json({ success: true, data: share });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllLinks,
  updateLink,
  deleteLink,
  disableLink,
  enableLink
};
