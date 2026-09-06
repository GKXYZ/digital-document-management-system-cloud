const mongoose = require('mongoose');

const folderSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Folder name is required'],
      trim: true,
    },
    parentFolderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Folder',
      default: null,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for fast lookups and duplicate name prevention
folderSchema.index({ userId: 1, parentFolderId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Folder', folderSchema);
