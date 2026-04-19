import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import CustomChat from './CustomChat';
import CustomParticipantList from './CustomParticipantList';

interface MeetingSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: 'chat' | 'participants';
  setActiveTab: (tab: 'chat' | 'participants') => void;
}

const MeetingSidebar: React.FC<MeetingSidebarProps> = ({
  isOpen,
  onClose,
  activeTab,
  setActiveTab,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ x: 400 }}
          animate={{ x: 0 }}
          exit={{ x: 400 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="w-full lg:w-[400px] h-full bg-[#08080a] border-l border-white/20 flex flex-col relative z-40 shadow-[-20px_0_50px_rgba(0,0,0,0.5)]"
        >
          <div className="p-6 flex items-center justify-between border-b border-white/20 bg-black/40">
             <div className="flex items-center gap-1 bg-white/10 p-1.5 rounded-2xl">
                <button 
                  onClick={() => setActiveTab('chat')}
                  className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'chat' ? 'bg-white/20 text-white shadow-lg' : 'text-white/40 hover:text-white'}`}
                >
                  Chat
                </button>
                <button 
                  onClick={() => setActiveTab('participants')}
                  className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'participants' ? 'bg-white/20 text-white shadow-lg' : 'text-white/40 hover:text-white'}`}
                >
                  Roster
                </button>
             </div>
             <button 
               onClick={onClose} 
               className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-all border border-white/5"
             >
               <X className="h-4 w-4" />
             </button>
          </div>

          <div className="flex-1 overflow-hidden flex flex-col">
             {activeTab === 'chat' ? (
               <CustomChat />
             ) : (
               <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                  <CustomParticipantList />
               </div>
             )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MeetingSidebar;
