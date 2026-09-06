import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutGrid, Folder, CloudUpload, Star,
  Trash2, LogOut, ChevronLeft,
  HardDrive, UsersRound, Link2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Logo from '../Common/Logo';

const Sidebar = ({ isOpen, onToggle }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/dashboard', icon: LayoutGrid, label: 'Dashboard' },
    { to: '/documents', icon: Folder, label: 'My Documents' },
    { to: '/upload', icon: CloudUpload, label: 'Upload' },
    { to: '/favorites', icon: Star, label: 'Favorites' },
    { to: '/shared-with-me', icon: UsersRound, label: 'Shared with Me' },
    { to: '/shared-links', icon: Link2, label: 'Shared Links' },
    { to: '/trash', icon: Trash2, label: 'Trash' },
  ];

  // Calculate storage percentage
  const storagePercent = user
    ? ((user.storageUsed / user.storageLimit) * 100).toFixed(1)
    : 0;
  const storageUsedMB = user ? (user.storageUsed / (1024 * 1024)).toFixed(1) : 0;
  const storageLimitMB = user ? (user.storageLimit / (1024 * 1024)).toFixed(0) : 100;

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onToggle}
          />
        )}
      </AnimatePresence>

      <motion.aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 flex flex-col transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
          }`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
          <div className="flex items-center">
            <Logo variant="full" theme="light" size="sidebar" />
          </div>
          <button className="md:hidden text-gray-600 hover:text-gray-900" onClick={onToggle}>
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          <div className="px-3 mb-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Main Menu</p>
          </div>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              <item.icon className={`w-5 h-5`} />
              <span className="flex-1">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Storage Indicator */}
        <div className="p-4 border-t border-gray-200 mx-2 my-2 rounded-xl bg-gray-50">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-900 mb-3">
            <HardDrive className="w-4 h-4 text-blue-600" />
            Storage Usage
          </div>
          <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden mb-2">
            <div
              className="h-full bg-blue-600 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(storagePercent, 100)}%` }}
            />
          </div>
          <p className="text-xs text-gray-600 font-medium">
            {storageUsedMB} MB of {storageLimitMB} MB used
          </p>
        </div>

        {/* User Profile & Logout */}
        <div className="p-4 border-t border-gray-200 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-semibold text-sm shrink-0">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900 truncate">{user?.name || 'User'}</p>
              <p className="text-xs text-gray-600 truncate">{user?.email || ''}</p>
            </div>
          </div>
          <button
            className="p-2 text-gray-600 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
            onClick={handleLogout}
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </motion.aside>
    </>
  );
};

export default Sidebar;
