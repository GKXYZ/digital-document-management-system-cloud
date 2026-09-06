import React from 'react';
import { FiFile, FiImage, FiFileText, FiFilm, FiMusic, FiArchive } from 'react-icons/fi';

export const getFileIcon = (type) => {
  const icons = {
    images: <FiImage />,
    image: <FiImage />,
    pdf: <FiFileText />,
    doc: <FiFileText />,
    xls: <FiFileText />,
    spreadsheet: <FiFileText />,
    ppt: <FiFileText />,
    presentation: <FiFileText />,
    video: <FiFilm />,
    audio: <FiMusic />,
    zip: <FiArchive />,
    archive: <FiArchive />,
    text: <FiFileText />,
  };
  return icons[type] || <FiFile />;
};

export const getFileIconColor = (type) => {
  const colors = {
    images: '#22c55e',
    image: '#22c55e',
    pdf: '#ef4444',
    doc: '#3b82f6',
    xls: '#10b981',
    spreadsheet: '#10b981',
    ppt: '#f59e0b',
    presentation: '#f59e0b',
    video: '#8b5cf6',
    audio: '#ec4899',
    text: '#64748b',
    zip: '#6b7280',
    archive: '#6b7280',
  };
  return colors[type] || '#6366f1';
};

export const formatFileType = (type) => {
  if (!type) return 'Other';
  const t = type.toLowerCase();
  if (t === 'images' || t === 'image') return 'Image';
  if (t === 'zip' || t === 'archive') return 'ZIP';
  if (['pdf', 'doc', 'xls', 'ppt'].includes(t)) return t.toUpperCase();
  if (t === 'spreadsheet') return 'XLS';
  if (t === 'presentation') return 'PPT';
  return type.charAt(0).toUpperCase() + type.slice(1);
};

export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};
