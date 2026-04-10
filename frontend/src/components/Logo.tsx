import React from 'react'
import { motion } from 'framer-motion'

const Logo: React.FC<{ size?: number }> = ({ size = 40 }) => {
  return (
    <motion.div 
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      
      className="flex items-center gap-3"
    >
      <div 
        style={{ width: size, height: size }}
        className="relative flex items-center justify-center bg-brand rounded-xl shadow-lg shadow-red-500/20"
      >
        <span className="text-white font-bold text-2xl select-none leading-none">MM</span>
        <div className="absolute inset-0 bg-white/10 rounded-xl blur-[2px]" />
      </div>
      <span className="text-white font-semibold text-xl tracking-tight">MeetMind</span>
    </motion.div>
  )
}

export default Logo
