import React, { useState, useEffect, useCallback, useRef } from 'react';
import MainLayout from '../components/Layout/MainLayout';
import { sharedLinksAPI } from '../services/api';
import { getFileIcon, getFileIconColor, formatFileType } from '../utils/fileHelpers';
import { motion, AnimatePresence } from 'framer-motion';
import { format, addDays } from 'date-fns';
import { toast } from 'react-toastify';
import {
  Link2, Search, X, MoreVertical, Copy, ExternalLink,
  Trash2, Edit2, Folder, XCircle, Settings, Clock, CheckCircle2, ShieldOff, Check
} from 'lucide-react';

const EditModal = ({ selectedItem, isOpen, onClose, onSave }) => {
  const [editPerm, setEditPerm] = useState('viewer');
  const [expirationOption, setExpirationOption] = useState('never');

  useEffect(() => {
    if (selectedItem) {
      setEditPerm(selectedItem.permission);
      setExpirationOption(selectedItem.expiresAt ? 'custom' : 'never');
    }
  }, [selectedItem]);

  if (!isOpen || !selectedItem) return null;

  const handleSave = () => {
    let expiresAt = null;
    if (expirationOption === '1day') expiresAt = addDays(new Date(), 1);
    else if (expirationOption === '7days') expiresAt = addDays(new Date(), 7);
    else if (expirationOption === '30days') expiresAt = addDays(new Date(), 30);
    else if (expirationOption === 'custom' && selectedItem.expiresAt) expiresAt = selectedItem.expiresAt; // Keep existing if custom selected initially

    onSave({ permission: editPerm, expiresAt });
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h3 className="text-lg font-bold text-gray-900">Edit Link Settings</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Permission</label>
            <select
              value={editPerm} onChange={(e) => setEditPerm(e.target.value)}
              className="w-full pl-3 pr-8 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
            >
              <option value="viewer">Viewer</option>
              <option value="editor">Editor</option>
              <option value="commenter">Commenter</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Expiration</label>
            <select
              value={expirationOption} onChange={(e) => setExpirationOption(e.target.value)}
              className="w-full pl-3 pr-8 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
            >
              <option value="never">Never expire</option>
              <option value="1day">1 Day</option>
              <option value="7days">7 Days</option>
              <option value="30days">30 Days</option>
              {selectedItem.expiresAt && <option value="custom">Keep Current ({format(new Date(selectedItem.expiresAt), 'MMM d, yyyy')})</option>}
            </select>
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
          <button onClick={handleSave} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">Save Changes</button>
        </div>
      </motion.div>
    </div>
  );
};

