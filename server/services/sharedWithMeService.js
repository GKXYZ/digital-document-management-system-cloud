const Share = require('../models/Share');
const Document = require('../models/Document');
const Folder = require('../models/Folder');
const User = require('../models/User');

const getSharedWithMeData = async (userId, filters = {}, sortOption = '-createdAt') => {
  // Query only items shared explicitly with this user (people share)
  // or maybe link shares they've accessed? The prompt says "Return only documents shared with the currently logged in user... Do NOT return owner-only documents."
  // So we filter by sharedWithUserId === userId
  let query = {
    sharedWithUserId: userId,
    shareType: 'people'
  };

  // Build sorting
  let sortParams = { createdAt: -1 }; // default: Date Shared desc
  if (sortOption === 'date-asc') sortParams = { createdAt: 1 };
  if (sortOption === 'name-asc') sortParams = {}; // will sort in memory after populate
  if (sortOption === 'name-desc') sortParams = {}; 
  if (sortOption === 'owner-asc') sortParams = {};
  if (sortOption === 'type-asc') sortParams = {};

  const shares = await Share.find(query)
    .populate('ownerId', 'name email avatar')
    .populate('fileId')
    .populate('folderId')
    .sort(sortParams)
    .lean();

  let formattedData = [];

  shares.forEach(share => {
    // Only include valid references
    const item = share.fileId || share.folderId;
    if (!item || !share.ownerId) return;
    if (item.isDeleted) return; // don't show deleted items

    const isDocument = !!share.fileId;
    
    // Apply filters before pushing
    if (filters.fileType) {
      if (filters.fileType === 'folder' && isDocument) return;
      if (filters.fileType !== 'folder' && filters.fileType !== 'all') {
        if (!isDocument || item.fileType !== filters.fileType) return;
      }
    }

    if (filters.permission && filters.permission !== 'all') {
      if (share.permission !== filters.permission) return;
    }

    const dataObj = {
      _id: share._id,
      documentId: item._id,
      documentName: item.name || item.originalName,
      documentType: isDocument ? item.fileType : 'folder',
      fileSize: isDocument ? item.size : null,
      isFolder: !isDocument,
      owner: {
        _id: share.ownerId._id,
        name: share.ownerId.name,
        email: share.ownerId.email,
        avatar: share.ownerId.avatar,
      },
      permission: share.permission,
      sharedAt: share.createdAt,
      thumbnail: isDocument ? item.s3Url : null,
      updatedAt: item.updatedAt
    };

    // Apply search filter (name, owner name, owner email)
    if (filters.search) {
      const s = filters.search.toLowerCase();
      const matchName = dataObj.documentName?.toLowerCase().includes(s);
      const matchOwnerName = dataObj.owner.name?.toLowerCase().includes(s);
      const matchOwnerEmail = dataObj.owner.email?.toLowerCase().includes(s);
      if (!matchName && !matchOwnerName && !matchOwnerEmail) {
        return;
      }
    }

    formattedData.push(dataObj);
  });

  // Apply in-memory sorting if needed
  if (sortOption === 'name-asc') {
    formattedData.sort((a, b) => (a.documentName || '').localeCompare(b.documentName || ''));
  } else if (sortOption === 'name-desc') {
    formattedData.sort((a, b) => (b.documentName || '').localeCompare(a.documentName || ''));
  } else if (sortOption === 'owner-asc') {
    formattedData.sort((a, b) => (a.owner.name || '').localeCompare(b.owner.name || ''));
  } else if (sortOption === 'type-asc') {
    formattedData.sort((a, b) => (a.documentType || '').localeCompare(b.documentType || ''));
  }

  return formattedData;
};

module.exports = {
  getSharedWithMeData
};
