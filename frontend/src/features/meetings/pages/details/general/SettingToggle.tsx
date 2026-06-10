import React from 'react';
import { motion } from 'framer-motion';

interface SettingToggleProps {
  label: string;
  description: string;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  icon?: React.ReactNode;
  noBorder?: boolean;
  className?: string;
  disabled?: boolean;
  labelClassName?: string;
  descriptionClassName?: string;
}

const SettingToggle: React.FC<SettingToggleProps> = ({ 
  label, 
  description, 
  enabled, 
  onChange,
  icon,
  noBorder,
  className,
  disabled,
  labelClassName,
  descriptionClassName
}) => {
  return (
    <div className={`flex items-center justify-between py-3.5 transition-all ${!noBorder ? 'border-b border-white/5 last:border-0' : ''} ${className || ''} ${disabled ? 'opacity-60 pointer-events-none' : ''}`}>
      <div className="flex items-start gap-4">
        {icon && (
          <div className={`mt-0.5 p-2 rounded-xl ${enabled ? 'bg-amber-500/10 text-amber-500' : 'bg-slate-100 text-slate-500'} transition-colors`}>
            {icon}
          </div>
        )}
        <div className="flex flex-col">
          <h4 className={`text-sm font-bold tracking-tight ${labelClassName || 'text-slate-900'}`}>{label}</h4>
          <p className={`text-xs font-medium leading-snug mt-1 ${descriptionClassName || 'text-slate-500'}`}>{description}</p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onChange(!enabled)}
        className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border transition-colors duration-200 focus:outline-none ${
          enabled ? 'bg-amber-500 border-amber-600' : 'bg-slate-200 border-slate-300'
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
