import React, { useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { documentsAPI, versionsAPI } from '../services/api';
import MainLayout from '../components/Layout/MainLayout';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import { CloudUpload, File as FileIcon, X, Check, Tag, Folder } from 'lucide-react';
import FileConflictModal from '../components/Common/FileConflictModal';

const Upload = () => {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [uploadPercentage, setUploadPercentage] = useState({});
  const [tags, setTags] = useState('');
  const [description, setDescription] = useState('');

  const [conflictModalOpen, setConflictModalOpen] = useState(false);
  const [currentConflict, setCurrentConflict] = useState(null); // { fileItem, existingDoc }

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const folderId = searchParams.get('folderId');

  const onDrop = useCallback((acceptedFiles, fileRejections) => {
    fileRejections.forEach(({ file, errors }) => {
      errors.forEach(err => {
        if (err.code === 'file-too-large') {
          toast.warning(`Maximum allowed file size is 50 MB.`);
        } else if (err.code === 'file-invalid-type') {
          toast.error(
            <div>
              <strong>Unsupported File Format</strong><br />
              This file type is not supported.
            </div>
          );
        } else {
          toast.error(`${file.name}: ${err.message}`);
        }
      });
    });

    const newFiles = acceptedFiles.map((file) => ({
      file,
      id: `${file.name}-${Date.now()}`,
      status: 'pending',
    }));
    setFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxSize: 52428800,
    multiple: true,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-powerpoint': ['.ppt'],
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
      'image/gif': ['.gif'],
      'application/zip': ['.zip'],
      'application/x-zip-compressed': ['.zip']
    }
  });

  const removeFile = (id) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const processUploads = async (filesToProcess) => {
    if (filesToProcess.length === 0) return;
    setUploading(true);

    for (let i = 0; i < filesToProcess.length; i++) {
      const fileItem = filesToProcess[i];
      if (fileItem.status === 'success' || fileItem.status === 'error') continue;

      // Check if file exists
      try {
        const res = await documentsAPI.checkExists({ name: fileItem.file.name, folderId });
        if (res.data.exists) {
          setCurrentConflict({ fileItem, existingDoc: res.data.document });
          setConflictModalOpen(true);
          return; // Pause processing until conflict resolved
        }
      } catch (err) {
        console.error('Check exists error', err);
      }

      await performUpload(fileItem);
    }

    checkAllComplete();
  };

  const performUpload = async (fileItem, mode = 'standard', existingDoc = null) => {
    setUploadProgress((prev) => ({ ...prev, [fileItem.id]: 'uploading' }));
    setUploadPercentage((prev) => ({ ...prev, [fileItem.id]: 0 }));

    try {
      const formData = new FormData();

      let actualFile = fileItem.file;

      if (mode === 'keep_both') {
        const parts = actualFile.name.split('.');
        const ext = parts.pop();
        const base = parts.join('.');
        const newName = `${base} (1).${ext}`;
        actualFile = new File([actualFile], newName, { type: actualFile.type });
      }

      formData.append('document', actualFile);
      if (tags) formData.append('tags', tags);
      if (folderId) formData.append('folderId', folderId);
      if (description) formData.append('description', description);

      const onUploadProgress = (progressEvent) => {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        setUploadPercentage((prev) => ({ ...prev, [fileItem.id]: percentCompleted }));
      };

      if (mode === 'replace') {
        await documentsAPI.permanentDelete(existingDoc._id);
        await documentsAPI.upload(formData, onUploadProgress);
      } else if (mode === 'version') {
        formData.append('fileId', existingDoc._id);
        await versionsAPI.upload(formData, onUploadProgress);
      } else {
        await documentsAPI.upload(formData, onUploadProgress);
      }

      setUploadProgress((prev) => ({ ...prev, [fileItem.id]: 'success' }));
      setFiles((prev) => prev.map((f) => f.id === fileItem.id ? { ...f, status: 'success' } : f));
    } catch (error) {
      setUploadProgress((prev) => ({ ...prev, [fileItem.id]: 'error' }));
      setFiles((prev) => prev.map((f) => f.id === fileItem.id ? { ...f, status: 'error' } : f));
    }
  };

  const handleConflictResolution = async (option) => {
    const { fileItem, existingDoc } = currentConflict;
    setConflictModalOpen(false);
    setCurrentConflict(null);

    await performUpload(fileItem, option, existingDoc);

    // Resume processing remaining files
    const remaining = files.filter(f => f.status === 'pending' && f.id !== fileItem.id);
    if (remaining.length > 0) {
      processUploads(remaining);
    } else {
      checkAllComplete();
    }
  };

  const handleConflictCancel = () => {
    setConflictModalOpen(false);
    const { fileItem } = currentConflict;
    setCurrentConflict(null);

    setUploadProgress((prev) => ({ ...prev, [fileItem.id]: 'error' }));
    setFiles((prev) => prev.map((f) => f.id === fileItem.id ? { ...f, status: 'error' } : f));

    const remaining = files.filter(f => f.status === 'pending' && f.id !== fileItem.id);
    if (remaining.length > 0) {
      processUploads(remaining);
    } else {
      checkAllComplete();
    }
  };

  const handleStartUpload = () => {
    if (files.length === 0) {
      toast.warning('Please select files to upload');
      return;
    }
    processUploads(files);
  };

  const checkAllComplete = () => {
    setFiles(prev => {
      const pending = prev.filter(f => f.status === 'pending');
      if (pending.length === 0) {
        setUploading(false);
        const successCount = prev.filter(f => f.status === 'success').length;
        if (successCount > 0) {
          toast.success(`${successCount} file${successCount > 1 ? 's' : ''} uploaded successfully!`);
          setTimeout(() => navigate('/documents'), 1500);
        }
      }
      return prev;
    });
  };

  return (
    <MainLayout title="Upload Document" subtitle="Add new files securely to your vault">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Dropzone */}
        <motion.div
          className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-200 cursor-pointer ${isDragActive ? 'border-blue-600 bg-blue-50' : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-gray-50'
            }`}
          {...getRootProps()}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center justify-center">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-6 transition-colors ${isDragActive ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
              <CloudUpload className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {isDragActive ? 'Drop files here to upload' : 'Drag & drop files here'}
            </h3>
            <p className="text-gray-600 mb-6">or click to browse from your computer</p>
            <p className="text-xs text-gray-400">Maximum file size: 50MB</p>
          </div>
        </motion.div>

        {/* Metadata */}
        <AnimatePresence>
          {files.length > 0 && (
            <motion.div
              className="bg-white border border-gray-200 rounded-xl shadow-sm p-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
            >
              <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">Document Details</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-900 flex items-center gap-2">
                    <Tag className="w-4 h-4 text-gray-400" /> Tags
                  </label>
                  <input type="text" className="form-input" placeholder="e.g. report, finance" value={tags} onChange={(e) => setTags(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-900 flex items-center gap-2">
                    <Folder className="w-4 h-4 text-gray-400" /> Target Folder
                  </label>
                  <input type="text" className="form-input bg-gray-50 text-gray-500 cursor-not-allowed" value={folderId ? "Selected Folder" : "My Documents"} disabled />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-900">Description (optional)</label>
                <textarea className="form-input resize-y" rows="2" value={description} onChange={(e) => setDescription(e.target.value)}></textarea>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* File List */}
        <AnimatePresence>
          {files.length > 0 && (
            <motion.div
              className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
                <h3 className="font-semibold text-gray-900">{files.length} file{files.length > 1 ? 's' : ''} selected</h3>
                <button className="btn btn-primary shadow-sm" onClick={handleStartUpload} disabled={uploading}>
                  {uploading ? (
                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Uploading...</>
                  ) : (
                    <><CloudUpload className="w-4 h-4" /> Upload All</>
                  )}
                </button>
              </div>
              <div className="divide-y divide-border max-h-[400px] overflow-y-auto">
                {files.map((fileItem) => (
                  <motion.div key={fileItem.id} className="flex items-center p-4 hover:bg-gray-50 transition-colors">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center shrink-0 mr-4">
                      <FileIcon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0 pr-4">
                      <div className="flex items-center justify-between mb-0.5">
                        <p className="text-sm font-semibold text-gray-900 truncate pr-2">{fileItem.file.name}</p>
                        {uploadProgress[fileItem.id] === 'uploading' && <span className="text-xs font-medium text-blue-600">{uploadPercentage[fileItem.id] || 0}%</span>}
                      </div>
                      <p className="text-xs font-medium text-gray-600 mb-2">{formatFileSize(fileItem.file.size)}</p>
                      {uploadProgress[fileItem.id] === 'uploading' && (
                        <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                          <div className="bg-blue-600 h-1.5 rounded-full transition-all duration-300" style={{ width: `${uploadPercentage[fileItem.id] || 0}%` }}></div>
                        </div>
                      )}
                    </div>
                    <div className="shrink-0 flex items-center">
                      {uploadProgress[fileItem.id] === 'uploading' && <div className="w-5 h-5 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>}
                      {uploadProgress[fileItem.id] === 'success' && <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center"><Check className="w-4 h-4 text-green-600" /></div>}
                      {uploadProgress[fileItem.id] === 'error' && <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center"><X className="w-4 h-4 text-red-600" /></div>}
                      {!uploadProgress[fileItem.id] && (
                        <button className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors" onClick={() => removeFile(fileItem.id)}><X className="w-4 h-4" /></button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      <FileConflictModal
        isOpen={conflictModalOpen}
        fileName={currentConflict?.fileItem?.file?.name}
        onSelectOption={handleConflictResolution}
        onCancel={handleConflictCancel}
      />

    </MainLayout>
  );
};

export default Upload;
