import React, { useState, useEffect } from 'react';
import { documentsAPI } from '../services/api';
import MainLayout from '../components/Layout/MainLayout';
import PreviewModal from '../components/Common/PreviewModal';
import ConfirmationModal from '../components/Common/ConfirmationModal';
import { toast } from 'react-toastify';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import {
  Trash2, RotateCcw, AlertTriangle, AlertCircle
} from 'lucide-react';
import { getFileIcon, getFileIconColor, formatFileSize, formatFileType } from '../utils/fileHelpers';

const Trash = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: null,
    loading: false,
    error: null
  });

  useEffect(() => {
    fetchTrash();
  }, []);

  const fetchTrash = async () => {
    try {
      const res = await documentsAPI.getTrash();
      setDocuments(res.data.documents);
    } catch (error) {
      toast.error('Failed to load trash');
    } finally {
      setLoading(false);
    }
  };

  const handlePermanentDelete = (doc, e) => {
    if (e) e.stopPropagation();
    setConfirmModal({
      isOpen: true,
      title: 'Delete Files?',
      description: `Are you sure you want to permanently delete "${doc.name}"? This action cannot be undone.`,
      loading: false,
      error: null,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, loading: true, error: null }));
        try {
          await documentsAPI.permanentDelete(doc._id);
          toast.success('✓ Files deleted successfully.');
          fetchTrash();
          setConfirmModal(prev => ({ ...prev, isOpen: false, loading: false }));
        } catch (error) {
          setConfirmModal(prev => ({ ...prev, loading: false, error: 'Delete failed' }));
        }
      }
    });
  };

  const handleRestore = async (doc, e) => {
    if (e) e.stopPropagation();
    try {
      await documentsAPI.restore(doc._id);
      toast.success('Document restored');
      fetchTrash();
    } catch (error) {
      toast.error('Restore failed');
    }
  };

  const handlePreview = async (doc) => {
    try {
      const res = await documentsAPI.preview(doc._id);
      setPreviewDoc(doc);
      setPreviewUrl(res.data.previewUrl);
    } catch (error) {
      toast.error('Preview failed');
    }
  };

  const handleDownload = async (doc) => {
    try {
      const res = await documentsAPI.download(doc._id);
      window.open(res.data.downloadUrl, '_blank');
    } catch (error) {
      toast.error('Download failed');
    }
  };

  return (
    <MainLayout
      title="Trash"
      subtitle={`${documents.length} deleted file${documents.length !== 1 ? 's' : ''}`}
    >
      {loading ? (
        <div className="flex flex-col items-center justify-center h-64">
          <div className="w-10 h-10 border-4 border-gray-200 border-t-primary-500 rounded-full animate-spin mb-4"></div>
          <p className="text-gray-600">Loading trash...</p>
        </div>
      ) : documents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 bg-white border border-gray-200 border-dashed rounded-2xl">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 mb-6">
            <Trash2 className="w-10 h-10" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Trash is empty</h3>
          <p className="text-gray-600 text-sm">Deleted documents will appear here</p>
        </div>
      ) : (
        <motion.div
          className="space-y-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="flex items-center gap-3 p-4 bg-orange-50 border border-orange-200 text-orange-800 rounded-xl shadow-sm">
            <AlertTriangle className="w-5 h-5 shrink-0 text-orange-600" />
            <span className="text-sm font-medium">Items in trash will be permanently deleted after 30 days.</span>
          </div>

          <div className="space-y-2">
            {documents.map((doc, index) => (
              <motion.div
                key={doc._id}
                className="group cursor-pointer bg-white border border-gray-200 rounded-xl transition-all duration-200 hover:border-red-200 hover:shadow-md flex items-center p-3 gap-4 opacity-80 hover:opacity-100"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => handlePreview(doc)}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 opacity-60 grayscale group-hover:grayscale-0 transition-all"
                  style={{
                    color: getFileIconColor(doc.fileType),
                    backgroundColor: `${getFileIconColor(doc.fileType)}15`,
                  }}
                >
                  {getFileIcon(doc.fileType)}
                </div>

                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-gray-900 truncate mb-1 line-through decoration-gray-300">{doc.name}</h4>
                  <p className="text-xs font-medium text-gray-600">
                    {formatFileSize(doc.size)} &middot; {formatFileType(doc.fileType)} &middot; Deleted {doc.deletedAt && format(new Date(doc.deletedAt), 'MMM d, yyyy')}
                  </p>
                </div>

                <div className="flex items-center gap-1 opacity-100">
                  <button
                    className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors flex items-center gap-2"
                    onClick={(e) => handleRestore(doc, e)}
                    title="Restore"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span className="text-sm font-medium hidden sm:inline-block">Restore</span>
                  </button>
                  <button
                    className="p-2 text-red-500 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors flex items-center gap-2 ml-2 border-l border-gray-100 pl-3"
                    onClick={(e) => handlePermanentDelete(doc, e)}
                    title="Delete permanently"
                  >
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm font-medium hidden sm:inline-block">Delete Forever</span>
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      <PreviewModal
        previewDoc={previewDoc}
        previewUrl={previewUrl}
        onClose={() => { setPreviewDoc(null); setPreviewUrl(''); }}
        onDownload={handleDownload}
      />

      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        description={confirmModal.description}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        loading={confirmModal.loading}
        error={confirmModal.error}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />
    </MainLayout>
  );
};

export default Trash;
