import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FolderPlus } from 'lucide-react';
import { foldersAPI } from '../../services/api';
import { toast } from 'react-toastify';

const CreateFolderModal = ({ isOpen, onClose, parentFolderId, onSuccess }) => {
  const [folderName, setFolderName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!folderName.trim()) {
      toast.error('Folder name cannot be empty');
      return;
    }

    setLoading(true);
    try {
      await foldersAPI.create({ 
        name: folderName.trim(), 
        parentFolderId 
      });
      toast.success('Folder created successfully.');
      setFolderName('');
      onSuccess();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create folder');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          onClick={onClose}
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden"
        >
          <div className="flex items-center justify-between p-6 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                <FolderPlus className="w-5 h-5 text-blue-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Create New Folder</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6">
            <div className="mb-6">
              <label htmlFor="folderName" className="block text-sm font-medium text-gray-700 mb-2">
                Folder Name
              </label>
              <input
                type="text"
                id="folderName"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-colors bg-gray-50 focus:bg-white"
                placeholder="e.g. Projects, Invoices"
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                autoFocus
              />
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !folderName.trim()}
                className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : null}
                Create
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default CreateFolderModal;
