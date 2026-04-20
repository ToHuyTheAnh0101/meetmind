import React from 'react';
import { motion } from 'framer-motion';

interface SettingToggleProps {
  label: string;
  description: string;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  icon?: React.ReactNode;
}

const SettingToggle: React.FC<SettingToggleProps> = ({ 
  label, 
  description, 
  enabled, 
  onChange,
  icon 
}) => {
  return (
    <div className="flex items-center justify-between py-3.5 transition-all border-b border-slate-100 last:border-0">
      <div className="flex items-start gap-4">
        {icon && (
          <div className={`mt-0.5 p-2 rounded-xl ${enabled ? 'bg-amber-500/10 text-amber-600' : 'bg-slate-200/50 text-slate-500'} transition-colors`}>
            {icon}
          </div>
        )}
        <div className="flex flex-col">
          <h4 className="text-[13px] font-bold text-slate-950 tracking-tight">{label}</h4>
          <p className="text-[11px] font-medium text-slate-600 leading-snug mt-1">{description}</p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onChange(!enabled)}
        className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border border-slate-300 transition-colors duration-200 focus:outline-none ${
          enabled ? 'bg-amber-500' : 'bg-slate-200'
        }`}
      >
        <motion.span
          animate={{ x: enabled ? 24 : 4 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          className="pointer-events-none mt-[3px] inline-block h-3 w-3 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out"
        />
      </button>
    </div>
  );
};

export default SettingToggle;
