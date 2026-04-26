import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronRight, 
  MessageSquare, 
  Users, 
  UserPlus, 
  Settings 
} from 'lucide-react';
import CustomChat from './CustomChat';
import CustomParticipantList from './CustomParticipantList';
import LobbyManagement from './LobbyManagement';
import InRoomSettings from './InRoomSettings';

interface MeetingSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: 'chat' | 'roster' | 'lobby' | 'settings';
  setActiveTab: (tab: 'chat' | 'roster' | 'lobby' | 'settings') => void;
  organizerId: string;
  isOrganizer: boolean;
}

const MeetingSidebar: React.FC<MeetingSidebarProps> = ({
  isOpen,
  onClose,
  activeTab,
  setActiveTab,
  organizerId,
  isOrganizer,
}) => {
  const { t } = useTranslation();
  const tabs = [
    { id: 'chat', icon: MessageSquare, label: t('meeting.chat'), color: 'text-cyan-400' },
    { id: 'roster', icon: Users, label: t('meeting.roster'), color: 'text-indigo-400' },
  ];

  if (isOrganizer) {
    tabs.push(
      { id: 'lobby', icon: UserPlus, label: t('meeting.lobby'), color: 'text-emerald-400' },
      { id: 'settings', icon: Settings, label: t('common.settings'), color: 'text-amber-400' }
    );
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ x: 400 }}
          animate={{ x: 0 }}
          exit={{ x: 400 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="w-full lg:w-[460px] h-full bg-slate-100 border-l border-slate-400 flex relative z-40 shadow-[-20px_0_50px_rgba(0,0,0,0.05)]"
        >
          {/* Tab Content Container */}
          <div className="flex-1 overflow-hidden flex flex-col">
              <div className="p-6 border-b border-slate-400 flex items-center justify-center bg-white/50 backdrop-blur-sm">
                <h3 className="text-xl text-slate-950 font-premium-ink tracking-tight">
                  {tabs.find(t => t.id === activeTab)?.label || t('meeting.workspace')}
                </h3>
              </div>

             <div className="flex-1 overflow-hidden flex flex-col">
                {activeTab === 'chat' && <CustomChat />}
                {activeTab === 'roster' && (
                  <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                     <CustomParticipantList organizerId={organizerId} />
                  </div>
                )}
                {activeTab === 'lobby' && (
                   <LobbyManagement meetingId={organizerId} />
                )}
                {activeTab === 'settings' && (
                   <InRoomSettings meetingId={organizerId} />
                )}
             </div>
          </div>

          {/* Vertical Nav Rail (Back on the Right) */}
          <div className="w-[72px] h-full border-l border-slate-400 flex flex-col items-center py-5 gap-5 bg-slate-200/50">
             <button 
                onClick={onClose} 
                className="h-10 w-10 flex items-center justify-center rounded-xl bg-white/40 text-slate-500 hover:text-slate-950 hover:bg-white transition-all active:scale-95"
                title={t('common.back')}
             >
                <ChevronRight className="h-5 w-5" />
             </button>

             <div className="w-8 h-px bg-slate-400/30 mb-1" />

             {tabs.map((tab) => {
               const Icon = tab.icon;
               const isActive = activeTab === tab.id;
               return (
                 <button
                   key={tab.id}
                   onClick={() => setActiveTab(tab.id as any)}
                   className={`relative flex items-center justify-center h-12 w-12 rounded-2xl transition-all duration-300 ${isActive ? 'bg-white text-slate-950 shadow-md border border-slate-400' : 'text-slate-500 hover:text-slate-700 hover:bg-white/40'}`}
                 >
                   <Icon className={`h-6 w-6 ${isActive ? tab.color : ''} transition-colors`} />
                   
                   {isActive && (
                     <motion.div 
                        layoutId="activeTabIndicator"
                        className={`absolute -right-[1px] w-[3px] h-6 ${tab.id === 'chat' ? 'bg-cyan-500' : tab.id === 'roster' ? 'bg-indigo-500' : tab.id === 'lobby' ? 'bg-emerald-500' : 'bg-amber-500'} rounded-l-full shadow-[-2px_0_10px_currentColor]`}
                     />
                   )}
                 </button>
               );
             })}

          </div>
        </motion.div>
      )}
      {/* Inline Style for Fonts (to ensure immediate effect) */}
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@100..900&display=swap');
        .font-premium-ink {
          font-family: 'Be Vietnam Pro', sans-serif !important;
          letter-spacing: 0.02em !important;
          font-weight: 600 !important;
        }
      `}} />
    </AnimatePresence>
  );
};

export default MeetingSidebar;
