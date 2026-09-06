import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, History, Download, Eye, RotateCcw, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { versionsAPI, documentsAPI } from '../../services/api';
import { toast } from 'react-toastify';
import { formatFileSize } from '../../utils/fileHelpers';
import { useAuth } from '../../context/AuthContext';

const VersionHistoryModal = ({ isOpen, onClose, document, onVersionRestored }) => {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (isOpen && document) {
      fetchVersions();
    }
  }, [isOpen, document]);

  const fetchVersions = async () => {
    setLoading(true);
    try {
      const res = await versionsAPI.getVersions(document._id);
      setVersions(res.data.versions);
    } catch (error) {
      toast.error('Failed to load version history');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (version) => {
    try {
      const res = await versionsAPI.download(version._id);
      window.open(res.data.downloadUrl, '_blank');
      toast.success(`Downloading version`);
    } catch (error) {
      toast.error('Download failed');
    }
  };

  const handleRestore = async (version) => {
    try {
      const res = await versionsAPI.restore({ versionId: version._id });
      toast.success('Version restored successfully');
      if (onVersionRestored) onVersionRestored(res.data.document);
      onClose();
    } catch (error) {
      toast.error('Failed to restore version');
    }
  };

  const handleDelete = async (version) => {
    try {
      await versionsAPI.delete(version._id);
      toast.success('Version deleted');
      setVersions(prev => prev.filter(v => v._id !== version._id));
    } catch (error) {
      toast.error('Failed to delete version');
    }
  };

  const isOwner = document?.uploadedBy === user?.id || document?.uploadedBy?._id === user?.id;

  // We consider the current document as the "Latest" version if it has versions.
  // Actually, the `versions` array only contains history. The current document is the absolute latest.
  const latestVersionNum = versions.length > 0 ? versions[0].versionNumber + 1 : 1;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[70] flex justify-end">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        />

        {/* Sidebar Modal */}
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="relative w-full max-w-md h-full bg-white shadow-2xl flex flex-col"
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50 shrink-0">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <History className="w-5 h-5 text-gray-500" />
                Version History
              </h3>
              <p className="text-sm text-gray-500 truncate max-w-[300px]">{document?.name}</p>
            </div>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="space-y-6">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex gap-4 animate-pulse">
                    <div className="w-3 h-3 mt-1.5 rounded-full bg-gray-200"></div>
                    <div className="flex-1 space-y-3">
                      <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-8 bg-gray-200 rounded w-full"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="relative border-l-2 border-gray-100 ml-1.5 space-y-8 pb-8">

                {/* Current / Latest Version */}
                <div className="relative pl-6">
                  <div className="absolute w-3 h-3 bg-blue-500 rounded-full -left-[7px] top-1.5 ring-4 ring-white"></div>
                  <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                        Version {latestVersionNum}
                        <span className="px-2 py-0.5 bg-blue-600 text-white text-[10px] uppercase font-bold tracking-wider rounded-full">Latest</span>
                      </h4>
                    </div>
                    <p className="text-xs text-gray-600 mb-2">
                      {format(new Date(document.updatedAt || document.createdAt), 'MMM d, yyyy h:mm a')} • {formatFileSize(document.size)}
                    </p>
                    <div className="flex items-center gap-2 mt-3">
                      <button className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 hover:text-blue-600 transition-colors shadow-sm">
                        <Download className="w-3.5 h-3.5" /> Download
                      </button>
                    </div>
                  </div>
                </div>

                {/* Historical Versions */}
                {versions.map((version) => (
                  <div key={version._id} className="relative pl-6 group">
                    <div className="absolute w-3 h-3 bg-gray-300 group-hover:bg-gray-400 rounded-full -left-[7px] top-1.5 ring-4 ring-white transition-colors"></div>
                    <div className="bg-white rounded-xl p-4 border border-gray-100 group-hover:border-gray-200 group-hover:shadow-sm transition-all">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-sm font-semibold text-gray-900">
                          Version {version.versionNumber}
                        </h4>
                      </div>
                      <p className="text-xs text-gray-500 mb-2">
                        {format(new Date(version.uploadedAt), 'MMM d, yyyy h:mm a')} • {formatFileSize(version.size)}
                        <br />
                        By {version.uploadedBy?.name || 'Unknown User'}
                      </p>

                      <div className="flex flex-wrap items-center gap-2 mt-3 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleDownload(version)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" /> Download
                        </button>

                        {isOwner && (
                          <>
                            <button
                              onClick={() => handleRestore(version)}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium text-gray-700 hover:text-green-600 hover:bg-green-50 hover:border-green-200 transition-colors"
                            >
                              <RotateCcw className="w-3.5 h-3.5" /> Restore
                            </button>
                            <button
                              onClick={() => handleDelete(version)}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium text-gray-700 hover:text-red-600 hover:bg-red-50 hover:border-red-200 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Delete
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {versions.length === 0 && (
                  <div className="pl-6 pt-2">
                    <p className="text-sm text-gray-500 italic">No previous versions exist.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default VersionHistoryModal;
