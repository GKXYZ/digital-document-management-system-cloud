import React, { useState, useEffect, useCallback } from 'react';
import MainLayout from '../components/Layout/MainLayout';
import { notificationsAPI } from '../services/api';
import { useNotificationContext } from '../context/NotificationContext';
import { formatDistanceToNow, isToday, isYesterday, format } from 'date-fns';
import { Search, X, CheckCircle2, Trash2 } from 'lucide-react';
import * as Icons from 'lucide-react';

const Notifications = () => {
  const { markAsRead, markAllAsRead, deleteNotification, triggerUpdate } = useNotificationContext();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const filters = [
    { id: 'all', label: 'All' },
    { id: 'unread', label: 'Unread' },
    { id: 'sharing', label: 'Sharing' },
    { id: 'files', label: 'Files' },
    { id: 'storage', label: 'Storage' },
    { id: 'security', label: 'Security' },
  ];

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchPage = useCallback(async (pageNum, currentFilter, currentSearch, isAppend = false) => {
    try {
      if (!isAppend) setLoading(true);

      const res = await notificationsAPI.getAll({
        page: pageNum,
        limit: 20,
        filter: currentFilter,
        search: currentSearch
      });

      if (res.data.success) {
        if (isAppend) {
          setNotifications(prev => [...prev, ...res.data.notifications]);
        } else {
          setNotifications(res.data.notifications);
        }
        setTotalPages(res.data.totalPages);
        setHasMore(pageNum < res.data.totalPages);
      }
    } catch (error) {
      console.error('Failed to fetch notifications', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch when filter or search changes
  useEffect(() => {
    setPage(1);
    fetchPage(1, filter, debouncedSearch, false);
  }, [filter, debouncedSearch, fetchPage]);

  const loadMore = () => {
    if (!loading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchPage(nextPage, filter, debouncedSearch, true);
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    await deleteNotification(id);
    setNotifications(prev => prev.filter(n => n._id !== id));
  };

  const handleMarkAsRead = async (id, e) => {
    if (e) e.stopPropagation();
    await markAsRead(id);
    setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
  };

  const handleMarkAll = async () => {
    await markAllAsRead();
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    triggerUpdate();
  };

  const getNotificationIcon = (type, iconName) => {
    if (iconName && Icons[iconName]) {
      const IconComp = Icons[iconName];
      let colorClass = "text-blue-600 bg-blue-100";
      if (type === 'success' || type === 'file_restored') colorClass = "text-green-600 bg-green-100";
      else if (type === 'warning' || type === 'storage_warning') colorClass = "text-orange-600 bg-orange-100";
      else if (type === 'error') colorClass = "text-red-600 bg-red-100";
      else if (type === 'share_received' || type === 'permission_changed') colorClass = "text-purple-600 bg-purple-100";

      return (
        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${colorClass}`}>
          <IconComp className="w-5 h-5" />
        </div>
      );
    }

    // Fallback
    return (
      <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-blue-100 text-blue-600">
        <Icons.Bell className="w-5 h-5" />
      </div>
    );
  };

  const groupNotifications = (notifs) => {
    const groups = {
      today: [],
      yesterday: [],
      earlier: []
    };

    notifs.forEach(notif => {
      const date = new Date(notif.createdAt);
      if (isToday(date)) {
        groups.today.push(notif);
      } else if (isYesterday(date)) {
        groups.yesterday.push(notif);
      } else {
        groups.earlier.push(notif);
      }
    });

    return groups;
  };

  const grouped = groupNotifications(notifications);

  const renderGroup = (title, items) => {
    if (items.length === 0) return null;

    return (
      <div className="mb-8">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 px-2">
          {title}
        </h3>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {items.map((notif, index) => (
            <div
              key={notif._id}
              onClick={() => !notif.isRead && handleMarkAsRead(notif._id)}
              className={`flex items-start gap-4 p-4 border-b border-gray-100 last:border-b-0 transition-colors cursor-pointer hover:bg-gray-50 ${notif.isRead ? 'bg-white' : 'bg-blue-50/50'
                }`}
            >
              {getNotificationIcon(notif.type, notif.icon)}
              <div className="flex-1 min-w-0 pt-0.5">
                <div className="flex justify-between items-start mb-1">
                  <h4 className="text-sm font-medium text-gray-900 truncate pr-4">{notif.title}</h4>
                  <span className="text-xs font-medium text-gray-500 whitespace-nowrap">
                    {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-sm text-gray-600 line-clamp-2 mb-2">{notif.message}</p>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <span>{format(new Date(notif.createdAt), "MMM d, yyyy 'at' h:mm a")}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 md:opacity-100">
                {!notif.isRead ? (
                  <button
                    onClick={(e) => handleMarkAsRead(notif._id, e)}
                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors tooltip"
                    title="Mark as read"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                ) : (
                  <div className="w-7 h-7"></div> // spacer
                )}
                <button
                  onClick={(e) => handleDelete(notif._id, e)}
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors tooltip"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <MainLayout title="Notifications">
      <div className="max-w-4xl mx-auto py-6 pb-12">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 px-2">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
            {filters.map(f => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${filter === f.id
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search notifications..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full md:w-64 pl-9 pr-8 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <button
              onClick={handleMarkAll}
              className="text-sm font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-4 py-1.5 rounded-lg transition-colors whitespace-nowrap"
            >
              Mark all read
            </button>
          </div>
        </div>

        {/* Content Section */}
        {loading && notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin mb-4"></div>
            <p>Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400 bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
              <Icons.BellOff className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-lg font-medium text-gray-900 mb-1">All caught up!</p>
            <p className="text-sm">You have no {filter !== 'all' ? filter : ''} notifications to show.</p>
          </div>
        ) : (
          <div>
            {renderGroup('Today', grouped.today)}
            {renderGroup('Yesterday', grouped.yesterday)}
            {renderGroup('Earlier', grouped.earlier)}

            {hasMore && (
              <div className="flex justify-center mt-6">
                <button
                  onClick={loadMore}
                  disabled={loading}
                  className="px-6 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Loading...' : 'Load More'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Notifications;
