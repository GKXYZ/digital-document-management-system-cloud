const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['info', 'success', 'warning', 'error', 'share_received', 'permission_changed', 'version_uploaded', 'file_restored', 'file_moved', 'folder_moved', 'storage_warning', 'login_new_device'],
      default: 'info',
    },
    icon: {
      type: String, // lucide-react icon name as a string, e.g., 'Share2', 'UploadCloud'
      default: 'Bell',
    },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    referenceType: {
      type: String,
      enum: ['Document', 'Folder', 'User', null],
      default: null,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Auto-delete notifications after 30 days
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 });

module.exports = mongoose.model('Notification', notificationSchema);
