import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/apiClient';
import { UserPlus, Check, X, Loader2 } from 'lucide-react';
import { Participant, ParticipantStatus } from '@/types/api';

interface LobbyManagementProps {
  meetingId: string;
}

const LobbyManagement: React.FC<LobbyManagementProps> = ({ meetingId }) => {
  const queryClient = useQueryClient();

  // 1. Fetch participants (including waiting ones)
  const { data: participants, isLoading } = useQuery<Participant[]>({
    queryKey: ['meeting-participants', meetingId],
    queryFn: async () => {
      const response = await apiClient.get(`/meetings/${meetingId}/participants`);
      return response.data;
    },
    // Poll every 5 seconds to catch new waiting users
    refetchInterval: 5000,
  });

  const waitingUsers = participants?.filter(p => p.status === ParticipantStatus.WAITING) || [];

  // 2. Admit Mutation
  const admitMutation = useMutation({
    mutationFn: async (userId: string) => {
      return apiClient.post(`/meetings/${meetingId}/admit/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meeting-participants', meetingId] });
    }
  });

  // 3. Reject Mutation
  const rejectMutation = useMutation({
    mutationFn: async (userId: string) => {
      return apiClient.post(`/meetings/${meetingId}/reject/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meeting-participants', meetingId] });
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
      <div className="mb-8">
        <h4 className="text-[18px] text-emerald-600 flex items-center gap-2 font-premium-ink">
           <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
           Waiting room ({waitingUsers.length})
        </h4>
        <p className="text-[13px] font-medium text-slate-500 mt-1.5 px-0.5">
           Review guest access requests
        </p>
      </div>

      {waitingUsers.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center mt-[-10%]">
           <div className="h-20 w-20 rounded-[2rem] bg-slate-50 border border-slate-100 flex items-center justify-center mb-6">
              <UserPlus className="h-8 w-8 text-slate-300" />
           </div>
           <p className="text-[15px] font-bold text-slate-800 tracking-wide">No pending requests</p>
           <p className="text-[13px] font-medium text-slate-400 mt-2">When someone tries to join, they will appear here.</p>
        </div>
      ) : (
        <div className="space-y-4">
           {waitingUsers.map((p) => (
              <div key={p.userId} className="py-4 border-b border-slate-50 flex items-center justify-between group transition-all">
                 <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-xs font-bold text-slate-300 overflow-hidden border border-slate-100 group-hover:border-emerald-200 transition-colors">
                       {p.user?.profilePictureUrl ? (
                         <img src={p.user.profilePictureUrl} className="h-full w-full object-cover" alt="" />
                       ) : (
                         <UserPlus className="h-4 w-4 opacity-40" />
                       )}
                    </div>
                    <div>
                       <p className="text-sm font-bold text-slate-800 group-hover:text-emerald-600 transition-colors">{p.user?.firstName} {p.user?.lastName}</p>
                       <p className="text-[10px] font-medium text-slate-400 mt-0.5">Requesting access</p>
                    </div>
                 </div>
                 
                 <div className="flex items-center gap-2 translate-x-2 group-hover:translate-x-0 transition-transform">
                    <button 
                      onClick={() => admitMutation.mutate(p.userId)}
                      disabled={admitMutation.isPending}
                      className="h-8 w-8 flex items-center justify-center rounded-lg bg-emerald-50 hover:bg-emerald-500 text-emerald-600 hover:text-white transition-all active:scale-95 disabled:opacity-50"
                    >
                       <Check className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={() => rejectMutation.mutate(p.userId)}
                      disabled={rejectMutation.isPending}
                      className="h-8 w-8 flex items-center justify-center rounded-lg bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-500 transition-all active:scale-95 disabled:opacity-50"
                    >
                       <X className="h-4 w-4" />
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
