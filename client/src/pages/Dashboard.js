import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { documentsAPI } from '../services/api';
import MainLayout from '../components/Layout/MainLayout';
import PreviewModal from '../components/Common/PreviewModal';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import {
  Folder, CloudUpload, Star, Trash2,
  FileText, ArrowUpRight, Clock
} from 'lucide-react';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { format } from 'date-fns';
import { getFileIcon, getFileIconColor, formatFileSize, formatFileType } from '../utils/fileHelpers';

ChartJS.register(ArcElement, Tooltip, Legend);

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [recentDocs, setRecentDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');

  const fetchDashboardData = useCallback(async () => {
    try {
      const [statsRes, docsRes] = await Promise.all([
        documentsAPI.getStats(),
        documentsAPI.getAll({ limit: 5, sort: '-createdAt' }),
      ]);
      setStats(statsRes.data.stats);
      setRecentDocs(docsRes.data.documents);
    } catch (error) {
      console.error('Dashboard fetch error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleDownload = async (doc, e) => {
    if (e) e.stopPropagation();
    try {
      const res = await documentsAPI.download(doc._id);
      window.open(res.data.downloadUrl, '_blank');
      toast.success(`Downloading ${doc.originalName || doc.name}`);
    } catch (error) {
      toast.error('Download failed');
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

  // Chart data
  const chartData = stats?.breakdown?.length > 0
    ? {
      labels: stats.breakdown.map((t) => t.type || 'Other'),
      datasets: [
        {
          data: stats.breakdown.map((t) => t.size),
          backgroundColor: stats.breakdown.map((t) => getFileIconColor((t.type || 'Other').toLowerCase())),
          borderWidth: 0,
          hoverOffset: 4,
        },
      ],
    }
    : null;

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '75%',
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: '#ffffff',
        titleColor: '#1f2937',
        bodyColor: '#4b5563',
        borderColor: '#e5e7eb',
        borderWidth: 1,
        titleFont: { family: 'Inter' },
        bodyFont: { family: 'Inter' },
        padding: 12,
        boxPadding: 6,
        callbacks: {
          label: (ctx) => ` ${formatFileSize(ctx.raw)}`,
        },
      },
    },
  };

  const statCards = [
    {
      label: 'Total Documents',
      value: stats?.totalDocuments || 0,
      icon: Folder,
      color: 'text-blue-700',
      bgColor: 'bg-blue-50',
      link: '/documents',
    },
    {
      label: 'Recent Uploads',
      value: stats?.recentUploads || 0,
      icon: CloudUpload,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50',
      link: '/upload',
    },
    {
      label: 'Favorites',
      value: stats?.favoriteCount || 0,
      icon: Star,
      color: 'text-orange-500',
      bgColor: 'bg-orange-50',
      link: '/favorites',
    },
    {
      label: 'In Trash',
      value: stats?.trashCount || 0,
      icon: Trash2,
      color: 'text-red-500',
      bgColor: 'bg-red-50',
      link: '/trash',
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
  };

  if (loading) {
    return (
      <MainLayout title="Dashboard">
        <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
          <div className="w-10 h-10 border-4 border-gray-200 border-t-primary-500 rounded-full animate-spin mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Dashboard" subtitle={`Welcome back, ${user?.name?.split(' ')[0] || 'User'}!`}>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="space-y-6"
      >
        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {statCards.map((card, index) => (
            <motion.div key={card.label} variants={itemVariants}>
              <Link to={card.link} className="block group bg-white rounded-xl p-5 border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200">
                <div className="flex justify-between items-start mb-4">
                  <div className={`w-12 h-12 rounded-lg ${card.bgColor} ${card.color} flex items-center justify-center`}>
                    <card.icon className="w-6 h-6" />
                  </div>
                  <ArrowUpRight className="w-5 h-5 text-gray-300 group-hover:text-blue-600 transition-colors" />
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-1">{card.value}</div>
                <div className="text-sm font-medium text-gray-600">{card.label}</div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Bottom Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Recent Documents */}
          <motion.div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm p-5 md:p-6" variants={itemVariants}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-600" />
                Recent Documents
              </h3>
              <Link to="/documents" className="text-sm font-medium text-blue-700 hover:text-blue-800 bg-blue-50 px-3 py-1.5 rounded-lg transition-colors">
                View All
              </Link>
            </div>

            {recentDocs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 text-gray-400">
                  <CloudUpload className="w-8 h-8" />
                </div>
                <p className="text-gray-900 font-medium mb-1">No documents yet</p>
                <p className="text-gray-600 text-sm mb-4">Upload your first file to get started.</p>
                <Link to="/upload" className="btn btn-primary">
                  Upload File
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {recentDocs.map((doc) => (
                  <div key={doc._id} className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-lg transition-colors border border-transparent hover:border-gray-200 cursor-pointer group" onClick={() => handlePreview(doc)}>
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                      style={{ color: getFileIconColor(doc.fileType), backgroundColor: `${getFileIconColor(doc.fileType)}15` }}
                    >
                      {getFileIcon(doc.fileType)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-blue-700 transition-colors">{doc.name}</p>
                      <p className="text-xs text-gray-600 mt-0.5">
                        {formatFileSize(doc.size)} &middot; {format(new Date(doc.createdAt), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {formatFileType(doc.fileType)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Storage Chart */}
          <motion.div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 md:p-6 flex flex-col" variants={itemVariants}>
            <div className="mb-6">
              <h3 className="text-lg font-bold text-gray-900">Storage Overview</h3>
            </div>

            <div className="flex-1 flex flex-col">
              {chartData ? (
                <>
                  <div className="relative h-48 w-full flex items-center justify-center mb-6">
                    <Doughnut data={chartData} options={chartOptions} />
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-3xl font-bold text-gray-900">
                        {stats?.storagePercentage || 0}%
                      </span>
                      <span className="text-xs font-medium text-gray-600 uppercase tracking-wider mt-1">Used</span>
                    </div>
                  </div>

                  {stats?.breakdown?.length > 0 && (
                    <div className="space-y-3 mt-auto pt-4 border-t border-gray-200">
                      {stats.breakdown.map((t) => (
                        <div key={t.type} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-3 h-3 rounded-full"
                              style={{ background: getFileIconColor((t.type || 'Other').toLowerCase()) }}
                            ></span>
                            <span className="font-medium text-gray-900">{formatFileType(t.type)}</span>
                          </div>
                          <span className="text-gray-600 font-medium">
                            {formatFileSize(t.size)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 text-gray-400">
                    <FileText className="w-8 h-8" />
                  </div>
                  <p className="text-gray-600">No storage data yet</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </motion.div>

      <PreviewModal
        previewDoc={previewDoc}
        previewUrl={previewUrl}
        onClose={() => {
          setPreviewDoc(null);
          setPreviewUrl('');
        }}
        onDownload={handleDownload}
      />
    </MainLayout>
  );
};

export default Dashboard;
