import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}

const ConfirmEndBreakoutModal: React.FC<Props> = ({ isOpen, onClose, onConfirm, title, message }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-md overflow-hidden rounded-3xl bg-slate-900 border border-white/10 shadow-2xl"
          >
            <div className="p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-500">
                  <AlertCircle size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">{title}</h3>
                  <p className="text-sm text-slate-400 mt-1">{message}</p>
                </div>
              </div>

              <div className="flex gap-3 mt-8">
                <button
                  onClick={onClose}
                  className="flex-1 py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-sm transition-all border border-white/5"
                >
                  Hủy bỏ
                </button>
                <button
                  onClick={() => {
                    onConfirm();
                    onClose();
                  }}
                  className="flex-1 py-3 px-4 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-bold text-sm transition-all shadow-lg shadow-rose-500/20"
                >
                  Xác nhận kết thúc
                </button>
              </div>
            </div>

            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-slate-500 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ConfirmEndBreakoutModal;
