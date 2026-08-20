import apiClient from './apiClient';

/**
 * Update event master password
 */
export const updateMasterPassword = async ({ currentPassword, newPassword }) => {
  return await apiClient.patch('/admin/settings/master-password', {
    currentPassword,
    newPassword,
  });
};

export default {
  updateMasterPassword,
};
