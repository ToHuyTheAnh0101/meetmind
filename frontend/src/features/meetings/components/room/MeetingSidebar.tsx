import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  MessageSquare, 
  Users, 
  Settings, 
  ChevronRight,
  UserPlus,
  BarChart3
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Tab Components
import CustomChat from './CustomChat';
import CustomParticipantList from './CustomParticipantList';
import LobbyManagement from './LobbyManagement';
import InRoomSettings from './InRoomSettings';
import PollTab from './PollTab';

interface MeetingSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: 'chat' | 'roster' | 'lobby' | 'settings' | 'polls';
  setActiveTab: (tab: 'chat' | 'roster' | 'lobby' | 'settings' | 'polls') => void;
  meetingId: string;
  userId: string;
  organizerId: string;
  isOrganizer: boolean;
  canManagePolls: boolean;
  onOpenCreateModal: () => void;
}

const MeetingSidebar: React.FC<MeetingSidebarProps> = ({
  isOpen,
  onClose,
  activeTab,
  setActiveTab,
  meetingId,
  userId,
  organizerId,
  isOrganizer,
  canManagePolls,
  onOpenCreateModal,
}) => {
  const { t } = useTranslation();
  const tabs = [
    { id: 'chat', icon: MessageSquare, label: t('meeting.chat'), color: 'text-cyan-400' },
    { id: 'roster', icon: Users, label: t('meeting.participants'), color: 'text-indigo-400' },
    { id: 'polls', icon: BarChart3, label: t('meeting.polls'), color: 'text-rose-400' },
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
          className="w-full lg:w-[320px] xl:w-[380px] 2xl:w-[420px] h-full bg-slate-950/95 backdrop-blur-2xl border-l border-white/10 flex relative z-40 shadow-[-20px_0_50px_rgba(0,0,0,0.5)]"
        >
          {/* Tab Content Container */}
          <div className="flex-1 overflow-hidden flex flex-col">
              <div className="py-3 border-b border-white/5 bg-white/5 backdrop-blur-md grid place-items-center">
                <h3 className="text-lg text-white font-premium-ink tracking-tight text-center w-full">
                  {tabs.find(t => t.id === activeTab)?.label || t('meeting.workspace')}
                </h3>
              </div>

             <div className="flex-1 overflow-hidden flex flex-col bg-slate-900/30">
                {activeTab === 'chat' && <CustomChat />}
                {activeTab === 'roster' && (
                  <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                     <CustomParticipantList organizerId={organizerId} />
                  </div>
                )}
                {activeTab === 'lobby' && (
                   <LobbyManagement meetingId={meetingId} />
                )}
                {activeTab === 'settings' && (
                   <InRoomSettings meetingId={meetingId} />
                )}
                {activeTab === 'polls' && (
                   <PollTab 
                     meetingId={meetingId} 
                     userId={userId} 
                     canManagePolls={canManagePolls} 
                     onOpenCreateModal={onOpenCreateModal}
                   />
                )}
             </div>
          </div>

          {/* Vertical Nav Rail */}
          <div className="w-[64px] h-full border-l border-white/10 flex flex-col items-center py-6 gap-5 bg-slate-900/80 backdrop-blur-3xl shadow-[10px_0_30px_rgba(0,0,0,0.5)]">
             <button 
                onClick={onClose} 
                className="h-10 w-10 flex items-center justify-center rounded-xl bg-white/10 text-white hover:bg-white/20 transition-all active:scale-95 border border-white/10"
                title={t('common.back')}
             >
                <ChevronRight className="h-5 w-5" />
             </button>

             <div className="w-8 h-px bg-white/10 mb-2" />

             {tabs.map((tab) => {
               const Icon = tab.icon;
               const isActive = activeTab === tab.id;
               return (
                 <button
                   key={tab.id}
                   onClick={() => setActiveTab(tab.id as any)}
                   className={`relative flex items-center justify-center h-12 w-12 rounded-xl transition-all duration-300 ${isActive ? 'bg-white/10 text-white shadow-xl border border-white/20' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}
                 >
                   <Icon className={`h-5 w-5 ${isActive ? tab.color : ''} transition-colors`} />
                   
                   {isActive && (
                     <motion.div 
                        layoutId="activeTabIndicator"
                        className={`absolute -right-[1px] w-[3px] h-6 ${tab.id === 'chat' ? 'bg-cyan-500' : tab.id === 'roster' ? 'bg-indigo-500' : tab.id === 'lobby' ? 'bg-emerald-500' : tab.id === 'polls' ? 'bg-rose-500' : 'bg-amber-500'} rounded-l-full shadow-[0_0_15px_currentColor]`}
                     />
                   )}
                 </button>
               );
             })}

          </div>
        </motion.div>
      )}
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@100..900&display=swap');
        .font-premium-ink {
          font-family: 'Be Vietnam Pro', sans-serif !important;
          letter-spacing: 0.02em !important;
          font-weight: 600 !important;
          text-align: center !important;
        }
      `}} />
    </AnimatePresence>
  );
};

export default MeetingSidebar;
