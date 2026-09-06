const sharedWithMeService = require('../services/sharedWithMeService');

const getSharedItems = async (req, res, next) => {
  try {
    const { search, fileType, permission, sort } = req.query;

    const filters = {
      search,
      fileType,
      permission
    };

    const items = await sharedWithMeService.getSharedWithMeData(req.user.id, filters, sort);

    res.status(200).json({
      success: true,
      count: items.length,
      data: items
    });
  } catch (error) {
    console.error('Error in getSharedItems controller:', error);
    res.status(500).json({ success: false, message: 'Server Error fetching shared items' });
  }
};

module.exports = {
  getSharedItems
};
