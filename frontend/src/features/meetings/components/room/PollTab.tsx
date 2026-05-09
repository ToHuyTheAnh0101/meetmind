import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDataChannel } from '@livekit/components-react';
import { 
  BarChart3, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  X,
  ChevronRight
} from 'lucide-react';
import { motion } from 'framer-motion';
import apiClient from '@/lib/apiClient';

interface PollOption {
  id: string;
  text: string;
  voterIds: string[];
}

interface Poll {
  id: string;
  question: string;
  type: 'single' | 'multiple';
  options: PollOption[];
  closedAt: string | null;
  createdAt: string;
  createdByUserId: string;
}

interface PollTabProps {
  meetingId: string;
  userId: string;
  canManagePolls: boolean;
  onOpenCreateModal: () => void;
}

const PollTab: React.FC<PollTabProps> = ({ meetingId, userId, canManagePolls, onOpenCreateModal }) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { send } = useDataChannel();

  // Fetch Polls
  const { data: polls = [] } = useQuery<Poll[]>({
    queryKey: ['polls', meetingId],
    queryFn: async () => {
      const response = await apiClient.get(`/meetings/${meetingId}/polls`);
      return response.data;
    }
  });

  // Listener for real-time updates
  React.useEffect(() => {
    const handleRefresh = (e: any) => {
      if (e.detail?.meetingId === meetingId) {
        queryClient.invalidateQueries({ queryKey: ['polls', meetingId] });
      }
    };
    window.addEventListener('refresh-polls', handleRefresh);
    return () => window.removeEventListener('refresh-polls', handleRefresh);
  }, [meetingId, queryClient]);

  // Vote Mutation
  const voteMutation = useMutation({
    mutationFn: async ({ pollId, optionId }: { pollId: string; optionId: string }) => {
      return apiClient.post(`/meetings/${meetingId}/polls/${pollId}/vote`, { optionId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['polls', meetingId] });
      // Broadcast update
      const encoder = new TextEncoder();
      send(encoder.encode(JSON.stringify({ type: 'POLL_UPDATED', pollId: meetingId })), { reliable: true });
    }
  });

  // Close Mutation
  const closeMutation = useMutation({
    mutationFn: async (pollId: string) => {
      return apiClient.post(`/meetings/${meetingId}/polls/${pollId}/close`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['polls', meetingId] });
      // Broadcast update
      const encoder = new TextEncoder();
      send(encoder.encode(JSON.stringify({ type: 'POLL_UPDATED', pollId: meetingId })), { reliable: true });
    }
  });

  const activePolls = polls.filter(p => !p.closedAt);
  const closedPolls = polls.filter(p => p.closedAt);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
        {/* Action Header */}
        {canManagePolls && (
          <button 
            onClick={onOpenCreateModal}
            className="w-full py-3.5 px-6 rounded-2xl bg-rose-500 text-white font-bold flex items-center justify-center gap-2.5 shadow-[0_8px_20px_rgba(244,63,94,0.2)] hover:scale-[1.02] active:scale-95 transition-all mb-8 border border-rose-400/20"
          >
            <Plus className="h-5 w-5" />
            <span className="text-[15px]">{t('meeting.create_poll') || 'Tạo bình chọn mới'}</span>
          </button>
        )}

        {/* Active Polls Section */}
        <section className="space-y-6">
          <h4 className="text-[12px] font-bold text-slate-500 tracking-[0.05em] flex items-center gap-2 px-1">
             <div className="h-1.5 w-1.5 rounded-full bg-rose-500 shadow-[0_0_8px_#f43f5e]" />
             {t('meeting.active_polls') || 'Đang diễn ra'}
          </h4>
          {activePolls.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center px-6 bg-white/5 rounded-[2.5rem] border border-white/5">
              <div className="h-16 w-16 rounded-full bg-white/5 flex items-center justify-center mb-6">
                <BarChart3 className="h-8 w-8 text-slate-600" />
              </div>
              <h5 className="text-white font-bold text-lg mb-2">{t('meeting.no_active_polls')}</h5>
              <p className="text-slate-500 text-sm leading-relaxed max-w-[240px]">
                {t('meeting.poll_subtitle')}
              </p>
            </div>
          ) : (
            activePolls.map(poll => (
              <PollItem 
                key={poll.id} 
                poll={poll} 
                userId={userId} 
                onVote={(optionId) => voteMutation.mutate({ pollId: poll.id, optionId })}
                onClose={() => closeMutation.mutate(poll.id)}
                canManage={canManagePolls}
              />
            ))
          )}
        </section>

        {/* Closed Polls */}
        {closedPolls.length > 0 && (
          <section className="space-y-6 pt-4">
            <h4 className="text-[12px] font-bold text-slate-500 tracking-[0.05em] flex items-center gap-2 px-1">
               <div className="h-1.5 w-1.5 rounded-full bg-slate-600" />
               {t('meeting.closed_polls') || 'Đã kết thúc'}
            </h4>
            {closedPolls.map(poll => (
              <PollItem 
                key={poll.id} 
                poll={poll} 
                userId={userId} 
                canManage={canManagePolls}
                isClosed
              />
            ))}
          </section>
        )}
      </div>
    </div>
  );
};

