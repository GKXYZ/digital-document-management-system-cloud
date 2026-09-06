import React, { useState } from 'react';
import { documentsAPI, foldersAPI } from '../services/api';
import MainLayout from '../components/Layout/MainLayout';
import PreviewModal from '../components/Common/PreviewModal';
import { toast } from 'react-toastify';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import {
  Search as SearchIcon, Download, ChevronLeft, ChevronRight, FileText, Folder
} from 'lucide-react';
import { getFileIcon, getFileIconColor, formatFileSize, formatFileType } from '../utils/fileHelpers';
import { useSearchParams, useNavigate } from 'react-router-dom';

const Search = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';

  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const performSearch = async (searchQuery, pageNum = 1) => {
    setLoading(true);
    setSearched(true);
    try {
      const [docsRes, foldersRes] = await Promise.all([
        documentsAPI.getAll({ search: searchQuery.trim(), page: pageNum, limit: 12 }),
        foldersAPI.getAll({ search: searchQuery.trim() }) // Fetch all matching folders for simplicity
      ]);
      const foldersList = (foldersRes.data.folders || []).map(f => ({ ...f, isFolder: true }));
      const docsList = docsRes.data.documents || [];

      // Combine folders first, then docs
      setResults([...foldersList, ...docsList]);
      setTotalPages(docsRes.data.totalPages || 1);
    } catch (error) {
      toast.error('Unable to search documents. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Run search when query param changes
  React.useEffect(() => {
    setPage(1);
    if (query.trim()) {
      performSearch(query, 1);
    } else {
      setResults([]);
      setSearched(false);
    }
  }, [query]);

  // Handle page changes
  React.useEffect(() => {
    if (searched && query.trim()) {
      performSearch(query, page);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const handleDownload = async (doc, e) => {
    if (e) e.stopPropagation();
    try {
      const res = await documentsAPI.download(doc._id);
      window.open(res.data.downloadUrl, '_blank');
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

  return (
    <MainLayout title="Search Results">
      <div className="space-y-6">
        {query && (
          <div className="pb-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">
              Results for "{query}"
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Searching across all your documents
            </p>
          </div>
        )}

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center p-3 gap-4 bg-white border border-gray-200 rounded-xl animate-pulse">
                <div className="w-12 h-12 bg-gray-200 rounded-xl shrink-0"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                  <div className="h-3 bg-gray-100 rounded w-1/4"></div>
                </div>
              </div>
            ))}
          </div>
        ) : searched && results.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 bg-white border border-gray-200 border-dashed rounded-2xl">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 mb-6">
              <SearchIcon className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">🔍 No documents found</h3>
            <p className="text-gray-600 text-sm">Try another keyword or upload a new document.</p>
          </div>
        ) : !searched ? (
          <div className="flex flex-col items-center justify-center py-24 bg-white border border-gray-200 border-dashed rounded-2xl">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 mb-6">
              <FileText className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Search your documents</h3>
            <p className="text-gray-600 text-sm">Type in the global search bar to begin.</p>
          </div>
        ) : (
          <motion.div
            className="space-y-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {results.map((item, index) => (
              <motion.div
                key={item._id}
                className="group cursor-pointer bg-white border border-gray-200 rounded-xl transition-all duration-200 hover:border-blue-300 hover:shadow-md flex items-center p-3 gap-4"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => {
                  if (item.isFolder) {
                    navigate('/documents'); // Simplified for now since we don't have deeply linked folder routes via URL easily
                  } else {
                    handlePreview(item);
                  }
                }}
              >
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${item.isFolder ? 'bg-blue-100 text-blue-600' : ''}`}
                  style={!item.isFolder ? {
                    color: getFileIconColor(item.fileType),
                    backgroundColor: `${getFileIconColor(item.fileType)}15`,
                  } : {}}
                >
                  {item.isFolder ? <Folder className="w-6 h-6" /> : getFileIcon(item.fileType)}
                </div>

                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-gray-900 truncate mb-1">{item.name}</h4>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs font-medium text-gray-600">
                      {item.isFolder ? 'Folder' : formatFileSize(item.size)} &middot; {format(new Date(item.createdAt), 'MMM d, yyyy')}
                    </p>
                    {!item.isFolder && (item.fileType || item.tags?.length > 0) && (
                      <div className="hidden sm:flex items-center gap-1.5 ml-2 border-l border-gray-200 pl-2">
                        {item.fileType && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-800 uppercase">
                            {formatFileType(item.fileType)}
                          </span>
                        )}
                        {item.tags?.map((tag) => (
                          <span key={tag} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md text-[10px] font-semibold uppercase tracking-wider border border-primary-100">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  {!item.isFolder && (
                    <button
                      className="p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 rounded-lg transition-colors"
                      onClick={(e) => handleDownload(item, e)}
                      title="Download"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {!loading && searched && totalPages > 1 && (
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
          onDownload={handleDownload}
        />
      </div>
    </MainLayout>
  );
};

export default Search;
