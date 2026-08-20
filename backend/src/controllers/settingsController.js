const settingsService = require('../services/settingsService');

/**
 * PATCH /api/admin/settings/master-password
 * Update master password
 */
const updateMasterPassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    await settingsService.updateMasterPassword(currentPassword, newPassword);

    return res.status(200).json({
      success: true,
      message: 'Master password updated successfully',
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  updateMasterPassword,
};
