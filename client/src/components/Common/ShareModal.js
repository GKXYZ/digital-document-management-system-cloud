import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, UserPlus, CheckCircle, AlertCircle, Link, Copy, Globe, Lock } from 'lucide-react';
import { toast } from 'react-toastify';
import { sharesAPI } from '../../services/api';

const ShareModal = ({ isOpen, onClose, selectedItem, itemType }) => {
  // People sharing state
  const [email, setEmail] = useState('');
  const [permission, setPermission] = useState('viewer');

  // Link sharing state
  const [generalAccess, setGeneralAccess] = useState('restricted'); // 'restricted' or 'anyone'
  const [linkPermission, setLinkPermission] = useState('viewer');
  const [linkToken, setLinkToken] = useState(null);

  const [loading, setLoading] = useState(false);
  const [linkLoading, setLinkLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && selectedItem) {
      // Reset state when opened
      setEmail('');
      setPermission('viewer');
      setError(null);
      setGeneralAccess('restricted');
      setLinkPermission('viewer');
      setLinkToken(null);

      // Fetch existing link settings
      fetchLinkInfo();
    }
  }, [isOpen, selectedItem]);

  const fetchLinkInfo = async () => {
    try {
      const params = itemType === 'document' ? { fileId: selectedItem._id } : { folderId: selectedItem._id };
      const res = await sharesAPI.getLinkInfo(params);
      if (res.data.data) {
        setGeneralAccess(res.data.data.generalAccess);
        setLinkPermission(res.data.data.permission);
        setLinkToken(res.data.data.linkToken);
      }
    } catch (err) {
      console.error('Failed to fetch link info', err);
    }
  };

  const handleShare = async (e) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter an email address');
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const payload = {
        email,
        permission,
      };

      if (itemType === 'document') {
        payload.fileId = selectedItem._id;
      } else {
        payload.folderId = selectedItem._id;
      }

      await sharesAPI.create(payload);
      toast.success('Successfully shared with ' + email);
      setEmail('');
      setPermission('viewer');
      // onClose(); // Keep open so they can see/do link sharing too if they want
    } catch (err) {
      console.error('Share error:', err);
      setError(err.response?.data?.message || 'Failed to share. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = async () => {
    setLinkLoading(true);
    try {
      const payload = itemType === 'document'
        ? { fileId: selectedItem._id }
        : { folderId: selectedItem._id };

      const res = await sharesAPI.copyLink(payload);
      const token = res.data.data.linkToken;
      setLinkToken(token);

      const shareUrl = `${window.location.origin}/shared/${token}`;
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Share link copied successfully.');
    } catch (err) {
      toast.error('Failed to copy link');
    } finally {
      setLinkLoading(false);
    }
  };

  const handleUpdateLinkSettings = async (newAccess, newPerm) => {
    try {
      setGeneralAccess(newAccess);
      setLinkPermission(newPerm);

      const payload = {
        generalAccess: newAccess,
        permission: newPerm,
      };

      if (itemType === 'document') payload.fileId = selectedItem._id;
      else payload.folderId = selectedItem._id;

      await sharesAPI.updateLinkSettings(payload);
    } catch (err) {
      toast.error('Failed to update link settings');
      fetchLinkInfo(); // revert on fail
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-md bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] overflow-hidden flex flex-col"
          style={{ maxHeight: '90vh' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50 shrink-0">
            <h3 className="text-lg font-semibold text-gray-900 truncate pr-4">
              Share "{selectedItem?.name}"
            </h3>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto">

            {/* Share with People Section */}
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-4 text-sm font-medium text-gray-700">
                <Users className="w-5 h-5 text-blue-600" />
                Share with People
              </div>

              <form onSubmit={handleShare}>
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1 relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <UserPlus className="w-5 h-5 text-gray-400" />
                      </div>
                      <input
                        type="email"
                        placeholder="Add people via email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          setError(null);
                        }}
                        className="w-full pl-10 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all sm:text-sm"
                      />
                    </div>

                    <select
                      value={permission}
                      onChange={(e) => setPermission(e.target.value)}
                      className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all sm:text-sm"
                    >
                      <option value="viewer">Viewer</option>
                      <option value="editor">Editor</option>
                    </select>
                  </div>

                  {error && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg"
                    >
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      {error}
                    </motion.div>
                  )}

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={loading || !email}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-all"
                    >
                      {loading ? (
                        <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        'Share'
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>

            <div className="h-px bg-gray-200 w-full mb-6"></div>

            {/* General Access Section */}
            <div>
              <div className="flex items-center gap-3 mb-4 text-sm font-medium text-gray-700">
                <Link className="w-5 h-5 text-gray-600" />
                General Access
              </div>

              <div className="flex items-start sm:items-center gap-3">
                <div className={`p-2 rounded-full ${generalAccess === 'anyone' ? 'bg-green-100' : 'bg-gray-100'}`}>
                  {generalAccess === 'anyone' ? (
                    <Globe className="w-5 h-5 text-green-700" />
                  ) : (
                    <Lock className="w-5 h-5 text-gray-600" />
                  )}
                </div>

                <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1">
                    <select
                      value={generalAccess}
                      onChange={(e) => handleUpdateLinkSettings(e.target.value, linkPermission)}
                      className="block w-full px-2 py-1 bg-transparent border-0 font-semibold text-gray-900 focus:ring-0 cursor-pointer hover:bg-gray-50 rounded"
                    >
                      <option value="restricted">Restricted</option>
                      <option value="anyone">Anyone with the link</option>
                    </select>
                    <p className="text-xs text-gray-500 px-2 mt-0.5">
                      {generalAccess === 'restricted'
                        ? 'Only people with access can open with the link'
                        : 'Anyone on the internet with the link can view'}
                    </p>
                  </div>

                  {generalAccess === 'anyone' && (
                    <select
                      value={linkPermission}
                      onChange={(e) => handleUpdateLinkSettings(generalAccess, e.target.value)}
                      className="px-2 py-1 text-sm bg-transparent border-0 text-gray-600 focus:ring-0 cursor-pointer hover:bg-gray-50 rounded"
                    >
                      <option value="viewer">Viewer</option>
                      <option value="editor">Editor</option>
                    </select>
                  )}
                </div>
              </div>
            </div>

          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/50 shrink-0">
            <button
              onClick={handleCopyLink}
              disabled={linkLoading}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 border border-gray-300 rounded-full transition-colors disabled:opacity-50"
            >
              {linkLoading ? (
                <div className="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
              Copy Link
            </button>

            <button
              onClick={onClose}
              className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-full shadow-sm transition-all active:scale-95"
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ShareModal;
