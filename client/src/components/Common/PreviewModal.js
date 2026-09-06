import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Download, Share2, Star, ExternalLink, 
  ZoomIn, ZoomOut, RotateCw, Maximize, Minimize,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { getFileIcon, getFileIconColor, formatFileSize, formatFileType } from '../../utils/fileHelpers';
import axios from 'axios';

const PreviewModal = ({ previewDoc, previewUrl, onClose, onDownload, onShare, onFavorite }) => {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [textContent, setTextContent] = useState('');
  const [textLoading, setTextLoading] = useState(false);
  const [textError, setTextError] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (previewDoc?.fileType === 'text') {
      setTextLoading(true);
      setTextError(false);
      axios.get(previewUrl, { responseType: 'text' })
        .then(res => {
          setTextContent(res.data);
          setTextLoading(false);
        })
        .catch(err => {
          console.error('Error fetching text preview', err);
          setTextError(true);
          setTextLoading(false);
        });
    }
    
    // Reset states on doc change
    setScale(1);
    setRotation(0);
  }, [previewDoc, previewUrl]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!previewDoc) return null;

  const isImage = ['image', 'images'].includes(previewDoc.fileType);
  const isOffice = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'spreadsheet', 'presentation'].includes(previewDoc.fileType);
  
  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.5, 4));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.5, 0.5));
  const handleRotate = () => setRotation(prev => prev + 90);
  
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(err => console.error(err));
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleWheel = (e) => {
    if (!isImage) return;
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      if (e.deltaY < 0) {
        handleZoomIn();
      } else {
        handleZoomOut();
      }
    }
  };

  const renderContent = () => {
    if (isImage) {
      return (
        <div 
          className="relative w-full h-full flex items-center justify-center overflow-hidden"
          onWheel={handleWheel}
          onDoubleClick={() => setScale(scale > 1 ? 1 : 2)}
        >
          <motion.img 
            src={previewUrl} 
            alt={previewDoc.name} 
            drag
            dragConstraints={containerRef}
            dragElastic={0.1}
            animate={{ scale, rotate: rotation }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="max-w-full max-h-full object-contain cursor-grab active:cursor-grabbing origin-center"
            style={{ touchAction: 'none' }}
          />
        </div>
      );
    }
    
    if (previewDoc.fileType === 'pdf') {
      return (
        <object data={previewUrl} type="application/pdf" className="w-full h-full bg-gray-100 rounded-lg shadow-2xl">
          <iframe src={previewUrl} className="w-full h-full border-0" title="PDF Preview" />
        </object>
      );
    }

    if (previewDoc.fileType === 'video') {
      return (
        <div className="w-full h-full flex items-center justify-center">
          <video src={previewUrl} controls className="max-w-full max-h-full rounded-lg shadow-xl bg-black" />
        </div>
      );
    }

    if (previewDoc.fileType === 'audio') {
      return (
        <div className="w-full h-full flex items-center justify-center">
          <div className="w-full max-w-md p-8 bg-gray-900 rounded-2xl shadow-2xl border border-gray-800 flex flex-col items-center">
            <div className="w-24 h-24 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center mb-8">
              {getFileIcon('audio')}
            </div>
            <audio src={previewUrl} controls className="w-full" />
          </div>
        </div>
      );
    }

    if (previewDoc.fileType === 'text') {
      if (textLoading) {
        return (
          <div className="w-full h-full flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
        );
      }
      if (textError) {
        return (
          <div className="text-red-400 flex flex-col items-center justify-center h-full gap-4">
            <AlertCircle className="w-12 h-12" />
            <p>Failed to load text content.</p>
          </div>
        );
      }
      
      const lines = textContent.split('\n');
      return (
        <div className="w-full h-full max-w-5xl mx-auto bg-[#1e1e1e] rounded-xl shadow-2xl border border-gray-800 overflow-hidden flex flex-col text-left">
          <div className="bg-[#2d2d2d] px-4 py-2 border-b border-gray-800 flex items-center gap-2 shrink-0">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <div className="w-3 h-3 rounded-full bg-amber-500"></div>
            <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
            <span className="ml-2 text-xs font-mono text-gray-400">{previewDoc.name}</span>
          </div>
          <div className="flex-1 overflow-auto p-4 text-sm font-mono leading-relaxed text-gray-300">
            <table className="w-full">
              <tbody>
                {lines.map((line, i) => (
                  <tr key={i} className="hover:bg-white/5">
                    <td className="pr-4 text-right select-none text-gray-600 w-12 border-r border-gray-800 align-top">{i + 1}</td>
                    <td className="pl-4 whitespace-pre-wrap break-words">{line || ' '}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    if (isOffice) {
      // Microsoft Office Online Viewer
      const officeUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(previewUrl)}`;
      return (
        <div className="w-full h-full relative bg-white rounded-lg overflow-hidden shadow-2xl">
          <iframe 
            src={officeUrl} 
            title={previewDoc.name} 
            className="w-full h-full border-0 relative z-10" 
            onError={(e) => e.target.style.display = 'none'}
          />
          {/* Fallback underneath iframe */}
          <div className="absolute inset-0 z-0 flex flex-col items-center justify-center text-center p-8 bg-gray-900 rounded-lg">
            <AlertCircle className="w-16 h-16 text-amber-500 mb-4" />
            <h4 className="text-xl font-semibold text-white mb-2">Preview Unavailable</h4>
            <p className="text-gray-400 mb-6 max-w-sm">
              This document cannot be previewed automatically. Please download to view.
            </p>
            <button className="btn btn-primary bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg flex items-center gap-2" onClick={() => onDownload(previewDoc)}>
              <Download className="w-5 h-5" /> Download File
            </button>
          </div>
        </div>
      );
    }

    // Default Fallback
    return (
      <div className="flex flex-col items-center justify-center text-center p-8 bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full border border-gray-800">
        <div 
          className="w-24 h-24 rounded-2xl flex items-center justify-center mb-6 shadow-inner"
          style={{ backgroundColor: `${getFileIconColor(previewDoc.fileType)}20`, color: getFileIconColor(previewDoc.fileType) }}
        >
          {getFileIcon(previewDoc.fileType)}
        </div>
        <h4 className="text-xl font-semibold text-white mb-2 truncate w-full">{previewDoc.originalName || previewDoc.name}</h4>
        <p className="text-sm text-gray-400 mb-8">
          {formatFileSize(previewDoc.size)} &middot; <span className="capitalize">{formatFileType(previewDoc.fileType)}</span>
        </p>
        <button className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg" onClick={() => onDownload(previewDoc)}>
          <Download className="w-5 h-5" /> Download File
        </button>
      </div>
    );
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] flex flex-col bg-black/90 backdrop-blur-md"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        ref={containerRef}
      >
        {/* Top Header Toolbar */}
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/80 to-transparent z-10 shrink-0">
          <div className="flex items-center gap-4 text-white min-w-0">
            <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
              {getFileIcon(previewDoc.fileType)}
            </div>
            <div className="flex flex-col min-w-0">
              <h3 className="font-semibold text-base truncate pr-4" title={previewDoc.name}>{previewDoc.name}</h3>
              <p className="text-xs text-gray-400 truncate">
                {formatFileSize(previewDoc.size)} &middot; {format(new Date(previewDoc.createdAt), 'MMM d, yyyy')}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 shrink-0">
            {onFavorite && (
              <button 
                className="p-2.5 text-gray-300 hover:text-amber-400 hover:bg-white/10 rounded-full transition-colors" 
                onClick={() => onFavorite(previewDoc)}
                title={previewDoc.isFavorite ? "Remove from Favorites" : "Add to Favorites"}
              >
                <Star className={`w-5 h-5 ${previewDoc.isFavorite ? 'fill-amber-400 text-amber-400' : ''}`} />
              </button>
            )}
            
            {onShare && (
              <button 
                className="p-2.5 text-gray-300 hover:text-white hover:bg-white/10 rounded-full transition-colors" 
                onClick={() => onShare(previewDoc)}
                title="Share"
              >
                <Share2 className="w-5 h-5" />
              </button>
            )}
            
            <button 
              className="p-2.5 text-gray-300 hover:text-white hover:bg-white/10 rounded-full transition-colors" 
              onClick={() => onDownload(previewDoc)}
              title="Download"
            >
              <Download className="w-5 h-5" />
            </button>
            
            <a 
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2.5 text-gray-300 hover:text-white hover:bg-white/10 rounded-full transition-colors" 
              title="Open in New Tab"
            >
              <ExternalLink className="w-5 h-5" />
            </a>

            <div className="w-px h-6 bg-gray-700 mx-2" />

            <button 
              className="p-2.5 text-gray-300 hover:text-red-400 hover:bg-white/10 rounded-full transition-colors" 
              onClick={onClose}
              title="Close"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
        
        {/* Main Preview Area */}
        <div className="flex-1 overflow-hidden relative flex items-center justify-center p-4 sm:p-8">
          {renderContent()}
        </div>

        {/* Floating Context Toolbar (Images) */}
        {isImage && (
          <motion.div 
            className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 bg-gray-900/80 backdrop-blur-lg border border-gray-700 rounded-2xl shadow-2xl"
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <button className="p-2.5 text-gray-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors" onClick={handleZoomOut} title="Zoom Out">
              <ZoomOut className="w-5 h-5" />
            </button>
            <div className="px-2 text-sm font-medium text-white select-none">{Math.round(scale * 100)}%</div>
            <button className="p-2.5 text-gray-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors" onClick={handleZoomIn} title="Zoom In">
              <ZoomIn className="w-5 h-5" />
            </button>
            <div className="w-px h-5 bg-gray-700 mx-1" />
            <button className="p-2.5 text-gray-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors" onClick={handleRotate} title="Rotate">
              <RotateCw className="w-5 h-5" />
            </button>
            <button className="p-2.5 text-gray-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors" onClick={toggleFullscreen} title="Fullscreen">
              {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            </button>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default PreviewModal;
