import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Trash2, Info, AlertCircle } from 'lucide-react';

const ConfirmationModal = ({
  isOpen,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger', // 'danger', 'warning', 'info'
  loading = false,
  onConfirm,
  onCancel,
  error = null
}) => {
  if (!isOpen) return null;

  // Set colors/icons based on variant
  const config = {
    danger: {
      icon: <Trash2 className="w-6 h-6 text-red-600" />,
      iconBg: 'bg-red-100',
      buttonBg: 'bg-red-600 hover:bg-red-700',
      buttonText: 'text-white',
    },
    warning: {
      icon: <AlertTriangle className="w-6 h-6 text-orange-600" />,
      iconBg: 'bg-orange-100',
      buttonBg: 'bg-orange-600 hover:bg-orange-700',
      buttonText: 'text-white',
    },
    info: {
      icon: <Info className="w-6 h-6 text-blue-600" />,
      iconBg: 'bg-blue-100',
      buttonBg: 'bg-blue-600 hover:bg-blue-700',
      buttonText: 'text-white',
    }
  };

  const currentConfig = config[variant] || config.danger;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-50"
            onClick={!loading ? onCancel : undefined}
          />

          {/* Modal Container */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-[420px] overflow-hidden pointer-events-auto"
            >
              <div className="p-6">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-full shrink-0 ${currentConfig.iconBg}`}>
                    {currentConfig.icon}
                  </div>

                  <div className="flex-1 mt-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-2">
                      {title}
                    </h3>
                    <p className="text-sm text-gray-600 leading-relaxed mb-4">
                      {description}
                    </p>

                    {error && (
                      <div className="flex items-start gap-2 p-3 mb-4 rounded-lg bg-red-50 text-red-600 text-sm">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <p>{error}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 mt-2">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={onCancel}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-colors disabled:opacity-50"
                  >
                    {cancelText}
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={onConfirm}
                    className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors disabled:opacity-70 ${currentConfig.buttonBg} ${currentConfig.buttonText}`}
                  >
                    {loading ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Deleting...
                      </>
                    ) : (
                      <>
                        {variant === 'danger' && <Trash2 className="w-4 h-4" />}
                        {confirmText}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ConfirmationModal;
