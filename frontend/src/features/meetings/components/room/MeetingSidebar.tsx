import React from 'react';
import { useTranslation } from 'react-i18next';
import { 
  MessageSquare, 
  Users, 
  Settings, 
  ChevronRight,
  UserPlus,
  BarChart3,
  MessageCircle,
  Shield
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Tab Components
import CustomChat from './CustomChat';
import CustomParticipantList from './CustomParticipantList';
import LobbyManagement from './LobbyManagement';
import InRoomSettings from './InRoomSettings';
import MeetingPermissionsTab from '../details/MeetingPermissionsTab';
import PollTab from './PollTab';
import QATab from './QATab';

interface MeetingSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: 'chat' | 'roster' | 'lobby' | 'settings' | 'polls' | 'qa' | 'permissions';
  setActiveTab: (tab: 'chat' | 'roster' | 'lobby' | 'settings' | 'polls' | 'qa' | 'permissions') => void;
  meetingId: string;
  userId: string;
  organizerId: string;
  isOrganizer: boolean;
  isCoHost: boolean;
  canManagePolls: boolean;
  canManageQA: boolean;
  onOpenCreateModal: () => void;
  onOpenQuestionModal: (question: any) => void;
  hasUnreadPolls?: boolean;
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
  isCoHost,
  canManagePolls,
  canManageQA,
  onOpenCreateModal,
  onOpenQuestionModal,
  hasUnreadPolls,
}) => {
  const { t } = useTranslation();
  const tabs = [
    { id: 'chat', icon: MessageSquare, label: t('meeting.chat'), color: 'text-cyan-400' },
    { id: 'roster', icon: Users, label: t('meeting.participants'), color: 'text-indigo-400' },
    { id: 'qa', icon: MessageCircle, label: t('meeting.qa'), color: 'text-lime-400' },
    { id: 'polls', icon: BarChart3, label: t('meeting.polls'), color: 'text-rose-400' },
  ];

  if (isOrganizer || isCoHost) {
    tabs.push(
      { id: 'lobby', icon: UserPlus, label: t('meeting.lobby'), color: 'text-emerald-400' }
    );
    
    // Only Organizer can manage permissions for now to prevent Co-host from removing Host's rights
    if (isOrganizer) {
      tabs.push({ id: 'permissions', icon: Shield, label: t('meeting.permissions.tab_permissions'), color: 'text-slate-100' });
    }

    tabs.push({ id: 'settings', icon: Settings, label: t('common.settings'), color: 'text-amber-400' });
  }

  return (
    <div className="h-full flex relative z-40">
      <AnimatePresence mode="wait">
        {isOpen && (
          <motion.div 
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="w-[320px] xl:w-[380px] 2xl:w-[420px] h-full bg-slate-950/95 backdrop-blur-2xl border-l border-white/10 flex flex-col overflow-hidden"
          >
            {/* Tab Header */}
            <div className="py-3 border-b border-white/5 bg-white/5 backdrop-blur-md grid place-items-center relative">
              <h3 className="text-lg text-white font-premium-ink tracking-tight text-center w-full">
                {tabs.find(t => t.id === activeTab)?.label || t('meeting.workspace')}
              </h3>
              <button 
                onClick={onClose}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors lg:hidden"
              >
                <ChevronRight className="h-5 w-5 rotate-180" />
              </button>
            </div>

            {/* Tab Body */}
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
              {activeTab === 'permissions' && (
                 <MeetingPermissionsTab meetingId={meetingId} />
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
              {activeTab === 'qa' && (
                <QATab 
                  meetingId={meetingId} 
                  userId={userId} 
                  hasManagePrivilege={canManageQA} 
                  onOpenQuestionModal={onOpenQuestionModal}
                  organizerId={organizerId}
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Permanent Vertical Nav Rail */}
      <div className="w-[64px] h-full border-l border-white/10 flex flex-col items-center py-6 gap-5 bg-slate-900/80 backdrop-blur-3xl shadow-[10px_0_30px_rgba(0,0,0,0.5)]">
         <button 
            onClick={() => {
              if (isOpen) {
                onClose();
              } else {
                setActiveTab('chat');
              }
            }} 
            className="h-10 w-10 flex items-center justify-center rounded-xl bg-white/10 text-white hover:bg-white/20 transition-all active:scale-95 border border-white/10 shadow-lg"
            title={isOpen ? t('common.collapse') : t('common.expand')}
         >
            <ChevronRight className={`h-5 w-5 transition-transform duration-300 ${isOpen ? '' : 'rotate-180'}`} />
         </button>
 
         <div className="w-8 h-px bg-white/10 mb-2" />

         {tabs.map((tab) => {
           const Icon = tab.icon;
           const isActive = activeTab === tab.id && isOpen;
           return (
             <button
               key={tab.id}
               onClick={() => {
                 if (activeTab === tab.id && isOpen) {
                   onClose();
                 } else {
                   setActiveTab(tab.id as any);
                 }
               }}
               className={`relative flex items-center justify-center h-12 w-12 rounded-xl transition-all duration-300 ${isActive ? 'bg-white/10 text-white shadow-xl border border-white/20' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}
             >
               <Icon className={`h-5 w-5 ${isActive ? tab.color : ''} transition-colors`} />
               
               {tab.id === 'polls' && hasUnreadPolls && (!isOpen || activeTab !== 'polls') && (
                 <span className="absolute top-2 right-2 h-2.5 w-2.5 bg-rose-500 rounded-full border-2 border-slate-900 shadow-[0_0_8px_rgba(244,63,94,0.6)] animate-pulse" />
               )}
               
               {isActive && (
                 <motion.div 
                    layoutId="activeTabIndicator"
                    className={`absolute -right-[1px] w-[3px] h-6 ${tab.id === 'chat' ? 'bg-cyan-500' : tab.id === 'roster' ? 'bg-indigo-500' : tab.id === 'lobby' ? 'bg-emerald-500' : tab.id === 'polls' ? 'bg-rose-500' : tab.id === 'qa' ? 'bg-lime-500' : tab.id === 'permissions' ? 'bg-white shadow-[0_0_15px_rgba(255,255,255,0.8)]' : 'bg-amber-500'} rounded-l-full shadow-[0_0_15px_currentColor]`}
                 />
               )}
             </button>
           );
         })}
      </div>
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@100..900&display=swap');
        .font-premium-ink {
          font-family: 'Be Vietnam Pro', sans-serif !important;
          letter-spacing: 0.02em !important;
          font-weight: 600 !important;
          text-align: center !important;
        }
      `}} />
    </div>
  );
};

export default MeetingSidebar;
