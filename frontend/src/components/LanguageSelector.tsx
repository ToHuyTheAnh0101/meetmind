import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { US, VN } from 'country-flag-icons/react/3x2';

const languages = [
  {
    code: 'vi',
    name: 'Tiếng Việt',
    Flag: VN,
  },
  {
    code: 'en',
    name: 'English',
    Flag: US,
  },
];

const LanguageSelector: React.FC = () => {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLanguage = languages.find((lang) => lang.code === i18n.language) || languages[0];
  const CurrentFlag = currentLanguage.Flag;

  const handleLanguageChange = (code: string) => {
    i18n.changeLanguage(code);
    localStorage.setItem('i18nextLng', code);
    setIsOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/50 px-2.5 py-1.5 backdrop-blur-sm transition-all hover:border-cyan-200 hover:bg-white active:scale-95 shadow-sm"
      >
        <div className="flex h-5 w-7 overflow-hidden rounded-[4px] shadow-sm ring-1 ring-slate-200">
          <CurrentFlag className="h-full w-full object-cover" />
        </div>
        <span className="text-xs font-bold text-slate-600 uppercase tracking-tight">{currentLanguage.code}</span>
        <ChevronDown
          className={`h-3 w-3 text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="absolute right-0 mt-2 w-48 overflow-hidden rounded-2xl border border-white/40 bg-white/80 p-1.5 shadow-xl backdrop-blur-2xl"
          >
            {languages.map((lang) => {
              const Icon = lang.Flag;
              return (
                <button
                  key={lang.code}
                  onClick={() => handleLanguageChange(lang.code)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition-all ${
                    i18n.language === lang.code
                      ? 'bg-cyan-50 text-cyan-700'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <div className="flex h-4 w-6 overflow-hidden rounded-[3px] shadow-sm ring-1 ring-slate-100">
                    <Icon className="h-full w-full object-cover" />
                  </div>
                  <span>{lang.name}</span>
                  {i18n.language === lang.code && (
                    <div className="ml-auto h-1.5 w-1.5 rounded-full bg-cyan-500" />
                  )}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LanguageSelector;
