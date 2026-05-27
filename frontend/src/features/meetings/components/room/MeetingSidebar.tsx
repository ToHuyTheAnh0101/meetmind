import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  MessageSquare, 
  Users, 
  Settings, 
  ChevronRight,
  UserPlus,
  BarChart3,
  MessageCircle,
  Shield,
  Grid2X2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import apiClient from '@/lib/apiClient';

import { useParticipants } from '@livekit/components-react';

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
  activeTab: 'chat' | 'roster' | 'lobby' | 'settings' | 'polls' | 'qa' | 'permissions' | 'breakout';
  setActiveTab: (tab: 'chat' | 'roster' | 'lobby' | 'settings' | 'polls' | 'qa' | 'permissions' | 'breakout') => void;
  meetingId: string;
  userId: string;
  organizerId: string;
  isOrganizer: boolean;
  isCoHost: boolean;
  canManagePolls: boolean;
  canManageQA: boolean;
  onOpenCreateModal: () => void;
  onOpenQuestionModal: (question: any) => void;
  onOpenBreakoutModal: () => void;
  onOpenConfirmEndModal: () => void;
  onReturnToMain: () => void;
  isInBreakout: boolean;
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
  onOpenBreakoutModal,
  onOpenConfirmEndModal,
  onReturnToMain,
  isInBreakout,
  hasUnreadPolls,
}) => {
  const { t } = useTranslation();
  const [breakoutRooms, setBreakoutRooms] = useState<any[]>([]);
  const participants = useParticipants();
  
  const fetchBreakoutRooms = useCallback(async () => {
    try {
      const resp = await apiClient.get(`/meetings/${meetingId}/breakout-rooms`);
      setBreakoutRooms(resp.data);
    } catch (err) {
      console.error("Failed to fetch breakout rooms", err);
    }
  }, [meetingId]);

  // Track room participants to refresh breakout rooms in real-time
  const participantsKey = participants.map(p => p.identity).join(',');

  useEffect(() => {
    if (activeTab === 'breakout' && isOpen) {
      fetchBreakoutRooms();
    }
  }, [participantsKey, activeTab, isOpen, fetchBreakoutRooms]);

  useEffect(() => {
    window.addEventListener('breakout-started', fetchBreakoutRooms);
    window.addEventListener('breakout-ended', fetchBreakoutRooms);
    return () => {
      window.removeEventListener('breakout-started', fetchBreakoutRooms);
      window.removeEventListener('breakout-ended', fetchBreakoutRooms);
    };
  }, [fetchBreakoutRooms]);
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
    
    if (isOrganizer) {
      tabs.push({ id: 'permissions', icon: Shield, label: t('meeting.permissions.tab_permissions'), color: 'text-slate-100' });
      tabs.push({ id: 'breakout', icon: Grid2X2, label: 'Chia phòng', color: 'text-teal-400' });
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
              {activeTab === 'chat' && <CustomChat meetingId={meetingId} isInBreakout={isInBreakout} />}
              {activeTab === 'roster' && (
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar flex flex-col">
                   <CustomParticipantList organizerId={organizerId} />
                   
                   {isInBreakout && (
                     <button 
                       onClick={onReturnToMain}
                       className="mt-6 w-full py-3.5 rounded-2xl border-2 border-dashed border-white/10 text-slate-400 hover:border-indigo-500/50 hover:text-indigo-400 hover:bg-indigo-500/5 transition-all text-[13px] font-bold flex items-center justify-center gap-2"
                     >
                       <ChevronRight className="h-4 w-4 rotate-180" />
                       Quay lại phòng chính
                     </button>
                   )}
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
                />
              )}
              {activeTab === 'breakout' && (
                <div className="flex-1 flex flex-col p-4 overflow-y-auto custom-scrollbar">
                  {breakoutRooms.length > 0 ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-teal-400/80 tracking-wider">Phòng đang hoạt động</span>
                        <button 
                          onClick={onOpenBreakoutModal}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 text-[11px] font-bold text-teal-400 hover:text-teal-300 transition-all border border-teal-500/20 shadow-lg shadow-teal-500/5"
                        >
                          <Settings size={12} className="animate-spin-slow" />
                          <span>Quản lý</span>
                        </button>
                      </div>
                      {breakoutRooms.map(room => (
                        <div key={room.id} className="p-4 rounded-2xl bg-white/5 border border-white/10">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-bold text-white">{room.name}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-400 border border-teal-500/20">
                              {room.status === 'active' ? 'Đang họp' : 'Đã kết thúc'}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {room.participants?.length > 0 ? (
                              room.participants.map((p: any) => {
                                const isConnecting = room.status === 'active' && !p.isOnline;
                                return (
                                  <div 
                                    key={p.id} 
                                    className={`flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/5 border border-white/5 transition-all duration-300 ${isConnecting ? 'opacity-40 saturate-[0.25]' : ''}`}
                                    title={isConnecting ? 'Đang kết nối...' : 'Đã kết nối'}
                                  >
                                    <div className="w-4 h-4 rounded-md bg-teal-500/20 flex items-center justify-center text-[8px] text-teal-400 overflow-hidden relative">
                                      <img 
                                        src={p.user?.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.user?.firstName || 'U')}&background=random&color=fff`} 
                                        alt="" 
                                        className="w-full h-full object-cover" 
                                      />
                                      {room.status === 'active' && (
                                        <div className={`absolute bottom-0 right-0 w-1 h-1 rounded-full ${p.isOnline ? 'bg-emerald-500 animate-pulse shadow-[0_0_4px_rgba(16,185,129,0.8)]' : 'bg-slate-400'}`} />
                                      )}
                                    </div>
                                    <span className="text-[10px] text-slate-300 truncate max-w-[60px]">
                                      {p.user?.firstName || 'Người dùng'}
                                    </span>
                                  </div>
                                );
                              })
                            ) : (
                              <span className="text-[10px] text-slate-500 italic">Chưa có người tham gia</span>
                            )}
                          </div>
                        </div>
                      ))}

                      {/* Nút thu hồi toàn bộ */}
                      <button 
                        onClick={onOpenConfirmEndModal}
                        className="w-full mt-6 py-4 rounded-2xl bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white font-black text-sm transition-all border border-rose-500/20 shadow-xl shadow-rose-500/5 flex items-center justify-center gap-2"
                      >
                        Thu hồi toàn bộ
                      </button>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                      <div className="w-16 h-16 rounded-3xl bg-teal-500/10 flex items-center justify-center mb-6">
                        <Grid2X2 className="text-teal-400" />
                      </div>
                      <h4 className="text-lg font-bold text-white mb-2">Chia phòng họp nhỏ</h4>
                      <p className="text-sm text-slate-400 mb-8 leading-relaxed">
                        Tạo các nhóm thảo luận riêng biệt để tăng hiệu quả làm việc nhóm.
                      </p>
                      <button 
                        onClick={onOpenBreakoutModal}
                        className="w-full py-4 rounded-2xl bg-teal-500 hover:bg-teal-400 text-white font-black text-sm transition-all shadow-xl shadow-teal-500/20"
                      >
                        Bắt đầu thiết lập
                      </button>
                    </div>
                  )}
                </div>
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
                    className={`absolute -right-[1px] w-[3px] h-6 ${tab.id === 'chat' ? 'bg-cyan-500' : tab.id === 'roster' ? 'bg-indigo-500' : tab.id === 'lobby' ? 'bg-emerald-500' : tab.id === 'polls' ? 'bg-rose-500' : tab.id === 'qa' ? 'bg-lime-500' : tab.id === 'breakout' ? 'bg-teal-500' : tab.id === 'permissions' ? 'bg-white shadow-[0_0_15px_rgba(255,255,255,0.8)]' : 'bg-amber-500'} rounded-l-full shadow-[0_0_15px_currentColor]`}
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
      ` }} />
    </div>
  );
};

export default MeetingSidebar;
