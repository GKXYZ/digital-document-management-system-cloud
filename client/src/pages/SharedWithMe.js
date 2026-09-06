import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/Layout/MainLayout';
import { sharedWithMeAPI, documentsAPI } from '../services/api';
import { getFileIcon, getFileIconColor, formatFileSize, formatFileType } from '../utils/fileHelpers';
import { motion, AnimatePresence } from 'framer-motion';
import { format, isToday, isYesterday, isThisWeek, isThisMonth } from 'date-fns';
import { toast } from 'react-toastify';
import {
  UsersRound, Search, X, MoreVertical, Download, Eye, ExternalLink,
  Trash2, Edit2, Folder, FileText, XCircle
} from 'lucide-react';
import PreviewModal from '../components/Common/PreviewModal';

const SharedWithMe = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [fileType, setFileType] = useState('all');
  const [permission, setPermission] = useState('all');
  const [sort, setSort] = useState('-createdAt');

  const [debouncedSearch, setDebouncedSearch] = useState('');

  // UI State
  const [selectedItem, setSelectedItem] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Action Menu State
  const [menuOpenId, setMenuOpenId] = useState(null);
  const menuRef = useRef(null);

  // Preview State
  const [previewDoc, setPreviewDoc] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpenId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (debouncedSearch) params.search = debouncedSearch;
      if (fileType !== 'all') params.fileType = fileType;
      if (permission !== 'all') params.permission = permission;
      if (sort) params.sort = sort;

      const res = await sharedWithMeAPI.getAll(params);
      if (res.data.success) {
        setItems(res.data.data);
      }
    } catch (error) {
      toast.error('Failed to load shared items');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, fileType, permission, sort]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDownload = async (item, e) => {
    if (e) e.stopPropagation();
    if (item.isFolder) {
      toast.info('Folder download not supported yet');
      return;
    }
    try {
      const res = await documentsAPI.download(item.documentId);
      window.open(res.data.downloadUrl, '_blank');
      toast.success(`Downloading ${item.documentName}`);
    } catch (error) {
      toast.error('Download failed');
    }
    setMenuOpenId(null);
  };

  const handlePreview = async (item, e) => {
    if (e) e.stopPropagation();
    if (item.isFolder) {
      // Navigate to folder or just show toast
      toast.info('Cannot preview folder');
      return;
    }
    try {
      const res = await documentsAPI.preview(item.documentId);
      // Need a mock doc object for preview modal
      const mockDoc = {
        _id: item.documentId,
        name: item.documentName,
        originalName: item.documentName,
        fileType: item.documentType,
        size: item.fileSize,
        createdAt: item.sharedAt,
        owner: item.owner
      };
      setPreviewDoc(mockDoc);
      setPreviewUrl(res.data.previewUrl);
    } catch (error) {
      toast.error('Preview failed');
    }
    setMenuOpenId(null);
  };

  const handleRowClick = (item) => {
    setSelectedItem(item);
    setIsDrawerOpen(true);
  };

  const groupItems = (itemsList) => {
    const groups = {
      today: [],
      yesterday: [],
      thisWeek: [],
      thisMonth: [],
      older: []
    };

    itemsList.forEach(item => {
      const date = new Date(item.sharedAt);
      if (isToday(date)) groups.today.push(item);
      else if (isYesterday(date)) groups.yesterday.push(item);
      else if (isThisWeek(date)) groups.thisWeek.push(item);
      else if (isThisMonth(date)) groups.thisMonth.push(item);
      else groups.older.push(item);
    });

    return [
      { label: 'Today', data: groups.today },
      { label: 'Yesterday', data: groups.yesterday },
      { label: 'Earlier This Week', data: groups.thisWeek },
      { label: 'Last Month', data: groups.thisMonth },
      { label: 'Older', data: groups.older }
    ].filter(g => g.data.length > 0);
  };

  const groupedData = groupItems(items);

  const getPermissionBadge = (perm) => {
    if (perm === 'editor') return <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">Editor</span>;
    if (perm === 'commenter') return <span className="px-2 py-0.5 text-xs font-medium bg-orange-100 text-orange-700 rounded-full">Commenter</span>;
    return <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">Viewer</span>;
  };

  const renderTableHeaders = () => (
    <div className="hidden md:grid grid-cols-[50px_1fr_150px_120px_150px_100px_60px] gap-4 items-center px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100 mb-2">
      <div className="text-center">Icon</div>
      <div>Name</div>
      <div>Shared By</div>
      <div>Permission</div>
      <div>Date Shared</div>
      <div className="hidden lg:block">Size</div>
      <div className="text-center">Actions</div>
    </div>
  );

  return (
    <MainLayout title="Shared with Me">
      <div className="flex flex-col h-full relative">
        {/* Filters Row */}
        <div className="flex flex-wrap items-center gap-3 mb-6 px-1">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search in shared..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 w-full sm:w-64 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all bg-white"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <select
            value={fileType} onChange={(e) => setFileType(e.target.value)}
            className="pl-3 pr-8 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 shadow-sm"
          >
            <option value="all">Any type</option>
            <option value="folder">Folders</option>
            <option value="pdf">PDFs</option>
            <option value="images">Images</option>
            <option value="doc">Documents</option>
          </select>

          <select
            value={permission} onChange={(e) => setPermission(e.target.value)}
            className="pl-3 pr-8 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 shadow-sm"
          >
            <option value="all">All Permissions</option>
            <option value="viewer">Viewer</option>
            <option value="editor">Editor</option>
          </select>

          <select
            value={sort} onChange={(e) => setSort(e.target.value)}
            className="pl-3 pr-8 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 shadow-sm ml-auto"
          >
            <option value="-createdAt">Date Shared (Newest)</option>
            <option value="date-asc">Date Shared (Oldest)</option>
            <option value="name-asc">Name (A-Z)</option>
            <option value="name-desc">Name (Z-A)</option>
            <option value="owner-asc">Owner Name</option>
          </select>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-auto pr-2 pb-20 md:pb-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-10 h-10 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
              <p className="text-gray-500 font-medium">Loading shared files...</p>
            </div>
          ) : items.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-32 bg-white border border-gray-200 border-dashed rounded-2xl mx-1"
            >
              <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mb-6">
                <UsersRound className="w-12 h-12 text-blue-500" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">No shared files</h3>
              <p className="text-gray-500 text-center max-w-sm mb-6">
                Files and folders shared with you by others will appear here.
              </p>
              <button
                onClick={() => navigate('/documents')}
                className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-full shadow-sm hover:bg-blue-700 transition-colors"
              >
                Go to My Documents
              </button>
            </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              {groupedData.map((group, groupIdx) => (
                <div key={groupIdx} className="bg-white rounded-xl border border-gray-200 overflow-visible shadow-sm">
                  <h3 className="text-sm font-semibold text-gray-900 bg-gray-50 px-4 py-2.5 border-b border-gray-200">
                    {group.label}
                  </h3>
                  {renderTableHeaders()}

                  <div className="flex flex-col">
                    {group.data.map((item, idx) => (
                      <div
                        key={item._id}
                        onClick={() => handleRowClick(item)}
                        className={`group relative flex flex-col md:grid md:grid-cols-[50px_1fr_150px_120px_150px_100px_60px] gap-2 md:gap-4 items-center px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors ${idx !== group.data.length - 1 ? 'border-b border-gray-100' : ''
                          } ${selectedItem?._id === item._id ? 'bg-blue-50/50' : ''}`}
                      >
                        {/* Mobile & Desktop Icon */}
                        <div className="flex items-center w-full md:w-auto">
                          <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 mr-3 md:mr-0 md:mx-auto"
                            style={{
                              color: item.isFolder ? '#3b82f6' : getFileIconColor(item.documentType),
                              backgroundColor: item.isFolder ? '#3b82f615' : `${getFileIconColor(item.documentType)}15`,
                            }}
                          >
                            {item.isFolder ? <Folder className="w-5 h-5 fill-current opacity-20" /> : getFileIcon(item.documentType)}
                          </div>

                          {/* Mobile Layout Title */}
                          <div className="md:hidden flex-1 min-w-0">
                            <h4 className="text-sm font-semibold text-gray-900 truncate">{item.documentName}</h4>
                            <p className="text-xs text-gray-500 truncate">Shared by {item.owner.name}</p>
                          </div>
                        </div>

                        {/* Desktop Name */}
                        <div className="hidden md:block min-w-0 pr-4">
                          <h4 className="text-sm font-semibold text-gray-900 truncate">{item.documentName}</h4>
                        </div>

                        <div className="hidden md:flex items-center gap-2 min-w-0">
                          {item.owner.avatar ? (
                            <img src={item.owner.avatar} alt="Avatar" className="w-6 h-6 rounded-full" />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold uppercase shrink-0">
                              {item.owner.name[0]}
                            </div>
                          )}
                          <span className="text-sm text-gray-600 truncate">{item.owner.name}</span>
                        </div>

                        <div className="hidden md:block">
                          {getPermissionBadge(item.permission)}
                        </div>

                        <div className="hidden md:block text-sm text-gray-600">
                          {format(new Date(item.sharedAt), 'MMM d, yyyy')}
                        </div>

                        <div className="hidden lg:block text-sm text-gray-600">
                          {item.fileSize ? formatFileSize(item.fileSize) : '-'}
                        </div>

                        {/* Action Menu (Desktop & Mobile) */}
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 md:relative md:top-auto md:translate-y-0 flex items-center justify-center">
                          <button
                            className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              setMenuOpenId(menuOpenId === item._id ? null : item._id);
                            }}
                          >
                            <MoreVertical className="w-5 h-5" />
                          </button>

                          <AnimatePresence>
                            {menuOpenId === item._id && (
                              <motion.div
                                ref={menuRef}
                                initial={{ opacity: 0, scale: 0.95, transformOrigin: 'top right' }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="absolute right-0 top-10 md:top-full mt-1 w-48 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden"
                              >
                                <button
                                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors text-left"
                                  onClick={(e) => handlePreview(item, e)}
                                >
                                  <Eye className="w-4 h-4 text-gray-400" /> Preview
                                </button>
                                <button
                                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors text-left"
                                  onClick={(e) => handleDownload(item, e)}
                                >
                                  <Download className="w-4 h-4 text-gray-400" /> Download
                                </button>
                                <div className="h-px bg-gray-100 my-1"></div>
                                <button
                                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors text-left"
                                  onClick={(e) => { e.stopPropagation(); setMenuOpenId(null); setIsDrawerOpen(true); setSelectedItem(item); }}
                                >
                                  <FileText className="w-4 h-4 text-gray-400" /> View Details
                                </button>
                                {item.permission === 'editor' && (
                                  <>
                                    <div className="h-px bg-gray-100 my-1"></div>
                                    <button
                                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors text-left"
                                      onClick={(e) => { e.stopPropagation(); toast.info('Rename logic to be implemented'); setMenuOpenId(null); }}
                                    >
                                      <Edit2 className="w-4 h-4 text-gray-400" /> Rename
                                    </button>
                                  </>
                                )}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </div>

        {/* Details Drawer */}
        <AnimatePresence>
          {isDrawerOpen && selectedItem && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/20 z-40 lg:hidden"
                onClick={() => setIsDrawerOpen(false)}
              />
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
                className="fixed inset-y-0 right-0 w-80 bg-white border-l border-gray-200 shadow-2xl z-50 flex flex-col"
              >
                <div className="flex items-center justify-between p-4 border-b border-gray-100">
                  <h3 className="font-semibold text-gray-900">Details</h3>
                  <button onClick={() => setIsDrawerOpen(false)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1">
                  <div className="flex flex-col items-center text-center mb-6">
                    <div
                      className="w-20 h-20 rounded-2xl flex items-center justify-center mb-4"
                      style={{
                        color: selectedItem.isFolder ? '#3b82f6' : getFileIconColor(selectedItem.documentType),
                        backgroundColor: selectedItem.isFolder ? '#3b82f615' : `${getFileIconColor(selectedItem.documentType)}15`,
                      }}
                    >
                      {selectedItem.isFolder ? <Folder className="w-10 h-10 fill-current opacity-20" /> : getFileIcon(selectedItem.documentType)}
                    </div>
                    <h4 className="font-bold text-gray-900 break-all">{selectedItem.documentName}</h4>
                    <p className="text-sm text-gray-500 mt-1">{selectedItem.isFolder ? 'Folder' : formatFileType(selectedItem.documentType)}</p>
                  </div>

                  <div className="space-y-4">
                    <div className="pb-4 border-b border-gray-100">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Owner Properties</p>
                      <div className="flex items-center gap-3">
                        {selectedItem.owner.avatar ? (
                          <img src={selectedItem.owner.avatar} alt="Avatar" className="w-8 h-8 rounded-full" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-sm font-bold uppercase shrink-0">
                            {selectedItem.owner.name[0]}
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-medium text-gray-900">{selectedItem.owner.name}</p>
                          <p className="text-xs text-gray-500">{selectedItem.owner.email}</p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Item Info</p>
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Shared Date</span>
                          <span className="text-gray-900 font-medium">{format(new Date(selectedItem.sharedAt), 'MMM d, yyyy')}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Size</span>
                          <span className="text-gray-900 font-medium">{selectedItem.fileSize ? formatFileSize(selectedItem.fileSize) : '-'}</span>
                        </div>
                        <div className="flex justify-between text-sm items-center">
                          <span className="text-gray-500">Your Permission</span>
                          {getPermissionBadge(selectedItem.permission)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 border-t border-gray-100 grid grid-cols-2 gap-3 bg-gray-50">
                  <button
                    onClick={(e) => handlePreview(selectedItem, e)}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
                  >
                    <Eye className="w-4 h-4" /> Open
                  </button>
                  <button
                    onClick={(e) => handleDownload(selectedItem, e)}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
                    disabled={selectedItem.isFolder}
                  >
                    <Download className="w-4 h-4" /> Download
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <PreviewModal
          previewDoc={previewDoc}
          previewUrl={previewUrl}
          onClose={() => {
            setPreviewDoc(null);
            setPreviewUrl('');
          }}
          onDownload={(doc) => handleDownload({ documentId: doc._id, documentName: doc.name, isFolder: false })}
          onFavorite={() => { }}
          onShare={() => { }}
        />

      </div>
    </MainLayout>
  );
};

export default SharedWithMe;
