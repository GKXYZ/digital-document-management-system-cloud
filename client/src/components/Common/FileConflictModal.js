import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, Replace, Copy, FilePlus } from 'lucide-react';

const FileConflictModal = ({ isOpen, fileName, onSelectOption, onCancel }) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onCancel}
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-md bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] overflow-hidden flex flex-col"
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              File already exists
            </h3>
            <button
              onClick={onCancel}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6">
            <p className="text-sm text-gray-600 mb-6">
              A file named <span className="font-semibold text-gray-900">"{fileName}"</span> already exists in this folder. What would you like to do?
            </p>

            <div className="space-y-3">
              <button
                onClick={() => onSelectOption('replace')}
                className="w-full flex items-center gap-4 p-4 text-left border border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all group"
              >
                <div className="w-10 h-10 bg-gray-100 group-hover:bg-blue-100 rounded-full flex items-center justify-center shrink-0 transition-colors">
                  <Replace className="w-5 h-5 text-gray-600 group-hover:text-blue-600" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 group-hover:text-blue-700">Replace existing file</h4>
                  <p className="text-xs text-gray-500 mt-0.5">Overwrites the file completely (no history)</p>
                </div>
              </button>

              <button
                onClick={() => onSelectOption('version')}
                className="w-full flex items-center gap-4 p-4 text-left border border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all group"
              >
                <div className="w-10 h-10 bg-gray-100 group-hover:bg-blue-100 rounded-full flex items-center justify-center shrink-0 transition-colors">
                  <FilePlus className="w-5 h-5 text-gray-600 group-hover:text-blue-600" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 group-hover:text-blue-700">Upload as a new version</h4>
                  <p className="text-xs text-gray-500 mt-0.5">Preserves old file in version history</p>
                </div>
              </button>

              <button
                onClick={() => onSelectOption('keep_both')}
                className="w-full flex items-center gap-4 p-4 text-left border border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all group"
              >
                <div className="w-10 h-10 bg-gray-100 group-hover:bg-blue-100 rounded-full flex items-center justify-center shrink-0 transition-colors">
                  <Copy className="w-5 h-5 text-gray-600 group-hover:text-blue-600" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 group-hover:text-blue-700">Keep both files</h4>
                  <p className="text-xs text-gray-500 mt-0.5">Saves new file with a number suffix (1)</p>
                </div>
              </button>
            </div>
          </div>

          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end">
            <button
              onClick={onCancel}
              className="px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-full transition-colors"
            >
              Cancel
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default FileConflictModal;