const SharedLinks = () => {
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [permission, setPermission] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [fileType, setFileType] = useState('all');
  const [sort, setSort] = useState('-createdAt');

  // UI State
  const [selectedItem, setSelectedItem] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Action Menu State
  const [menuOpenId, setMenuOpenId] = useState(null);
  const menuRef = useRef(null);

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

  const fetchLinks = useCallback(async () => {
    try {
      setLoading(true);
      const res = await sharedLinksAPI.getAll();
      if (res.data.success) {
        setLinks(res.data.data);
      }
    } catch (error) {
      toast.error('Failed to load shared links');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

  // Filtering Logic (In-memory since no specific API filters requested for this endpoint)
  const filteredLinks = links.filter(link => {
    if (permission !== 'all' && link.permission !== permission) return false;
    if (statusFilter !== 'all' && link.status !== statusFilter) return false;
    if (fileType !== 'all') {
      if (fileType === 'folder' && !link.isFolder) return false;
      if (fileType !== 'folder' && (link.isFolder || link.documentType !== fileType)) return false;
    }
    if (debouncedSearch) {
      const s = debouncedSearch.toLowerCase();
      if (!link.documentName.toLowerCase().includes(s)) return false;
    }
    return true;
  }).sort((a, b) => {
    if (sort === '-createdAt') return new Date(b.createdAt) - new Date(a.createdAt);
    if (sort === 'createdAt') return new Date(a.createdAt) - new Date(b.createdAt);
    if (sort === '-lastAccessed') {
      if (!a.lastAccessed) return 1;
      if (!b.lastAccessed) return -1;
      return new Date(b.lastAccessed) - new Date(a.lastAccessed);
    }
    return 0;
  });

  const handleCopyLink = (token, e) => {
    if (e) e.stopPropagation();
    const url = `${window.location.origin}/share/${token}`;
    navigator.clipboard.writeText(url);
    toast.success('Share link copied.');
    setMenuOpenId(null);
  };

  const handleOpenLink = (token, e) => {
    if (e) e.stopPropagation();
    window.open(`/share/${token}`, '_blank');
    setMenuOpenId(null);
  };

  const handleDisableLink = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      await sharedLinksAPI.disable(id);
      toast.success('Link disabled');
      fetchLinks();
    } catch (error) {
      toast.error('Failed to disable link');
    }
    setMenuOpenId(null);
  };

  const handleEnableLink = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      await sharedLinksAPI.enable(id);
      toast.success('Link enabled');
      fetchLinks();
    } catch (error) {
      toast.error('Failed to enable link');
    }
    setMenuOpenId(null);
  };

  const handleDeleteLink = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      await sharedLinksAPI.delete(id);
      toast.success('Link deleted successfully');
      setLinks(prev => prev.filter(l => l._id !== id));
      if (selectedItem && selectedItem._id === id) setIsDrawerOpen(false);
    } catch (error) {
      toast.error('Failed to delete link');
    }
    setMenuOpenId(null);
  };

  const openEditModal = (item, e) => {
    if (e) e.stopPropagation();
    setSelectedItem(item);
    setIsEditModalOpen(true);
    setMenuOpenId(null);
  };

  const handleSaveEdit = async (updatedData) => {
    try {
      await sharedLinksAPI.update(selectedItem._id, updatedData);
      toast.success('Link settings updated');
      setIsEditModalOpen(false);
      fetchLinks();
      // Update selectedItem for drawer if open
      setSelectedItem(prev => ({ ...prev, ...updatedData }));
    } catch (error) {
      toast.error('Failed to update link settings');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active': return <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Active</span>;
      case 'expiring_soon': return <span className="px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-700 rounded-full flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span> Expiring Soon</span>;
      case 'expired': return <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded-full flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-500"></span> Expired</span>;
      case 'disabled': return <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 rounded-full flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-gray-500"></span> Disabled</span>;
      default: return null;
    }
  };

  const getPermissionBadge = (perm) => {
    if (perm === 'editor') return <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">Editor</span>;
    if (perm === 'commenter') return <span className="px-2 py-0.5 text-xs font-medium bg-orange-100 text-orange-700 rounded-full">Commenter</span>;
    return <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">Viewer</span>;
  };



  return (
    <MainLayout title="Shared Links" subtitle="Manage all public and private shared links.">
      <div className="flex flex-col h-full relative">
        {/* Filters Row */}
        <div className="flex flex-wrap items-center gap-3 mb-6 px-1">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search links..."
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
            value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="pl-3 pr-8 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 shadow-sm"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="expiring_soon">Expiring Soon</option>
            <option value="expired">Expired</option>
            <option value="disabled">Disabled</option>
          </select>

          <select
            value={permission} onChange={(e) => setPermission(e.target.value)}
            className="pl-3 pr-8 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 shadow-sm"
          >
            <option value="all">All Permissions</option>
            <option value="viewer">Viewer</option>
            <option value="editor">Editor</option>
            <option value="commenter">Commenter</option>
          </select>

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
            value={sort} onChange={(e) => setSort(e.target.value)}
            className="pl-3 pr-8 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 shadow-sm ml-auto"
          >
            <option value="-createdAt">Newest First</option>
            <option value="createdAt">Oldest First</option>
            <option value="-lastAccessed">Recently Accessed</option>
          </select>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-auto pr-2 pb-20 md:pb-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-10 h-10 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
              <p className="text-gray-500 font-medium">Loading shared links...</p>
            </div>
          ) : filteredLinks.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-32 bg-white border border-gray-200 border-dashed rounded-2xl mx-1"
            >
              <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mb-6">
                <Link2 className="w-12 h-12 text-blue-500" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">No shared links yet</h3>
              <p className="text-gray-500 text-center max-w-sm mb-6">
                Generate a share link from My Documents to see it here.
              </p>
              <a href="/documents" className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-full shadow-sm hover:bg-blue-700 transition-colors">
                Go to My Documents
              </a>
            </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-visible">
              <div className="hidden md:grid grid-cols-[50px_1fr_100px_120px_100px_100px_80px_60px] gap-4 items-center px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200 bg-gray-50 rounded-t-xl">
                <div className="text-center">Icon</div>
                <div>Name</div>
                <div>Status</div>
                <div>Permission</div>
                <div>Created</div>
                <div>Expires</div>
                <div className="hidden lg:block text-center">Accesses</div>
                <div className="text-center">Actions</div>
              </div>

              <div className="flex flex-col">
                {filteredLinks.map((item, idx) => (
                  <div
                    key={item._id}
                    onClick={() => { setSelectedItem(item); setIsDrawerOpen(true); }}
                    className={`group relative flex flex-col md:grid md:grid-cols-[50px_1fr_100px_120px_100px_100px_80px_60px] gap-2 md:gap-4 items-center px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors ${idx !== filteredLinks.length - 1 ? 'border-b border-gray-100' : ''
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
                        <div className="flex items-center gap-2 mt-1">
                          {getStatusBadge(item.status)}
                        </div>
                      </div>
                    </div>

                    {/* Desktop Name */}
                    <div className="hidden md:block min-w-0 pr-4">
                      <h4 className="text-sm font-semibold text-gray-900 truncate">{item.documentName}</h4>
                    </div>

                    <div className="hidden md:block">
                      {getStatusBadge(item.status)}
                    </div>

                    <div className="hidden md:block">
                      {getPermissionBadge(item.permission)}
                    </div>

                    <div className="hidden md:block text-sm text-gray-600">
                      {format(new Date(item.createdAt), 'MMM d, yyyy')}
                    </div>

                    <div className="hidden md:block text-sm text-gray-600">
                      {item.expiresAt ? format(new Date(item.expiresAt), 'MMM d, yyyy') : 'Never'}
                    </div>

                    <div className="hidden lg:block text-sm font-medium text-gray-700 text-center">
                      {item.accessCount}
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
                            <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 text-left" onClick={(e) => handleCopyLink(item.linkToken, e)}>
                              <Copy className="w-4 h-4 text-gray-400" /> Copy Link
                            </button>
                            <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 text-left" onClick={(e) => handleOpenLink(item.linkToken, e)}>
                              <ExternalLink className="w-4 h-4 text-gray-400" /> Open Link
                            </button>
                            <div className="h-px bg-gray-100 my-1"></div>
                            <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 text-left" onClick={(e) => openEditModal(item, e)}>
                              <Settings className="w-4 h-4 text-gray-400" /> Settings
                            </button>
                            {item.linkEnabled ? (
                              <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-orange-600 hover:bg-orange-50 text-left" onClick={(e) => handleDisableLink(item._id, e)}>
                                <ShieldOff className="w-4 h-4 text-orange-400" /> Disable Link
                              </button>
                            ) : (
                              <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-green-600 hover:bg-green-50 text-left" onClick={(e) => handleEnableLink(item._id, e)}>
                                <CheckCircle2 className="w-4 h-4 text-green-400" /> Enable Link
                              </button>
                            )}
                            <div className="h-px bg-gray-100 my-1"></div>
                            <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 text-left" onClick={(e) => handleDeleteLink(item._id, e)}>
                              <Trash2 className="w-4 h-4 text-red-400" /> Delete Link
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                ))}
              </div>
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
                  <h3 className="font-semibold text-gray-900">Link Details</h3>
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
                    <div className="mt-2 flex justify-center gap-2">
                      {getStatusBadge(selectedItem.status)}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Link Info</p>
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm items-center">
                          <span className="text-gray-500">Permission</span>
                          {getPermissionBadge(selectedItem.permission)}
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Created Date</span>
                          <span className="text-gray-900 font-medium">{format(new Date(selectedItem.createdAt), 'MMM d, yyyy')}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Expiration</span>
                          <span className="text-gray-900 font-medium">{selectedItem.expiresAt ? format(new Date(selectedItem.expiresAt), 'MMM d, yyyy') : 'Never'}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Access Count</span>
                          <span className="text-gray-900 font-medium">{selectedItem.accessCount} visits</span>
                        </div>
                        {selectedItem.lastAccessed && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Last Accessed</span>
                            <span className="text-gray-900 font-medium">{format(new Date(selectedItem.lastAccessed), 'MMM d, yyyy HH:mm')}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 border-t border-gray-100 flex flex-col gap-2 bg-gray-50">
                  <button
                    onClick={() => handleCopyLink(selectedItem.linkToken)}
                    className="flex items-center justify-center gap-2 w-full py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                  >
                    <Copy className="w-4 h-4" /> Copy Link
                  </button>
                  <button
                    onClick={() => openEditModal(selectedItem)}
                    className="flex items-center justify-center gap-2 w-full py-2 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
                  >
                    <Settings className="w-4 h-4" /> Edit Settings
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <EditModal
          selectedItem={selectedItem}
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onSave={handleSaveEdit}
        />
      </div>
    </MainLayout>
  );
};

export default SharedLinks;
