import React from 'react'
import { motion } from 'framer-motion'

const Logo: React.FC<{ 
  size?: number; 
  variant?: 'light' | 'dark';
  showText?: boolean;
}> = ({ 
  size = 40, 
  variant = 'dark',
  showText = true
}) => {
  return (
    <motion.div 
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="flex items-center gap-3"
    >
      <div 
        style={{ width: size, height:size }}
        className="relative flex items-center justify-center bg-slate-950 rounded-[25%] shadow-xl shadow-slate-200/50 overflow-hidden"
      >
        {/* The 2x2 Grid Icon */}
        <div className="grid grid-cols-2 gap-[15%] w-[45%] h-[45%]">
          <div className="rounded-[25%] bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.4)]" />
          <div className="rounded-[25%] border-2 border-cyan-400/50" />
          <div className="rounded-[25%] border-2 border-cyan-400/50" />
          <div className="rounded-[25%] bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.4)]" />
        </div>
        
        {/* Subtle Overlay Glow */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
      </div>
      
      {showText && (
        <span className={[
          "font-bold tracking-tight",
          size > 50 ? "text-2xl" : "text-xl",
          variant === 'light' ? "text-white" : "text-slate-900"
        ].join(' ')}>
          MeetMind
        </span>
      )}
    </motion.div>
  )
}

export default Logo
