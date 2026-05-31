import React from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/apiClient';
import { UserPlus, Check, Loader2 } from 'lucide-react';
import { Participant, ParticipantStatus, PaginatedResponse } from '@/types/api';

interface LobbyManagementProps {
  meetingId: string;
  enabled?: boolean;
}

const LobbyManagement: React.FC<LobbyManagementProps> = ({ meetingId, enabled }) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  // 1. Fetch participants (including waiting ones)
  const { data: participants, isLoading } = useQuery<PaginatedResponse<Participant>>({
    queryKey: ['meeting-participants', meetingId],
    queryFn: async () => {
      const response = await apiClient.get(`/meetings/${meetingId}/participants`);
      return response.data;
    },
    // Poll every 5 seconds to catch new waiting users when enabled
    refetchInterval: typeof enabled === 'boolean' ? (enabled ? 5000 : false) : 5000,
  });

  const waitingUsers = participants?.items?.filter(p => p.status === ParticipantStatus.WAITING) || [];

  // 2. Admit Mutation
  const admitMutation = useMutation({
    mutationFn: async (userId: string) => {
      console.log(`LobbyManagement: Attempting to admit user ${userId} to meeting ${meetingId}`);
      return apiClient.post(`/meetings/${meetingId}/admit/${userId}`);
    },
    onSuccess: () => {
      console.log('LobbyManagement: Successfully admitted user');
      queryClient.invalidateQueries({ queryKey: ['meeting-participants', meetingId] });
    },
    onError: (error) => {
      console.error('LobbyManagement: Failed to admit user', error);
    }
  });

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col p-6 overflow-y-auto custom-scrollbar">
      <div className="mb-6 flex justify-start">
        <h4 className="text-[14px] text-emerald-400 flex items-center gap-2 font-premium-ink">
           <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981] animate-pulse" />
           {t('meeting.waiting_room_count', { count: waitingUsers.length })}
        </h4>
      </div>

      {waitingUsers.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center mt-[-10%]">
            <div className="h-24 w-24 rounded-[2.5rem] bg-white/5 border border-white/10 flex items-center justify-center mb-8">
               <UserPlus className="h-10 w-10 text-slate-600" />
            </div>
            <p className="text-[17px] font-bold text-white tracking-wide">{t('meeting.no_pending_requests')}</p>
            <p className="text-[13px] font-medium text-slate-500 mt-3 max-w-[200px] leading-relaxed">{t('meeting.wait_for_join')}</p>
         </div>
      ) : (
        <div className="space-y-4">
           {waitingUsers.map((p) => (
              <div key={p.userId} className="p-4 rounded-[1.5rem] hover:bg-white/5 border border-transparent hover:border-white/10 flex items-center justify-between group transition-all duration-300">
                 <div className="flex items-center gap-3.5 min-w-0">
                   <div className="h-12 w-12 rounded-2xl bg-white/10 shadow-sm flex items-center justify-center overflow-hidden border border-white/5 group-hover:border-emerald-500/30 transition-colors flex-shrink-0">
                      <img 
                        src={p.user?.picture || p.user?.profilePictureUrl || `https://ui-avatars.com/api/?name=${p.user?.firstName}+${p.user?.lastName}&background=random`} 
                        className="h-full w-full object-cover" 
                        alt="" 
                      />
                   </div>
                    <div className="min-w-0">
                       <p className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors truncate">{p.user?.firstName} {p.user?.lastName}</p>
                       <p className="text-[11px] font-bold text-slate-500 mt-1">{t('meeting.requesting_access')}</p>
                    </div>
                 </div>
                 
                 <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                    <button 
                      onClick={() => admitMutation.mutate(p.userId)}
                      disabled={admitMutation.isPending}
                      title="Chấp nhận"
                      className="h-10 w-10 flex items-center justify-center rounded-[1.25rem] bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 hover:-translate-y-0.5 transition-all active:scale-95 disabled:opacity-50"
                    >
                       {admitMutation.isPending ? (
                         <Loader2 className="h-5 w-5 animate-spin" />
                       ) : (
                         <Check className="h-5 w-5" />
                       )}
                    </button>
                 </div>
              </div>
           ))}
        </div>
      )}
    </div>
  );
};

export default LobbyManagement;
