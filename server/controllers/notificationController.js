const Notification = require('../models/Notification');

// @desc    Get all notifications for logged in user
// @route   GET /api/notifications
// @access  Private
const getNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 50, filter = 'all', search = '' } = req.query;
    
    let query = { user: req.user.id };
    
    if (filter === 'unread') query.isRead = false;
    if (filter === 'sharing') query.type = { $in: ['share_received', 'permission_changed'] };
    if (filter === 'files') query.referenceType = 'Document';
    if (filter === 'security') query.type = 'login_new_device';
    if (filter === 'storage') query.type = 'storage_warning';
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { message: { $regex: search, $options: 'i' } }
      ];
    }
    
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await Notification.countDocuments(query);
    const totalPages = Math.ceil(total / limitNum);

    const unreadCount = await Notification.countDocuments({
      user: req.user.id,
      isRead: false,
    });

    res.status(200).json({
      success: true,
      unreadCount,
      notifications,
      totalPages,
      currentPage: pageNum,
      total,
    });
  } catch (error) {
    console.error('Get Notifications Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching notifications',
    });
  }
};

// @desc    Mark a single notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }

    res.status(200).json({
      success: true,
      notification,
    });
  } catch (error) {
    console.error('Mark Notification Read Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating notification',
    });
  }
};

// @desc    Mark all user notifications as read
// @route   PUT /api/notifications/read-all
// @access  Private
const markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { user: req.user.id, isRead: false },
      { isRead: true }
    );

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read',
    });
  } catch (error) {
    console.error('Mark All Notifications Read Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating notifications',
    });
  }
};

// @desc    Delete a notification
// @route   DELETE /api/notifications/:id
// @access  Private
const deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Notification deleted',
    });
  } catch (error) {
    console.error('Delete Notification Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting notification',
    });
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
};
