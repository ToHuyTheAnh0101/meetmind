import React, { useState } from 'react';
import { X, Mail, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface EmailTagInputProps {
  emails: string[];
  onChange: (emails: string[]) => void;
}

const EmailTagInput: React.FC<EmailTagInputProps> = ({ emails, onChange }) => {
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const addEmail = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;

    if (!validateEmail(trimmed)) {
      setError('Invalid email address');
      return;
    }

    if (emails.includes(trimmed)) {
      setError('Email already added');
      return;
    }

    onChange([...emails, trimmed]);
    setInputValue('');
    setError(null);
  };

  const removeEmail = (email: string) => {
    onChange(emails.filter(e => e !== email));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addEmail();
    }
  };

  return (
    <div className="space-y-3">
      <div className="relative group">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-cyan-600 transition-colors">
          <Mail className="h-4 w-4" />
        </div>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            if (error) setError(null);
          }}
          onKeyDown={handleKeyDown}
          onBlur={addEmail}
          placeholder="Add participants by email..."
          className="w-full h-12 pl-11 pr-4 rounded-2xl bg-white/40 border border-slate-200 focus:bg-white/60 focus:border-cyan-200 focus:outline-none transition-all text-sm font-bold text-slate-900 placeholder:text-slate-400"
        />
      </div>

      <AnimatePresence mode="popLayout">
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 text-[11px] font-bold uppercase tracking-widest"
          >
            <AlertCircle className="h-3 w-3" />
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-wrap gap-2 max-h-[120px] overflow-y-auto pr-2 custom-scrollbar">
        <AnimatePresence>
          {emails.map((email) => (
            <motion.span
              key={email}
              layout
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-full bg-white border border-slate-300 shadow-sm transition-all hover:border-cyan-300 group"
            >
              <span className="text-[12px] font-bold text-slate-700">{email}</span>
              <button
                type="button"
                onClick={() => removeEmail(email)}
                className="p-1 rounded-full hover:bg-rose-50 hover:text-rose-600 text-slate-400 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </motion.span>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default EmailTagInput;