const PollItem: React.FC<{ 
  poll: Poll; 
  userId: string; 
  onVote?: (id: string) => void;
  onClose?: () => void;
  canManage: boolean;
  isClosed?: boolean;
}> = ({ poll, userId, onVote, onClose, canManage, isClosed }) => {
  const { t } = useTranslation();
  const userVotedOptions = poll.options.filter(o => o.voterIds.includes(userId)).map(o => o.id);
  const hasVotedAtAll = userVotedOptions.length > 0;
  const totalVotes = poll.options.reduce((acc, curr) => acc + curr.voterIds.length, 0);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-7 rounded-[2.5rem] border transition-all ${isClosed ? 'bg-white/5 border-white/5 grayscale opacity-60' : 'bg-white/5 border-white/10 hover:border-white/20 shadow-2xl'}`}
    >
      <div className="flex justify-between items-start gap-4 mb-6">
        <div className="flex-1">
          <h5 className="text-[17px] font-bold text-white leading-snug mb-1">
            {poll.question}
          </h5>
          <span className="text-[10px] font-bold text-slate-500 tracking-[0.05em]">
            {poll.type === 'multiple' ? (t('meeting.poll_type_multiple') || 'Nhiều lựa chọn') : (t('meeting.poll_type_single') || 'Lựa chọn duy nhất')}
          </span>
        </div>
        {canManage && !isClosed && (
          <button 
            onClick={onClose}
            className="p-2.5 rounded-2xl bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 transition-all active:scale-90"
            title={t('common.close') || 'Đóng'}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="space-y-3">
        {poll.options.map(option => {
          const voteCount = option.voterIds.length;
          const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
          const isSelected = userVotedOptions.includes(option.id);
          const isVoteDisabled = isClosed || (poll.type === 'single' && hasVotedAtAll) || isSelected;

          return (
            <div key={option.id} className="space-y-2">
              <button
                disabled={isVoteDisabled}
                onClick={() => onVote?.(option.id)}
                className={`w-full relative group overflow-hidden rounded-[1.25rem] border transition-all py-4 px-5 flex items-center justify-between ${isSelected ? 'border-rose-500/50 bg-rose-500/10' : (hasVotedAtAll || isClosed) ? 'border-white/5 bg-white/[0.02]' : 'border-white/5 bg-white/5 hover:border-white/20 hover:bg-white/[0.08]'}`}
              >
                 {/* Progress Bar Background */}
                 {(hasVotedAtAll || isClosed) && (
                   <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      className={`absolute left-0 top-0 bottom-0 ${isSelected ? 'bg-rose-500/20' : 'bg-white/5'} transition-all duration-1000`}
                   />
                 )}

                 <span className={`relative z-10 text-[14px] font-medium ${isSelected ? 'text-rose-400' : 'text-slate-300'}`}>
                    {option.text}
                 </span>

                 <div className="relative z-10 flex items-center gap-2">
                    {(hasVotedAtAll || isClosed) && (
                      <span className={`text-[12px] font-bold ${isSelected ? 'text-rose-400' : 'text-slate-500'}`}>
                        {percentage}%
                      </span>
                    )}
                    {isSelected && <CheckCircle2 className="h-4 w-4 text-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]" />}
                 </div>
              </button>
            </div>
          );
        })}
      </div>

      <div className="mt-6 pt-5 border-t border-white/5 flex items-center justify-between">
         <span className="text-[11px] font-bold text-slate-500 tracking-[0.05em]">
            {totalVotes} {t('meeting.votes') || 'lượt bình chọn'}
         </span>
         <span className="text-[11px] font-medium text-slate-600">
            {new Date(poll.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
         </span>
      </div>
    </motion.div>
  );
};

export default PollTab;
