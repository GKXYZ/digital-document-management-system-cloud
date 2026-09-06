import React, { useState, useEffect, useRef } from 'react';
import { Menu, Bell, Check, Info, AlertCircle, Search, X, FileText, Folder } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { notificationsAPI, documentsAPI, foldersAPI } from '../../services/api';
import { useNavigate, useSearchParams, useLocation, Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { useNotificationContext } from '../../context/NotificationContext';
import * as Icons from 'lucide-react';

const Header = ({ title, subtitle, onMenuClick, children }) => {
  const { user } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotificationContext();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const searchContainerRef = useRef(null);

  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (location.pathname === '/search') {
      setSearchQuery(searchParams.get('q') || '');
    } else {
      setSearchQuery('');
    }
  }, [location.pathname, searchParams]);

  useEffect(() => {
    if (!searchQuery.trim() || !showSuggestions) {
      setSuggestions([]);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true);
      try {
        const [docsRes, foldersRes] = await Promise.all([
          documentsAPI.getAll({ search: searchQuery.trim(), limit: 4 }),
          foldersAPI.getAll({ search: searchQuery.trim() })
        ]);
        const foldersList = (foldersRes.data.folders || []).slice(0, 3).map(f => ({ ...f, isFolder: true }));
        const docsList = docsRes.data.documents || [];
        setSuggestions([...foldersList, ...docsList].slice(0, 5));
      } catch (error) {
        console.error('Failed to fetch suggestions', error);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, showSuggestions]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);



  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id, e) => {
    if (e) e.stopPropagation();
    await markAsRead(id);
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  const getNotificationIcon = (type, iconName) => {
    if (iconName && Icons[iconName]) {
      const IconComp = Icons[iconName];
      let colorClass = "text-blue-600";
      if (type === 'success') colorClass = "text-green-500";
      else if (type === 'warning' || type === 'storage_warning') colorClass = "text-orange-500";
      else if (type === 'error') colorClass = "text-red-500";

      return <IconComp className={`${colorClass} w-5 h-5`} />;
    }

    switch (type) {
      case 'success': return <Icons.Check className="text-green-500 w-5 h-5" />;
      case 'warning':
      case 'storage_warning': return <Icons.AlertCircle className="text-orange-500 w-5 h-5" />;
      case 'error': return <Icons.AlertCircle className="text-red-500 w-5 h-5" />;
      default: return <Icons.Bell className="text-blue-600 w-5 h-5" />;
    }
  };

  return (
    <header className="h-16 flex items-center justify-between px-4 md:px-6 bg-white border-b border-gray-200 shadow-sm sticky top-0 z-30">
      {/* Left section */}
      <div className="flex items-center gap-4">
        <button
          className="md:hidden p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
          onClick={onMenuClick}
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="hidden sm:block">
          <h1 className="text-xl font-semibold text-gray-900 tracking-tight">{title}</h1>
          {subtitle && <p className="text-xs text-gray-600 mt-0.5">{subtitle}</p>}
        </div>
      </div>

      {/* Global Search (Center) */}
      <div className="flex-1 max-w-2xl px-4 hidden md:block">
        <form
          className="relative group"
          ref={searchContainerRef}
          onSubmit={(e) => {
            e.preventDefault();
            setShowSuggestions(false);
            if (searchQuery.trim()) {
              navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
            }
          }}
        >
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="w-5 h-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-10 py-2.5 border border-transparent rounded-full leading-5 bg-gray-50 text-gray-900 placeholder-gray-500 focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-primary-100 transition-all sm:text-sm"
            placeholder="Search in CloudVault"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
          />
          {searchQuery && (
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
              onClick={() => {
                setSearchQuery('');
                setShowSuggestions(false);
                if (location.pathname === '/search') {
                  navigate(-1);
                }
              }}
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {/* Suggestions Dropdown */}
          {showSuggestions && searchQuery.trim() && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden z-50">
              {isSearching ? (
                <div className="p-4 text-center text-sm text-gray-500 flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin mr-2"></div>
                  Searching...
                </div>
              ) : suggestions.length > 0 ? (
                <div className="py-2">
                  <div className="px-4 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">Suggested Files</div>
                  {suggestions.map((doc) => (
                    <div
                      key={doc._id}
                      className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={async () => {
                        setShowSuggestions(false);
                        if (doc.isFolder) {
                          navigate('/documents'); // Ideally navigate directly to folder, but we can just go to documents for now
                          return;
                        }
                        try {
                          const res = await documentsAPI.preview(doc._id);
                          window.open(res.data.previewUrl, '_blank');
                        } catch (error) {
                          console.error('Preview failed', error);
                        }
                      }}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${doc.isFolder ? 'bg-blue-100 text-blue-600' : 'bg-blue-50 text-blue-600'}`}>
                        {doc.isFolder ? <Folder className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{doc.name}</p>
                      </div>
                    </div>
                  ))}
                  <div
                    className="mt-1 border-t border-gray-100 px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 cursor-pointer font-medium text-center transition-colors"
                    onClick={() => {
                      setShowSuggestions(false);
                      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
                    }}
                  >
                    View all results
                  </div>
                </div>
              ) : (
                <div className="p-4 text-center text-sm text-gray-500">
                  No documents found for "{searchQuery}"
                </div>
              )}
            </div>
          )}
        </form>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-2 sm:gap-4">
        {children}

        {/* Notifications */}
        <div className="relative" ref={dropdownRef}>
          <button
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors relative"
            title="Notifications"
            onClick={() => setShowDropdown(!showDropdown)}
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 border-2 border-white"></span>
              </span>
            )}
          </button>

          {showDropdown && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden z-50">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
                <h3 className="font-semibold text-sm text-gray-900">Notifications</h3>
                {unreadCount > 0 && (
                  <button className="text-xs font-medium text-blue-700 hover:text-blue-800" onClick={handleMarkAllAsRead}>
                    Mark all as read
                  </button>
                )}
              </div>
              <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                    <Bell className="w-8 h-8 mb-2 opacity-20" />
                    <p className="text-sm">No notifications yet</p>
                  </div>
                ) : (
                  notifications.slice(0, 5).map((notif) => (
                    <div
                      key={notif._id}
                      className={`flex gap-3 p-4 border-b border-gray-200 last:border-b-0 cursor-pointer transition-colors ${notif.isRead ? 'bg-white hover:bg-gray-50' : 'bg-blue-50 hover:bg-blue-100/50'}`}
                      onClick={() => !notif.isRead && handleMarkAsRead(notif._id)}
                    >
                      <div className="shrink-0 mt-0.5">
                        {getNotificationIcon(notif.type, notif.icon)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-gray-900 truncate">{notif.title}</h4>
                        <p className="text-xs text-gray-600 mt-1 break-words">{notif.message}</p>
                        <span className="text-[10px] font-medium text-gray-400 mt-2 block">
                          {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                      {!notif.isRead && (
                        <div className="shrink-0 w-2 h-2 rounded-full bg-blue-600 mt-1"></div>
                      )}
                    </div>
                  ))
                )}
              </div>
              <div className="p-2 border-t border-gray-200 bg-gray-50 text-center">
                <Link
                  to="/notifications"
                  className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors inline-block w-full py-1"
                  onClick={() => setShowDropdown(false)}
                >
                  View All Notifications
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* User Avatar */}
        <div className="w-8 h-8 rounded-full bg-blue-700 text-white flex items-center justify-center font-medium text-sm shadow-sm ml-2 cursor-pointer hover:ring-2 hover:ring-primary-100 transition-all">
          {user?.name?.charAt(0)?.toUpperCase() || 'U'}
        </div>
      </div>
    </header>
  );
};

export default Header;
