import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Users, 
  Shield, 
  ShieldCheck, 
  Search,
  CheckCircle2,
  ChevronDown,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocalParticipant } from '@livekit/components-react';
import apiClient from '@/lib/apiClient';
import { Participant, MeetingPermission } from '@/types/api';

interface MeetingPermissionsTabProps {
  meetingId: string;
  variant?: 'room' | 'details';
}

/**
 * Renders a single participant row (Organizer or Member)
 */
const ParticipantRow: React.FC<{
  participant: Participant;
  isRoom: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
  t: any;
  permissionList: { key: MeetingPermission; label: string }[];
  handleTogglePermission: (p: Participant, perm: MeetingPermission) => void;
}> = ({ participant, isRoom, isExpanded, onToggleExpand, t, permissionList, handleTogglePermission }) => {
  return (
    <motion.div 
      layout
      className={`rounded-2xl border transition-all ${
        isRoom 
        ? participant.isOrganizer ? 'bg-white/10 border-white/20 shadow-[0_0_15px_rgba(255,255,255,0.1)]' : 'bg-white/5 border-white/5'
        : 'bg-white border-slate-100 shadow-sm hover:shadow-md'
      }`}
    >
      <div className={`${isRoom ? 'p-3' : 'p-4 flex flex-col lg:flex-row lg:items-start gap-6'}`}>
        <div 
          className={`${isRoom ? 'flex items-center gap-3 cursor-pointer' : 'flex items-center gap-4 lg:w-1/4 shrink-0'}`}
          onClick={onToggleExpand}
        >
          <div className="relative shrink-0">
            <img 
              src={participant.user.picture || `https://ui-avatars.com/api/?name=${participant.user.firstName}+${participant.user.lastName}&background=random`} 
              alt={participant.user.firstName}
              className={`${isRoom ? 'h-9 w-9' : 'h-12 w-12'} rounded-xl object-cover`}
            />
            {participant.isOrganizer && (
              <div className={`absolute -top-1.5 -right-1.5 p-0.5 rounded-md shadow-md ${isRoom ? 'bg-white text-slate-900' : 'bg-indigo-600 text-white'}`}>
                <ShieldCheck className="h-2.5 w-2.5" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className={`font-bold truncate flex items-center gap-1.5 ${isRoom ? 'text-[13px] text-white' : 'text-[15px] text-slate-900'}`}>
              {participant.user.firstName} {participant.user.lastName}
              {participant.isOrganizer && (
                <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-black border ${
                  isRoom ? 'bg-white/20 text-white border-white/10' : 'bg-indigo-50 text-indigo-700 border-indigo-100'
                }`}>
                  {t('meeting.host')}
                </span>
              )}
            </h4>
            <p className={`truncate ${isRoom ? 'text-[12px] text-slate-500' : 'text-sm text-slate-400 font-medium'}`}>{participant.user.email}</p>
          </div>
          {isRoom && !participant.isOrganizer && (
            <div className={`p-1.5 rounded-lg transition-all ${isExpanded ? 'bg-white/10 text-white' : 'text-slate-500 group-hover:text-slate-300'}`}>
              <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
            </div>
          )}
        </div>

        <div className="flex-1">
          <AnimatePresence initial={!isRoom}>
            {isExpanded && (
              <motion.div
                initial={isRoom ? { height: 0, opacity: 0 } : false}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className={`overflow-hidden ${isRoom ? 'mt-3' : ''}`}
              >
                {participant.isOrganizer ? (
                  <div className={`rounded-xl p-3 border ${isRoom ? 'bg-white/5 border-white/10' : 'bg-indigo-50/50 border-indigo-100/50'}`}>
                    <p className={`text-[11px] font-bold flex items-center gap-2 ${isRoom ? 'text-slate-300' : 'text-indigo-600'}`}>
                      <CheckCircle2 className={`h-3.5 w-3.5 ${isRoom ? 'text-white' : 'text-indigo-600'}`} />
                      {t('meeting.permissions.organizer_note')}
                    </p>
                  </div>
                ) : (
                  <div className={`grid gap-1.5 ${isRoom ? 'grid-cols-1 pt-1' : 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3'}`}>
                    {permissionList.map((perm) => {
                      const isGranted = (participant.permissions || []).includes(perm.key);
                      return (
                        <button
                          key={perm.key}
                          onClick={() => handleTogglePermission(participant, perm.key)}
                          className={`flex items-center justify-between px-3 py-2 rounded-xl border transition-all ${
                            isRoom 
                            ? isGranted ? 'bg-white/20 border-white/30 text-white' : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'
                            : isGranted ? 'bg-indigo-50 border-indigo-100 text-indigo-700 shadow-sm' : 'bg-slate-50 border-slate-100 text-slate-500 hover:bg-slate-100'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                             <div className={`h-1.5 w-1.5 rounded-full transition-all duration-300 ${
                               isGranted 
                               ? isRoom ? 'bg-white shadow-[0_0_10px_rgba(255,255,255,1)]' : 'bg-indigo-500 shadow-[0_0_5px_rgba(79,70,229,0.3)]' 
                               : 'bg-slate-300'
                             }`} />
                             <span className={`text-[12px] font-bold transition-colors ${
                               isGranted ? (isRoom ? 'text-white' : 'text-indigo-700') : (isRoom ? 'text-slate-400' : 'text-slate-500')
                             }`}>{perm.label}</span>
                          </div>
                          {isRoom ? (
                             <div className={`h-4 w-7 rounded-full relative transition-all duration-300 ${
                               isGranted ? 'bg-white/40' : 'bg-slate-800'
                             }`}>
                                <div className={`absolute top-0.5 h-3 w-3 rounded-full transition-all duration-300 ${
                                  isGranted ? 'right-0.5 bg-white shadow-[0_0_15px_rgba(255,255,255,1)]' : 'left-0.5 bg-slate-500'
                                }`} />
                             </div>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};

const RoomPermissionsBroadcastHelper: React.FC<{
  meetingId: string;
  triggerRef: React.MutableRefObject<((targetUserId?: string, userIds?: string[]) => void) | null>;
}> = ({ meetingId, triggerRef }) => {
  const { localParticipant } = useLocalParticipant();

  React.useEffect(() => {
    triggerRef.current = (targetUserId?: string, userIds?: string[]) => {
      try {
        if (!localParticipant) return;
        const payload = {
          type: 'PERMISSIONS_UPDATED',
          meetingId,
          targetUserId,
          userIds,
        };
        const encoder = new TextEncoder();
        const data = encoder.encode(JSON.stringify(payload));
        localParticipant.publishData(data, { reliable: true }).catch(err => {
          console.error("Failed to publish permissions update data signal:", err);
        });
      } catch (err) {
        console.error("Error broadcasting permissions update:", err);
      }
    };
    return () => {
      triggerRef.current = null;
    };
  }, [localParticipant, meetingId, triggerRef]);

  return null;
};

const MeetingPermissionsTab: React.FC<MeetingPermissionsTabProps> = ({ 
  meetingId, 
  variant = 'room' 
}) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedParticipantId, setExpandedParticipantId] = useState<string | null>(null);

  const isRoom = variant === 'room';
  const broadcastTriggerRef = React.useRef<((targetUserId?: string, userIds?: string[]) => void) | null>(null);

  // 1. Fetch participants
  const { data, isLoading } = useQuery<{ items: Participant[] }>({
    queryKey: ['meeting-participants', meetingId],
    queryFn: async () => {
      const response = await apiClient.get(`/meetings/${meetingId}/participants?limit=100`);
      return response.data;
    },
  });

  const participants = data?.items || [];

  // Mutations
  const updatePermissionMutation = useMutation({
    mutationFn: async ({ userId, permissions }: { userId: string, permissions: MeetingPermission[] }) => {
      return apiClient.put(`/meetings/${meetingId}/participants/${userId}/permissions`, { permissions });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['meeting-participants', meetingId] });
      broadcastTriggerRef.current?.(variables.userId);
    }
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: async (data: { action: 'grant' | 'revoke', permissions: MeetingPermission[] }) => {
      return apiClient.put(`/meetings/${meetingId}/participants/permissions/bulk`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meeting-participants', meetingId] });
      broadcastTriggerRef.current?.(undefined, participants.map(p => p.userId));
    }
  });

  const handleTogglePermission = (participant: Participant, permission: MeetingPermission) => {
    const currentPermissions = participant.permissions || [];
    const isGranted = currentPermissions.includes(permission);
    
    let newPermissions: MeetingPermission[];
    if (isGranted) {
      newPermissions = currentPermissions.filter(p => p !== permission);
    } else {
      newPermissions = [...currentPermissions, permission];
    }

    updatePermissionMutation.mutate({ 
      userId: participant.userId, 
      permissions: newPermissions 
    });
  };

  const handleBulkToggle = (permission: MeetingPermission, isCurrentlyAllGranted: boolean) => {
    bulkUpdateMutation.mutate({
      action: isCurrentlyAllGranted ? 'revoke' : 'grant',
      permissions: [permission]
    });
  };

  const filteredParticipants = participants.filter(p => 
    `${p.user.firstName} ${p.user.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const organizer = participants.find(p => p.isOrganizer);
  const otherParticipants = filteredParticipants.filter(p => !p.isOrganizer);
  const hasOthers = otherParticipants.length > 0;
  
  const getGlobalPermissionState = (permission: MeetingPermission) => {
    if (!hasOthers) return false;
    return otherParticipants.every(p => (p.permissions || []).includes(permission));
  };

  const permissionList = [
    { key: MeetingPermission.CO_HOST, label: t('meeting.permissions.list.co_host.label') },
    { key: MeetingPermission.MANAGE_POLLS, label: t('meeting.permissions.list.manage_polls.label') },
    { key: MeetingPermission.MANAGE_QA, label: t('meeting.permissions.list.manage_qa.label') },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`flex flex-col h-full ${isRoom ? '' : 'space-y-6'}`}
    >
      {isRoom && (
        <RoomPermissionsBroadcastHelper 
          meetingId={meetingId} 
          triggerRef={broadcastTriggerRef} 
        />
      )}
      {/* Header & Search Bar */}
      {isRoom ? (
        <div className="px-4 py-3 border-b border-white/5 space-y-3">
          <p className="text-[12px] font-medium text-slate-400 leading-relaxed">
            {t('meeting.permissions.subtitle')}
          </p>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
            <input 
              type="text" 
              placeholder={t('meeting.permissions.search_placeholder')}
              className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:ring-1 focus:ring-white/30 outline-none transition-all placeholder:text-slate-600"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      ) : (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900">{t('meeting.permissions.title')}</h2>
              <p className="text-sm font-medium text-slate-500">{t('meeting.permissions.subtitle')}</p>
            </div>
          </div>
          <div className="relative min-w-[300px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input 
              type="text" 
              placeholder={t('meeting.permissions.search_placeholder')}
              className="w-full pl-10 pr-4 py-2 bg-slate-100 border-none rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all placeholder:text-slate-400"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Participants List */}
      <div className={`flex-1 ${isRoom ? 'overflow-y-auto custom-scrollbar p-2 space-y-1.5' : 'space-y-4'}`}>
        {/* 1. Host */}
        {organizer && (
          <ParticipantRow 
            participant={organizer} 
            isRoom={isRoom} 
            isExpanded={expandedParticipantId === organizer.userId || !isRoom}
            onToggleExpand={() => isRoom && setExpandedParticipantId(expandedParticipantId === organizer.userId ? null : organizer.userId)}
            t={t}
            permissionList={permissionList}
            handleTogglePermission={handleTogglePermission}
          />
        )}

        {/* 2. ALL PARTICIPANTS (Bulk Action) - Drodown Style */}
        {hasOthers && !searchTerm && (
          <motion.div 
            layout
            className={`rounded-2xl border transition-all ${
              isRoom 
              ? 'bg-indigo-900/40 border-indigo-500/30 shadow-[0_0_20px_rgba(79,70,229,0.2)]' 
              : 'bg-indigo-50/50 border-indigo-100/50 shadow-sm'
            }`}
          >
            <div className={`${isRoom ? 'p-3' : 'p-4 flex flex-col lg:flex-row lg:items-start gap-6'}`}>
              <div 
                className={`${isRoom ? 'flex items-center gap-3 cursor-pointer' : 'flex items-center gap-4 lg:w-1/4 shrink-0 pointer-events-none'}`}
                onClick={() => isRoom && setExpandedParticipantId(expandedParticipantId === 'bulk' ? null : 'bulk')}
              >
                <div className="relative shrink-0">
                  <div className={`flex items-center justify-center rounded-xl ${isRoom ? 'h-9 w-9 bg-indigo-500 text-white' : 'h-12 w-12 bg-indigo-600 text-white shadow-lg shadow-indigo-200'}`}>
                    <Users className={`${isRoom ? 'h-5 w-5' : 'h-6 w-6'}`} />
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className={`font-black truncate ${isRoom ? 'text-[13px] text-white' : 'text-[15px] text-indigo-900'}`}>
                    {t('meeting.permissions.bulk_actions')}
                  </h4>
                  <p className={`truncate ${isRoom ? 'text-[11px] text-indigo-300' : 'text-sm text-indigo-400/80 font-medium'}`}>
                    {t('meeting.permissions.bulk_actions_desc')}
                  </p>
                </div>
                {isRoom && (
                  <div className={`p-1.5 rounded-lg transition-all ${expandedParticipantId === 'bulk' ? 'bg-white/10 text-white' : 'text-slate-500'}`}>
                    <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${expandedParticipantId === 'bulk' ? 'rotate-180' : ''}`} />
                  </div>
                )}
              </div>

              <div className="flex-1">
                <AnimatePresence initial={!isRoom}>
                  {(expandedParticipantId === 'bulk' || !isRoom) && (
                    <motion.div
                      initial={isRoom ? { height: 0, opacity: 0 } : false}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className={`overflow-hidden ${isRoom ? 'mt-3' : ''}`}
                    >
                      <div className={`grid gap-1.5 ${isRoom ? 'grid-cols-1 pt-1' : 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3'}`}>
                        {permissionList.map((perm) => {
                          const isAllGranted = getGlobalPermissionState(perm.key);
                          return (
                            <button
                              key={perm.key}
                              onClick={() => handleBulkToggle(perm.key, isAllGranted)}
                              className={`flex items-center justify-between px-3 py-2 rounded-xl border transition-all ${
                                isRoom 
                                ? isAllGranted ? 'bg-indigo-500 border-indigo-400 text-white' : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'
                                : isAllGranted ? 'bg-indigo-600 border-indigo-700 text-white shadow-md' : 'bg-white border-slate-200 text-slate-500 hover:border-indigo-300 hover:text-indigo-600'
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                 <div className={`h-1.5 w-1.5 rounded-full transition-all duration-300 ${
                                   isAllGranted ? 'bg-white shadow-[0_0_10px_rgba(255,255,255,1)]' : 'bg-slate-300'
                                 }`} />
                                 <span className={`text-[12px] font-bold transition-colors ${
                                   isAllGranted ? 'text-white' : (isRoom ? 'text-slate-400' : 'text-slate-500')
                                 }`}>{perm.label}</span>
                              </div>
                              {isRoom ? (
                                 <div className={`h-4 w-7 rounded-full relative transition-all duration-300 ${
                                   isAllGranted ? 'bg-white/40' : 'bg-slate-800'
                                 }`}>
                                    <div className={`absolute top-0.5 h-3 w-3 rounded-full transition-all duration-300 ${
                                      isAllGranted ? 'right-0.5 bg-white shadow-[0_0_15px_rgba(255,255,255,1)]' : 'left-0.5 bg-slate-500'
                                    }`} />
                                 </div>
                              ) : null}
                            </button>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        )}

        {/* 3. Others */}
        {otherParticipants.map((participant) => (
          <ParticipantRow 
            key={participant.id}
            participant={participant} 
            isRoom={isRoom} 
            isExpanded={expandedParticipantId === participant.userId || !isRoom}
            onToggleExpand={() => isRoom && setExpandedParticipantId(expandedParticipantId === participant.userId ? null : participant.userId)}
            t={t}
            permissionList={permissionList}
            handleTogglePermission={handleTogglePermission}
          />
        ))}

        {filteredParticipants.length === 0 && !isLoading && (
          <div className={`py-12 text-center rounded-3xl border border-dashed ${isRoom ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
            <Users className="h-8 w-8 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 text-xs font-bold">{t('meeting.permissions.no_results')}</p>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default MeetingPermissionsTab;
