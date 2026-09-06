import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { sharesAPI, documentsAPI } from '../services/api';
import { getFileIcon, getFileIconColor, formatFileSize } from '../utils/fileHelpers';
import { format } from 'date-fns';
import { Download, AlertCircle, File, Folder } from 'lucide-react';
import PreviewModal from '../components/Common/PreviewModal';
import { toast } from 'react-toastify';
import Logo from '../components/Common/Logo';

const SharedItem = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sharedData, setSharedData] = useState(null);
  
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewDoc, setPreviewDoc] = useState(null);

  useEffect(() => {
    const fetchSharedItem = async () => {
      try {
        const res = await sharesAPI.getSharedItemByToken(token);
        setSharedData(res.data.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Invalid or Expired Link');
      } finally {
        setLoading(false);
      }
    };

    fetchSharedItem();
  }, [token]);

  const handleDownload = async (doc) => {
    try {
      const res = await documentsAPI.download(doc._id);
      window.open(res.data.downloadUrl, '_blank');
      toast.success(`Downloading ${doc.originalName}`);
    } catch (err) {
      toast.error('Download failed');
    }
  };

  const handlePreview = async (doc) => {
    try {
      const res = await documentsAPI.preview(doc._id);
      setPreviewDoc(doc);
      setPreviewUrl(res.data.previewUrl);
    } catch (err) {
      toast.error('Preview failed');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !sharedData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center border border-gray-100">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-8">{error}</p>
          <button 
            onClick={() => navigate('/login')}
            className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to CloudVault
          </button>
        </div>
      </div>
    );
  }

  const { item, itemType, owner } = sharedData;

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <header className="flex items-center justify-between mb-8">
          <div>
            <Logo variant="full" theme="light" size="header" />
          </div>
          
          <div className="flex items-center gap-3 text-sm font-medium text-gray-600">
            Shared by {owner.name}
          </div>
        </header>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-8 sm:p-12 text-center border-b border-gray-100">
            <div 
              className="w-24 h-24 rounded-2xl flex items-center justify-center mx-auto mb-6"
              style={{
                color: itemType === 'document' ? getFileIconColor(item.fileType) : '#3B82F6',
                backgroundColor: itemType === 'document' ? `${getFileIconColor(item.fileType)}15` : '#EFF6FF',
              }}
            >
              {itemType === 'document' ? (
                getFileIcon(item.fileType, 'w-12 h-12')
              ) : (
                <Folder className="w-12 h-12" />
              )}
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{item.name}</h2>
            
            {itemType === 'document' && (
              <p className="text-gray-500 font-medium">
                {formatFileSize(item.size)} • Uploaded {format(new Date(item.createdAt), 'MMM d, yyyy')}
              </p>
            )}
            
            {itemType === 'folder' && (
              <p className="text-gray-500 font-medium">
                Created {format(new Date(item.createdAt), 'MMM d, yyyy')}
              </p>
            )}
          </div>
          
          <div className="p-6 bg-gray-50 flex items-center justify-center gap-4">
            {itemType === 'document' && (
              <>
                <button
                  onClick={() => handlePreview(item)}
                  className="flex items-center gap-2 px-6 py-2.5 bg-white border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
                >
                  <File className="w-4 h-4" /> Preview
                </button>
                <button
                  onClick={() => handleDownload(item)}
                  className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
                >
                  <Download className="w-4 h-4" /> Download
                </button>
              </>
            )}
            {itemType === 'folder' && (
              <p className="text-sm text-gray-500">Folder view is limited in this preview.</p>
            )}
          </div>
        </div>
      </div>

      <PreviewModal
        previewDoc={previewDoc}
        previewUrl={previewUrl}
        onClose={() => {
          setPreviewDoc(null);
          setPreviewUrl('');
        }}
        onDownload={handleDownload}
      />
    </div>
  );
};

export default SharedItem;
