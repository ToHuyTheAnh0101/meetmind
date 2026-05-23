import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Users, 
  Plus, 
  Trash2, 
  Shuffle, 
  Play, 
  ChevronRight,
  UserPlus,
  Grid2X2
} from 'lucide-react';
import apiClient from '@/lib/apiClient';
import { useTranslation } from 'react-i18next';

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

  // Khởi tạo và đồng bộ danh sách người tham gia
  useEffect(() => {
    if (isOpen) {
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
        } catch (err) {
          console.error("Failed to fetch breakout state", err);
          // Fallback nếu lỗi
          setUnassigned(participants.filter(p => !p.isOrganizer));
        }
      };
      fetchCurrentState();
    }
  }, [isOpen, meetingId, participants, t]);

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
      const setupData = {
        rooms: rooms.map(r => ({
          name: r.name,
          assignments: r.participants.map(p => ({ userId: p.userId || p.id }))
        }))
      };

      // 1. Setup rooms in backend
      await apiClient.post(`/meetings/${meetingId}/breakout-rooms/setup`, setupData);
      
      // 2. Start breakout
      const res = await apiClient.post(`/meetings/${meetingId}/breakout-rooms/start`);
      
      onStart(res.data);
      onClose();
    } catch (err) {
      console.error("Failed to start breakout", err);
    } finally {
      setIsStarting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative w-full max-w-5xl h-[85vh] bg-[#0f1115] border border-white/10 rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="p-8 border-b border-white/5 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-white flex items-center gap-3">
              <Grid2X2 className="text-teal-400" />
              {t('meeting.breakout_rooms_title', 'Chia phòng họp nhỏ')}
            </h2>
            <p className="text-slate-400 text-sm mt-1">{t('meeting.breakout_rooms_subtitle', 'Quản lý và phân bổ người tham gia vào các nhóm thảo luận')}</p>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-white/5 rounded-2xl transition-colors">
            <X className="text-slate-400" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="px-8 py-4 bg-white/5 border-b border-white/5 flex items-center gap-4">
          <button 
            onClick={handleAutoAssign}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-sm font-bold text-white transition-all"
          >
            <Shuffle size={16} className="text-teal-400" />
            {t('meeting.auto_assign', 'Chia tự động')}
          </button>
          <button 
            onClick={addRoom}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-sm font-bold text-white transition-all"
          >
            <Plus size={16} className="text-sky-400" />
            {t('meeting.add_room', 'Thêm phòng')}
          </button>
          <div className="ml-auto flex items-center gap-3 text-sm text-slate-400">
            <Users size={16} />
            <span className="font-bold text-slate-300">{t('meeting.unassigned_count', '{{count}} người chưa gán', { count: unassigned.length })}</span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Unassigned List */}
          <div className="w-1/3 border-r border-white/5 p-6 overflow-y-auto custom-scrollbar">
            <h3 className="text-sm font-bold text-slate-500 mb-4 tracking-wider">{t('meeting.unassigned', 'Danh sách chờ')}</h3>
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
                          } catch (e) {}
                          
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
                      <span className="text-sm font-medium text-slate-200 truncate">
                        {p.displayName || 
                         (p.firstName ? `${p.firstName} ${p.lastName || ''}` : 
                         (p.user?.firstName ? `${p.user.firstName} ${p.user.lastName || ''}` : 
                         t('common.user', 'Người dùng')))}
                      </span>
                    </div>
                    <div className="relative group/menu">
                      <button className="p-2 opacity-0 group-hover:opacity-100 hover:bg-white/10 rounded-lg transition-all">
                        <UserPlus size={14} className="text-teal-400" />
                      </button>
                      {/* Dropdown to assign */}
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
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* Rooms Grid */}
          <div className="flex-1 p-6 overflow-y-auto custom-scrollbar bg-black/20">
            <div className="grid grid-cols-2 gap-4">
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
                                } catch (e) {}
                                
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
                            className="p-1 opacity-0 group-hover:opacity-100 hover:bg-white/5 rounded text-slate-500"
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
        <div className="p-8 border-t border-white/5 flex items-center justify-end bg-white/5">
          <div className="flex items-center gap-4">
            <button 
              onClick={onClose}
              className="px-8 py-3.5 rounded-2xl text-sm font-bold text-slate-400 hover:text-white transition-colors"
            >
              {t('common.cancel', 'Hủy bỏ')}
            </button>
            <button 
              onClick={handleStartBreakout}
              disabled={isStarting || rooms.every(r => r.participants.length === 0)}
              className="flex items-center gap-3 px-10 py-3.5 rounded-2xl bg-teal-500 hover:bg-teal-400 disabled:opacity-50 disabled:hover:bg-teal-500 text-white text-sm font-black transition-all shadow-xl shadow-teal-500/20"
            >
              {isStarting ? (
                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <Play size={18} fill="currentColor" />
              )}
              {t('meeting.start_breakout', 'Bắt đầu chia phòng')}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default BreakoutManagementModal;
