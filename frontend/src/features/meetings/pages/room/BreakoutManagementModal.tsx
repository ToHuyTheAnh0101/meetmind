import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Users, 
  Plus, 
  Trash2, 
  Shuffle, 
  Play, 
  UserPlus,
  Grid2X2
} from 'lucide-react';
import apiClient from '@/lib/apiClient';
import { useTranslation } from 'react-i18next';
import BaseModal from '@/components/ui/BaseModal';

interface Participant {
  id: string;
  userId: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  picture?: string;
  profilePictureUrl?: string;
  user?: {
    firstName?: string;
    lastName?: string;
    picture?: string;
    profilePictureUrl?: string;
  };
  metadata?: string;
  isOrganizer: boolean;
}

interface BreakoutRoom {
  id: string;
  name: string;
  participants: Participant[];
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  meetingId: string;
  participants: any[];
  onStart: (rooms: any[]) => void;
}

const BreakoutManagementModal: React.FC<Props> = ({ 
  isOpen, 
  onClose, 
  meetingId, 
  participants,
  onStart 
}) => {
  const { t } = useTranslation();
  const [rooms, setRooms] = useState<BreakoutRoom[]>([
    { id: '1', name: t('meeting.room_n', 'Phòng {{n}}', { n: 1 }), participants: [] },
    { id: '2', name: t('meeting.room_n', 'Phòng {{n}}', { n: 2 }), participants: [] },
  ]);
  const [unassigned, setUnassigned] = useState<Participant[]>([]);
  const [isStarting, setIsStarting] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [activeMobileTab, setActiveMobileTab] = useState<'unassigned' | 'rooms'>('unassigned');

  // Khởi tạo và đồng bộ danh sách người tham gia
  useEffect(() => {
    if (!isOpen) {
      setHasInitialized(false);
      return;
    }

    if (hasInitialized) return;

    const fetchCurrentState = async () => {
      try {
        const resp = await apiClient.get(`/meetings/${meetingId}/breakout-rooms`);
        const activeParticipants = participants.filter(p => !p.isOrganizer);

        if (resp.data && resp.data.length > 0) {
          // Ánh xạ từ dữ liệu backend sang state local
          const mappedRooms = resp.data.map((r: any) => ({
            id: r.id,
            name: r.name,
            participants: r.participants.map((p: any) => {
              // Tìm thông tin participant từ danh sách props để đảm bảo đồng bộ
              const originalP = participants.find(op => op.userId === p.userId);
              return originalP || {
                id: p.id,
                userId: p.userId,
                firstName: p.user?.firstName,
                lastName: p.user?.lastName,
                picture: p.user?.picture,
                user: p.user
              };
            })
          }));
          setRooms(mappedRooms);

          // Tính toán danh sách chưa gán
          const assignedUserIds = new Set(resp.data.flatMap((r: any) => r.participants.map((p: any) => p.userId)));
          setUnassigned(activeParticipants.filter(p => !assignedUserIds.has(p.userId)));
        } else {
          // Không có phòng nào, reset về mặc định
          setUnassigned(activeParticipants);
          setRooms([
            { id: '1', name: t('meeting.room_n', 'Phòng {{n}}', { n: 1 }), participants: [] },
            { id: '2', name: t('meeting.room_n', 'Phòng {{n}}', { n: 2 }), participants: [] },
          ]);
        }
        setHasInitialized(true);
      } catch (err) {
        console.error("Failed to fetch breakout state", err);
        // Fallback nếu lỗi
        setUnassigned(participants.filter(p => !p.isOrganizer));
        setHasInitialized(true);
      }
    };
    fetchCurrentState();
  }, [isOpen, meetingId, participants, t, hasInitialized]);

  const addRoom = () => {
    const maxId = rooms.reduce((max, r) => Math.max(max, parseInt(r.id) || 0), 0);
    const nextId = (maxId + 1).toString();
    setRooms([...rooms, { id: nextId, name: t('meeting.room_n', 'Phòng {{n}}', { n: nextId }), participants: [] }]);
  };

  const removeRoom = (id: string) => {
    const roomToRemove = rooms.find(r => r.id === id);
    if (roomToRemove) {
      setUnassigned([...unassigned, ...roomToRemove.participants]);
      setRooms(rooms.filter(r => r.id !== id));
    }
  };

  const handleAutoAssign = () => {
    const allToAssign = [...unassigned, ...rooms.flatMap(r => r.participants)];
    const shuffled = [...allToAssign].sort(() => Math.random() - 0.5);
    
    const newRooms = rooms.map(r => ({ ...r, participants: [] as Participant[] }));
    shuffled.forEach((p, index) => {
      const roomIndex = index % rooms.length;
      newRooms[roomIndex].participants.push(p);
    });

    setRooms(newRooms);
    setUnassigned([]);
  };

  const assignToRoom = (participant: Participant, roomId: string) => {
    // Xóa khỏi danh sách chưa gán
    setUnassigned(unassigned.filter(p => p.id !== participant.id));
    // Xóa khỏi các phòng khác (nếu đang ở phòng khác)
    const newRooms = rooms.map(r => ({
      ...r,
      participants: r.id === roomId 
        ? [...r.participants, participant]
        : r.participants.filter(p => p.id !== participant.id)
    }));
    setRooms(newRooms);
  };

  const unassignFromRoom = (participant: Participant, roomId: string) => {
    setRooms(rooms.map(r => r.id === roomId 
      ? { ...r, participants: r.participants.filter(p => p.id !== participant.id) }
      : r
    ));
    setUnassigned([...unassigned, participant]);
  };

  const handleStartBreakout = async () => {
    setIsStarting(true);
    try {
      await onStart(rooms);
    } catch (err) {
      console.error("Failed to start breakout", err);
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={t('meeting.breakout_rooms_title', 'Chia phòng họp nhỏ')}
      subtitle={t('meeting.breakout_rooms_subtitle', 'Quản lý và phân bổ người tham gia vào các nhóm thảo luận')}
      maxWidthClassName="lg:max-w-5xl"
      containerClassName="bg-[#0f1115] lg:border border-white/10 lg:rounded-[2.5rem] text-white w-full h-full lg:h-[85vh] flex flex-col"
      icon={
        <div className="p-3 rounded-2xl bg-teal-500/10 text-teal-400 shadow-lg shrink-0">
          <Grid2X2 className="h-5 w-5 lg:h-6 lg:w-6" />
        </div>
      }
    >
      <div className="flex flex-col flex-1 overflow-hidden">

        {/* Toolbar */}
        <div className="px-4 py-3 lg:px-8 lg:py-4 bg-white/5 border-b border-white/5 flex flex-wrap items-center gap-3 lg:gap-4 shrink-0">
          <button 
            onClick={handleAutoAssign}
            className="flex items-center gap-1.5 lg:gap-2 px-3 py-1.5 lg:px-4 lg:py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs lg:text-sm font-bold text-white transition-all active:scale-95"
          >
            <Shuffle size={14} className="text-teal-400" />
            {t('meeting.auto_assign', 'Chia tự động')}
          </button>
          <button 
            onClick={addRoom}
            className="flex items-center gap-1.5 lg:gap-2 px-3 py-1.5 lg:px-4 lg:py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs lg:text-sm font-bold text-white transition-all active:scale-95"
          >
            <Plus size={14} className="text-sky-400" />
            {t('meeting.add_room', 'Thêm phòng')}
          </button>
          <div className="ml-auto flex items-center gap-2 lg:gap-3 text-xs lg:text-sm text-slate-400">
            <Users size={14} />
            <span className="font-bold text-slate-300">{t('meeting.unassigned_count', '{{count}} người chưa gán', { count: unassigned.length })}</span>
          </div>
        </div>

        {/* Mobile Tab Selector */}
        <div className="flex lg:hidden border-b border-white/5 bg-[#12141a] shrink-0">
          <button 
            type="button"
            onClick={() => setActiveMobileTab('unassigned')}
            className={`flex-1 py-3.5 text-sm font-bold border-b-2 transition-all ${activeMobileTab === 'unassigned' ? 'border-teal-500 text-teal-400' : 'border-transparent text-slate-400'}`}
          >
            {t('meeting.unassigned', 'Chưa gán')} ({unassigned.length})
          </button>
          <button 
            type="button"
            onClick={() => setActiveMobileTab('rooms')}
            className={`flex-1 py-3.5 text-sm font-bold border-b-2 transition-all ${activeMobileTab === 'rooms' ? 'border-teal-500 text-teal-400' : 'border-transparent text-slate-400'}`}
          >
            {t('meeting.rooms', 'Phòng họp')} ({rooms.length})
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
          {/* Unassigned List */}
          <div className={`w-full lg:w-1/3 border-r border-white/5 p-4 lg:p-6 overflow-y-auto custom-scrollbar flex flex-col ${activeMobileTab === 'unassigned' ? 'flex' : 'hidden lg:flex'}`}>
            <h3 className="hidden lg:block text-sm font-bold text-slate-500 mb-4 tracking-wider">{t('meeting.unassigned', 'Danh sách chờ')}</h3>
            <div className="space-y-2">
              <AnimatePresence>
                {unassigned.map(p => (
                  <motion.div 
                    key={p.id}
                    layout
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="group flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5 hover:border-teal-500/30 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-teal-500/10 flex items-center justify-center text-xs font-bold text-teal-400 overflow-hidden shrink-0">
                        {(() => {
                          let avatarFromMeta = null;
                          try {
                            if (p.metadata) {
                              const meta = JSON.parse(p.metadata);
                              avatarFromMeta = meta.avatar;
                            }
                          } catch (e) {
                            // Ignore JSON parsing errors
                          }
                          
                          const finalSrc = p.picture || p.profilePictureUrl || p.user?.picture || p.user?.profilePictureUrl || avatarFromMeta;
                          
                          return (
                            <img 
                              src={finalSrc || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.displayName || p.firstName || p.user?.firstName || 'U')}&background=random&color=fff`} 
                              alt="" 
                              className="w-full h-full object-cover" 
                            />
                          );
                        })()}
                      </div>
                      <span className="text-sm font-medium text-slate-200 truncate max-w-[120px] sm:max-w-none">
                        {p.displayName || 
                         (p.firstName ? `${p.firstName} ${p.lastName || ''}` : 
                         (p.user?.firstName ? `${p.user.firstName} ${p.user.lastName || ''}` : 
                         t('common.user', 'Người dùng')))}
                      </span>
                    </div>

                    {/* Desktop Assign Dropdown */}
                    <div className="hidden lg:block relative group/menu">
                      <button className="p-2 opacity-0 group-hover:opacity-100 hover:bg-white/10 rounded-lg transition-all">
                        <UserPlus size={14} className="text-teal-400" />
                      </button>
                      <div className="absolute right-0 top-full pt-1 hidden group-hover/menu:block z-50">
                        <div className="bg-[#1a1d23] border border-white/10 rounded-xl shadow-xl p-2 min-w-[120px]">
                        {rooms.map(r => (
                          <button 
                            key={r.id}
                            onClick={() => assignToRoom(p, r.id)}
                            className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/5 text-xs text-slate-300 transition-colors"
                          >
                            {r.name}
                          </button>
                        ))}
                        </div>
                      </div>
                    </div>

                    {/* Mobile Assign Dropdown */}
                    <div className="block lg:hidden relative">
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            assignToRoom(p, e.target.value);
                            e.target.value = "";
                          }
                        }}
                        className="bg-teal-500/10 text-teal-400 border border-teal-500/20 rounded-xl px-2.5 py-1.5 text-xs font-bold outline-none cursor-pointer focus:ring-1 focus:ring-teal-500"
                        defaultValue=""
                      >
                        <option value="" disabled className="bg-[#0f1115] text-slate-500">{t('common.assign', 'Gán...')}</option>
                        {rooms.map(r => (
                          <option key={r.id} value={r.id} className="bg-[#0f1115] text-white">
                            {r.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* Rooms Grid */}
          <div className={`flex-1 p-4 lg:p-6 overflow-y-auto custom-scrollbar bg-black/20 ${activeMobileTab === 'rooms' ? 'block' : 'hidden lg:block'}`}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <AnimatePresence>
                {rooms.map(room => (
                  <motion.div 
                    key={room.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="flex flex-col rounded-3xl bg-white/5 border border-white/10 overflow-hidden"
                  >
                    <div className="p-4 bg-white/5 flex items-center justify-between border-b border-white/5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-white">{room.name}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-slate-400">
                          {room.participants.length}
                        </span>
                      </div>
                      <button 
                        onClick={() => removeRoom(room.id)}
                        className="p-1.5 hover:bg-rose-500/20 text-slate-500 hover:text-rose-500 rounded-lg transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="p-4 flex-1 min-h-[100px] space-y-2">
                      {room.participants.map(p => (
                        <div 
                          key={p.id}
                          className="flex items-center justify-between group"
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-lg bg-sky-500/10 flex items-center justify-center text-[10px] font-bold text-sky-400 overflow-hidden shrink-0">
                              {(() => {
                                let avatarFromMeta = null;
                                try {
                                  if (p.metadata) {
                                    const meta = JSON.parse(p.metadata);
                                    avatarFromMeta = meta.avatar;
                                  }
                                } catch (e) {
                                  // Ignore JSON parsing errors
                                }
                                
                                const finalSrc = p.picture || p.profilePictureUrl || p.user?.picture || p.user?.profilePictureUrl || avatarFromMeta;
                                
                                return (
                                  <img 
                                    src={finalSrc || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.displayName || p.firstName || p.user?.firstName || 'U')}&background=random&color=fff`} 
                                    alt="" 
                                    className="w-full h-full object-cover" 
                                  />
                                );
                              })()}
                            </div>
                            <span className="text-xs text-slate-300 truncate">
                              {p.displayName || 
                               (p.firstName ? `${p.firstName} ${p.lastName || ''}` : 
                               (p.user?.firstName ? `${p.user.firstName} ${p.user.lastName || ''}` : 
                               t('common.user', 'Người dùng')))}
                            </span>
                          </div>
                          <button 
                            onClick={() => unassignFromRoom(p, room.id)}
                            className="p-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 hover:bg-white/5 rounded text-slate-500 transition-colors"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                      {room.participants.length === 0 && (
                        <div className="h-full flex items-center justify-center border-2 border-dashed border-white/5 rounded-2xl min-h-[60px]">
                          <span className="text-sm text-slate-600 font-bold tracking-wider">{t('common.empty', 'Trống')}</span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 lg:p-8 border-t border-white/5 flex items-center justify-end bg-white/5 shrink-0">
          <div className="flex items-center gap-3 w-full lg:w-auto justify-between lg:justify-end">
            <button 
              onClick={onClose}
              className="flex-1 lg:flex-none text-center px-4 py-2.5 lg:px-8 lg:py-3.5 rounded-xl lg:rounded-2xl text-xs lg:text-sm font-bold text-slate-400 hover:text-white bg-white/5 lg:bg-transparent border border-white/5 lg:border-transparent transition-colors"
            >
              {t('common.cancel', 'Hủy bỏ')}
            </button>
            <button 
              onClick={handleStartBreakout}
              disabled={isStarting || rooms.every(r => r.participants.length === 0)}
              className="flex-1 lg:flex-none flex items-center justify-center gap-2 lg:gap-3 px-4 py-2.5 lg:px-10 lg:py-3.5 rounded-xl lg:rounded-2xl bg-teal-500 hover:bg-teal-400 disabled:opacity-50 disabled:hover:bg-teal-500 text-white text-xs lg:text-sm font-black transition-all shadow-xl shadow-teal-500/20"
            >
              {isStarting ? (
                <div className="w-4 h-4 lg:w-5 lg:h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <Play size={14} className="lg:w-[18px] lg:h-[18px]" fill="currentColor" />
              )}
              <span className="truncate">{t('meeting.start_breakout', 'Bắt đầu chia phòng')}</span>
            </button>
          </div>
        </div>
      </div>
    </BaseModal>
  );
};

export default BreakoutManagementModal;
