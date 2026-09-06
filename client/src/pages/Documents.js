import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { documentsAPI, foldersAPI } from '../services/api';
import MainLayout from '../components/Layout/MainLayout';
import PreviewModal from '../components/Common/PreviewModal';
import CreateFolderModal from '../components/Folders/CreateFolderModal';
import MoveToFolderModal from '../components/Folders/MoveToFolderModal';
import ConfirmationModal from '../components/Common/ConfirmationModal';
import ShareModal from '../components/Common/ShareModal';
import VersionHistoryModal from '../components/Common/VersionHistoryModal';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import {
  Download, Trash2, Star,
  Grid, List,
  ChevronLeft, ChevronRight, FileText, Plus, FolderPlus, UploadCloud, Folder, MoreVertical, X, FolderInput, UserPlus, History
} from 'lucide-react';
import { getFileIcon, getFileIconColor, formatFileSize, formatFileType } from '../utils/fileHelpers';

const Documents = ({ favoritesOnly = false }) => {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState([]);
  const [folders, setFolders] = useState([]);
  const [folderPath, setFolderPath] = useState([]);
  const [currentFolderId, setCurrentFolderId] = useState('root');

  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('list');
  const [filterType, setFilterType] = useState('');

  // Selection
  const [selectedDocs, setSelectedDocs] = useState([]);

  // Modals
  const [previewDoc, setPreviewDoc] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareItem, setShareItem] = useState(null);
  const [shareItemType, setShareItemType] = useState(null);

  const [isVersionHistoryOpen, setIsVersionHistoryOpen] = useState(false);
  const [versionHistoryDoc, setVersionHistoryDoc] = useState(null);

  const [dragOverFolderId, setDragOverFolderId] = useState(null);
  const [droppedFolderId, setDroppedFolderId] = useState(null);

  const [showNewDropdown, setShowNewDropdown] = useState(false);
  const dropdownRef = useRef(null);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: null,
    loading: false,
    error: null
  });

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowNewDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      // Fetch Folders
      if (!favoritesOnly && !filterType) {
        const folderRes = await foldersAPI.getAll({
          parentFolderId: currentFolderId === 'root' ? null : currentFolderId
        });
        setFolders(folderRes.data.folders);
        setFolderPath(folderRes.data.path || []);
      } else {
        setFolders([]);
        setFolderPath([]);
      }

      // Fetch Documents
      const params = { sort: '-createdAt', page, limit: 24 };
      if (filterType) params.fileType = filterType;
      if (favoritesOnly) params.favorite = 'true';
      if (!favoritesOnly) params.folderId = currentFolderId === 'root' ? 'null' : currentFolderId;

      const res = await documentsAPI.getAll(params);
      setDocuments(res.data.documents);
      setTotalPages(res.data.totalPages || 1);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [filterType, favoritesOnly, page, currentFolderId]);

  useEffect(() => {
    fetchData();
    setSelectedDocs([]); // clear selection on change
  }, [fetchData]);

  // Actions
  const handleDownload = async (doc, e) => {
    if (e) e.stopPropagation();
    try {
      const res = await documentsAPI.download(doc._id);
      window.open(res.data.downloadUrl, '_blank');
      toast.success(`Downloading ${doc.originalName}`);
    } catch (error) {
      toast.error('Download failed');
    }
  };

  const handleDelete = async (doc, e) => {
    if (e) e.stopPropagation();
    try {
      await documentsAPI.delete(doc._id);
      toast.success('Moved to trash');
      fetchData();
    } catch (error) {
      toast.error('Delete failed');
    }
  };

  const handleDeleteFolder = (folder, e) => {
    if (e) e.stopPropagation();
    setConfirmModal({
      isOpen: true,
      title: 'Delete Folder?',
      description: `Are you sure you want to permanently delete the folder "${folder.name}" and its contents? This action cannot be undone.`,
      loading: false,
      error: null,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, loading: true, error: null }));
        try {
          await foldersAPI.delete(folder._id);
          toast.success('✓ Folder deleted successfully.');
          fetchData();
          setConfirmModal(prev => ({ ...prev, isOpen: false, loading: false }));
        } catch (error) {
          setConfirmModal(prev => ({ ...prev, loading: false, error: error.response?.data?.message || 'Delete failed' }));
        }
      }
    });
  };

  const handleToggleFavorite = async (doc, e) => {
    if (e) e.stopPropagation();
    try {
      await documentsAPI.update(doc._id, { isFavorite: !doc.isFavorite });
      toast.success(doc.isFavorite ? 'Removed from favorites' : 'Added to favorites');
      fetchData();
    } catch (error) {
      toast.error('Update failed');
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

  // Drag and Drop Handlers
  const handleDragStart = (e, doc) => {
    const isSelected = selectedDocs.some(d => d._id === doc._id);
    const payload = isSelected ? selectedDocs : [doc];

    e.dataTransfer.setData('application/json', JSON.stringify(payload.map(d => d._id)));
    e.dataTransfer.effectAllowed = 'move';

    // Create Custom Drag Preview Ghost
    const ghost = document.createElement('div');
    ghost.style.position = 'absolute';
    ghost.style.top = '-1000px';
    ghost.style.backgroundColor = '#FFFFFF';
    ghost.style.boxShadow = '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)';
    ghost.style.borderRadius = '12px';
    ghost.style.border = '1px solid #E5E7EB';
    ghost.style.padding = '12px 16px';
    ghost.style.display = 'flex';
    ghost.style.alignItems = 'center';
    ghost.style.gap = '12px';
    ghost.style.transform = 'rotate(2deg) scale(1.05)';
    ghost.style.zIndex = '9999';
    ghost.style.fontFamily = 'Inter, system-ui, sans-serif';
    ghost.style.width = 'max-content';

    if (payload.length > 1) {
      ghost.innerHTML = `
        <div style="width:24px; height:24px; display:flex; align-items:center; justify-content:center; color:#1A73E8;">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/></svg>
        </div>
        <span style="font-size:14px; font-weight:600; color:#111827;">${payload.length} selected items</span>
      `;
    } else {
      ghost.innerHTML = `
        <div style="width:24px; height:24px; display:flex; align-items:center; justify-content:center; color:#6B7280;">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
        </div>
        <span style="font-size:14px; font-weight:600; color:#111827;">${doc.name}</span>
      `;
    }

    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, 20, 20);

    // Clean up ghost from DOM
    setTimeout(() => document.body.removeChild(ghost), 50);

    // Fade original row
    setTimeout(() => {
      if (e.target && e.target.style) {
        e.target.style.opacity = '0.4';
      }
    }, 0);
  };

  const handleDragEnd = (e) => {
    if (e.target && e.target.style) {
      e.target.style.opacity = '1';
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (e, folderId) => {
    e.preventDefault();
    setDragOverFolderId(folderId);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOverFolderId(null);
    }
  };

  const handleDrop = async (e, folder) => {
    e.preventDefault();
    setDragOverFolderId(null);

    try {
      const data = e.dataTransfer.getData('application/json');
      if (!data) return;

      const documentIds = JSON.parse(data);
      if (!documentIds || documentIds.length === 0) return;

      await documentsAPI.move({
        documentIds,
        targetFolderId: folder._id
      });

      toast.success(`Moved to ${folder.name}`);

      // Flash the folder green briefly
      setDroppedFolderId(folder._id);
      setTimeout(() => setDroppedFolderId(null), 500);

      setSelectedDocs([]);
      fetchData();
    } catch (error) {
      console.error('Drop error:', error);
      toast.error('Failed to move files');
    }
  };

  // Selection Handlers
  const toggleSelection = (doc, e) => {
    if (e) e.stopPropagation();
    const isSelected = selectedDocs.find(d => d._id === doc._id);
    if (isSelected) {
      setSelectedDocs(selectedDocs.filter(d => d._id !== doc._id));
    } else {
      setSelectedDocs([...selectedDocs, doc]);
    }
  };

  const toggleAllSelection = () => {
    if (selectedDocs.length === documents.length) {
      setSelectedDocs([]);
    } else {
      setSelectedDocs([...documents]);
    }
  };

  const handleBulkDownload = async () => {
    // Basic implementation: sequential download
    for (const doc of selectedDocs) {
      await handleDownload(doc);
    }
    setSelectedDocs([]);
  };

  const handleBulkDelete = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Files?',
      description: `Are you sure you want to permanently delete ${selectedDocs.length} selected files? This action cannot be undone.`,
      loading: false,
      error: null,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, loading: true, error: null }));
        try {
          for (const doc of selectedDocs) {
            await documentsAPI.delete(doc._id);
          }
          toast.success('✓ Files deleted successfully.');
          setSelectedDocs([]);
          fetchData();
          setConfirmModal(prev => ({ ...prev, isOpen: false, loading: false }));
        } catch (error) {
          setConfirmModal(prev => ({ ...prev, loading: false, error: 'Delete failed' }));
        }
      }
    });
  };

  const handleBulkFavorite = async () => {
    for (const doc of selectedDocs) {
      if (!doc.isFavorite) {
        await documentsAPI.update(doc._id, { isFavorite: true });
      }
    }
    toast.success(`${selectedDocs.length} items added to favorites`);
    setSelectedDocs([]);
    fetchData();
  };

  const fileTypes = ['pdf', 'doc', 'xls', 'ppt', 'images', 'zip'];

  return (
    <MainLayout title={favoritesOnly ? 'Favorites' : 'My Documents'}>
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 relative">

        {/* + New Button */}
        {!favoritesOnly && (
          <div className="relative w-full sm:w-auto z-10" ref={dropdownRef}>
            <button
              onClick={() => setShowNewDropdown(!showNewDropdown)}
              className="flex items-center justify-center gap-2 px-5 py-3 w-full sm:w-auto bg-white border border-gray-200 rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] transition-all text-gray-900 font-semibold"
            >
              <Plus className="w-5 h-5 text-blue-600" />
              New
            </button>

            <AnimatePresence>
              {showNewDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute top-full left-0 mt-2 w-56 bg-white border border-gray-100 rounded-xl shadow-xl py-2 overflow-hidden"
                >
                  <button
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700"
                    onClick={() => {
                      setIsCreateFolderOpen(true);
                      setShowNewDropdown(false);
                    }}
                  >
                    <FolderPlus className="w-4 h-4 text-gray-400" />
                    New Folder
                  </button>
                  <div className="h-px bg-gray-100 my-1"></div>
                  <button
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700"
                    onClick={() => {
                      navigate(`/upload?folderId=${currentFolderId === 'root' ? '' : currentFolderId}`);
                      setShowNewDropdown(false);
                    }}
                  >
                    <UploadCloud className="w-4 h-4 text-gray-400" />
                    Upload File
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Filters & View Toggles */}
        <div className="flex items-center gap-3 w-full sm:w-auto ml-auto">
          <select
            className="flex-1 sm:flex-none block w-full pl-3 pr-8 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-colors shadow-sm"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="">All Types</option>
            {fileTypes.map((type) => (
              <option key={type} value={type}>
                {type === 'images' ? 'Images' : type === 'zip' ? 'ZIP' : type.toUpperCase()}
              </option>
            ))}
          </select>

          <div className="flex bg-gray-100 p-1 rounded-lg shrink-0">
            <button
              className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setViewMode('grid')}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setViewMode('list')}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Floating Action Toolbar */}
      <AnimatePresence>
        {selectedDocs.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white border border-gray-200 rounded-xl shadow-lg mb-6 p-2 flex items-center justify-between sticky top-4 z-20"
          >
            <div className="flex items-center gap-4 px-4 border-r border-gray-200">
              <span className="text-sm font-bold text-blue-600 whitespace-nowrap">
                {selectedDocs.length} selected
              </span>
              <button
                onClick={() => setSelectedDocs([])}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-1 px-2 overflow-x-auto whitespace-nowrap">
              <button
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                onClick={() => setIsMoveModalOpen(true)}
              >
                <FolderInput className="w-4 h-4" /> <span className="hidden sm:inline">Move</span>
              </button>
              <button
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                onClick={handleBulkDownload}
              >
                <Download className="w-4 h-4" /> <span className="hidden sm:inline">Download</span>
              </button>
              <button
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                onClick={handleBulkFavorite}
              >
                <Star className="w-4 h-4" /> <span className="hidden sm:inline">Favorite</span>
              </button>
              <button
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                onClick={handleBulkDelete}
              >
                <Trash2 className="w-4 h-4" /> <span className="hidden sm:inline">Delete</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Breadcrumbs */}
      {!favoritesOnly && currentFolderId !== 'root' && (
        <div className="flex items-center gap-2 mb-6 text-sm font-medium text-gray-600 overflow-x-auto whitespace-nowrap pb-2">
          <button
            onClick={() => setCurrentFolderId('root')}
            className="hover:text-blue-600 transition-colors px-2 py-1 rounded-lg hover:bg-gray-50 flex items-center gap-2"
          >
            My Documents
          </button>
          {folderPath.map((segment, index) => (
            <React.Fragment key={segment._id}>
              <ChevronRight className="w-4 h-4 text-gray-400" />
              <button
                onClick={() => setCurrentFolderId(segment._id)}
                className={`hover:text-blue-600 transition-colors px-2 py-1 rounded-lg hover:bg-gray-50 ${index === folderPath.length - 1 ? 'text-gray-900 font-bold' : ''}`}
              >
                {segment.name}
              </button>
            </React.Fragment>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center h-64">
          <div className="w-10 h-10 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin"></div>
        </div>
      ) : documents.length === 0 && folders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 bg-white border border-gray-200 border-dashed rounded-2xl">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 mb-6">
            {favoritesOnly ? <Star className="w-10 h-10" /> : <Folder className="w-10 h-10" />}
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            {favoritesOnly ? 'No favorite documents' : 'This folder is empty'}
          </h3>
          <p className="text-gray-600 text-sm">
            {filterType ? 'Try adjusting your filters.' : 'Get started by creating a folder or uploading a file.'}
          </p>
        </div>
      ) : (
        <div className="w-full">
          {/* FOLDERS LIST */}
          {folders.length > 0 && (
            <div className="mb-8">
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 px-2">Folders</h3>
              <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4' : 'space-y-2'}>
                {folders.map(folder => (
                  <div
                    key={folder._id}
                    onDoubleClick={() => setCurrentFolderId(folder._id)}
                    className={`group relative cursor-pointer border rounded-xl transition-all duration-300 hover:shadow-md ${viewMode === 'list' ? 'flex items-center p-3 gap-4' : 'flex items-center p-5 gap-4'
                      } ${droppedFolderId === folder._id
                        ? 'bg-green-50 border-green-400 scale-[1.03] ring-4 ring-green-500/20 shadow-lg'
                        : dragOverFolderId === folder._id
                          ? 'bg-blue-50 border-blue-400 scale-[1.04] ring-4 ring-blue-500/20 shadow-lg'
                          : 'bg-white border-gray-200 hover:border-blue-300'
                      }`}
                    onDragOver={handleDragOver}
                    onDragEnter={(e) => handleDragEnter(e, folder._id)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, folder)}
                  >
                    <Folder className={`w-8 h-8 shrink-0 transition-all duration-300 ${dragOverFolderId === folder._id ? 'text-blue-600 scale-110 fill-blue-100' : 'text-blue-500 fill-blue-50'}`} />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-gray-900 truncate" title={folder.name}>
                        {folder.name}
                      </h4>
                    </div>
                    <div className={`flex items-center opacity-0 group-hover:opacity-100 transition-opacity`}>
                      <button
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        onClick={(e) => { e.stopPropagation(); setShareItem(folder); setShareItemType('folder'); setIsShareModalOpen(true); }}
                        title="Share Folder"
                      >
                        <UserPlus className="w-4 h-4" />
                      </button>
                      <button
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        onClick={(e) => handleDeleteFolder(folder, e)}
                        title="Delete Folder"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Drop Indicator Overlay */}
                    <div className={`absolute inset-0 bg-blue-50/95 flex items-center justify-center rounded-xl border-2 border-blue-400 z-20 pointer-events-none transition-opacity duration-200 ${dragOverFolderId === folder._id ? 'opacity-100' : 'opacity-0'}`}>
                      <span className="text-blue-700 font-bold text-sm tracking-wide">Drop here</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* DOCUMENTS LIST */}
          {documents.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 px-2">Files</h3>
              {viewMode === 'list' && (
                <div className="hidden sm:grid grid-cols-[auto_auto_1fr_100px_100px_120px_100px] gap-4 items-center px-4 py-2 mb-2 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600 cursor-pointer"
                    checked={selectedDocs.length > 0 && selectedDocs.length === documents.length}
                    onChange={toggleAllSelection}
                  />
                  <div></div>
                  <div>Name</div>
                  <div>Type</div>
                  <div>Size</div>
                  <div>Modified</div>
                  <div className="text-right">Actions</div>
                </div>
              )}

              <motion.div
                className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4' : 'flex flex-col gap-2'}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                {documents.map((doc) => {
                  const isSelected = selectedDocs.some(d => d._id === doc._id);
                  return (
                    <motion.div
                      key={doc._id}
                      className={`group relative cursor-pointer bg-white border rounded-xl transition-all duration-200 hover:shadow-md ${isSelected ? 'border-blue-400 bg-blue-50/30' : 'border-gray-200 hover:border-gray-300'
                        } ${viewMode === 'list' ? 'flex items-center p-3 sm:grid sm:grid-cols-[auto_auto_1fr_100px_100px_120px_100px] gap-4' : 'flex flex-col p-5 h-full'
                        }`}
                      draggable
                      onDragStart={(e) => handleDragStart(e, doc)}
                      onDragEnd={handleDragEnd}
                      onClick={(e) => {
                        handlePreview(doc);
                      }}
                    >
                      {/* Checkbox (Absolute in grid, inline in list) */}
                      <div className={`${viewMode === 'grid' ? 'absolute top-3 left-3 opacity-0 group-hover:opacity-100' : ''} ${isSelected ? 'opacity-100' : ''} z-10`} onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600 cursor-pointer"
                          checked={isSelected}
                          onChange={(e) => toggleSelection(doc, e)}
                        />
                      </div>

                      <div
                        className={`flex items-center justify-center rounded-xl shrink-0 ${viewMode === 'list' ? 'w-10 h-10 ml-8 sm:ml-0' : 'w-16 h-16 mb-4 mx-auto'}`}
                        style={{
                          color: getFileIconColor(doc.fileType),
                          backgroundColor: `${getFileIconColor(doc.fileType)}15`,
                        }}
                      >
                        {getFileIcon(doc.fileType)}
                      </div>

                      <div className={`flex-1 min-w-0 ${viewMode === 'grid' ? 'mb-4 text-center' : ''}`}>
                        <h4 className="text-sm font-semibold text-gray-900 truncate mb-1" title={doc.name}>
                          {doc.name}
                        </h4>
                        {viewMode === 'grid' && (
                          <p className="text-xs font-medium text-gray-500">
                            {formatFileSize(doc.size)} &middot; {format(new Date(doc.createdAt), 'MMM d, yyyy')}
                          </p>
                        )}
                      </div>

                      {viewMode === 'list' && (
                        <>
                          <div className="hidden sm:block text-sm text-gray-600">{formatFileType(doc.fileType)}</div>
                          <div className="hidden sm:block text-sm text-gray-600">{formatFileSize(doc.size)}</div>
                          <div className="hidden sm:block text-sm text-gray-600">{format(new Date(doc.createdAt), 'MMM d, yyyy')}</div>
                        </>
                      )}

                      <div className={`flex items-center gap-1 ${viewMode === 'grid' ? 'mt-auto justify-center border-t border-gray-100 pt-3' : 'justify-end'}`}>
                        <button
                          className={`p-2 rounded-lg transition-colors ${doc.isFavorite ? 'text-orange-500 bg-orange-50 hover:bg-orange-100' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'} opacity-0 group-hover:opacity-100`}
                          onClick={(e) => handleToggleFavorite(doc, e)}
                          title={doc.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                        >
                          <Star className={`w-4 h-4 ${doc.isFavorite ? 'fill-current' : ''}`} />
                        </button>
                        <button
                          className="p-2 text-gray-400 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                          onClick={(e) => { e.stopPropagation(); setShareItem(doc); setShareItemType('document'); setIsShareModalOpen(true); }}
                          title="Share"
                        >
                          <UserPlus className="w-4 h-4" />
                        </button>
                        <button
                          className="p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                          onClick={(e) => { e.stopPropagation(); setVersionHistoryDoc(doc); setIsVersionHistoryOpen(true); }}
                          title="Version History"
                        >
                          <History className="w-4 h-4" />
                        </button>
                        <button
                          className="p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                          onClick={(e) => handleDownload(doc, e)}
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          className="p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                          onClick={(e) => handleDelete(doc, e)}
                          title="Move to trash"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            </div>
          )}
        </div>
      )}

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-200 mt-8 pt-4">
          <button
            className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-gray-900 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            disabled={page === 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
          >
            <ChevronLeft className="w-4 h-4" /> Previous
          </button>
          <span className="text-sm font-medium text-gray-600">
            Page {page} of {totalPages}
          </span>
          <button
            className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-gray-900 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            disabled={page === totalPages}
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
          >
            Next <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      <PreviewModal
        previewDoc={previewDoc}
        previewUrl={previewUrl}
        onClose={() => {
          setPreviewDoc(null);
          setPreviewUrl('');
        }}
        onDownload={(doc) => handleDownload(doc)}
        onFavorite={(doc) => handleToggleFavorite(doc)}
        onShare={(doc) => {
          setShareItem(doc);
          setShareItemType('document');
          setIsShareModalOpen(true);
        }}
      />

      <CreateFolderModal
        isOpen={isCreateFolderOpen}
        onClose={() => setIsCreateFolderOpen(false)}
        parentFolderId={currentFolderId === 'root' ? null : currentFolderId}
        onSuccess={fetchData}
      />

      <MoveToFolderModal
        isOpen={isMoveModalOpen}
        onClose={() => setIsMoveModalOpen(false)}
        selectedDocs={selectedDocs}
        currentFolderId={currentFolderId === 'root' ? null : currentFolderId}
        onSuccess={() => {
          setSelectedDocs([]);
          fetchData();
        }}
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

      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        selectedItem={shareItem}
        itemType={shareItemType}
      />

      <VersionHistoryModal
        isOpen={isVersionHistoryOpen}
        onClose={() => setIsVersionHistoryOpen(false)}
        document={versionHistoryDoc}
        onVersionRestored={() => fetchData()}
      />
    </MainLayout>
  );
};

export default Documents;
