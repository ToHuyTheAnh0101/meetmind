import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  maxWidthClassName?: string;
  containerClassName?: string;
  backdropClassName?: string;
  children: React.ReactNode;
}

export const BaseModal: React.FC<BaseModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  maxWidthClassName = 'max-w-lg',
  containerClassName = 'bg-[#0f1115] rounded-[2.5rem] border border-white/10 text-white',
  backdropClassName = 'bg-slate-900/40 backdrop-blur-sm',
  children,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className={`absolute inset-0 ${backdropClassName}`}
          />

          {/* Modal Box */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className={`relative w-full ${maxWidthClassName} ${containerClassName} shadow-2xl flex flex-col overflow-hidden z-10`}
          >
            {/* Header */}
            {title && (
              <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between bg-white/5">
                <div className="flex items-center gap-4">
                  {icon}
                  <div>
                    <h3 className="text-xl font-semibold leading-tight">{title}</h3>
                    {subtitle && (
                      <p className="text-[13px] font-medium text-slate-400 mt-1">{subtitle}</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2.5 rounded-xl hover:bg-white/5 text-slate-500 hover:text-white transition-all cursor-pointer shrink-0"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            )}

            {/* Content Body */}
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default BaseModal;
