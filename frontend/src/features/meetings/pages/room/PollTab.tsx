import React from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDataChannel } from '@livekit/components-react';
import { 
  BarChart3, 
  Plus, 
  CheckCircle2,
  Check,
  Lock as LockIcon
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

        {/* Empty State */}
        {polls.length === 0 && (
          <div className="py-12 flex flex-col items-center justify-center text-center px-6 bg-white/5 rounded-[2.5rem] border border-white/5">
            <div className="h-16 w-16 rounded-full bg-white/5 flex items-center justify-center mb-6">
              <BarChart3 className="h-8 w-8 text-slate-600" />
            </div>
            <h5 className="text-white font-bold text-lg mb-2">{t('meeting.no_active_polls')}</h5>
            <p className="text-slate-500 text-sm leading-relaxed max-w-[240px]">
              {t('meeting.poll_subtitle')}
            </p>
          </div>
        )}

        {/* Active Polls Section */}
        {activePolls.length > 0 && (
          <section className="space-y-6">
            {activePolls.map(poll => (
              <PollItem 
                key={poll.id} 
                poll={poll} 
                userId={userId} 
                onVote={(optionId) => voteMutation.mutate({ pollId: poll.id, optionId })}
                onClose={() => closeMutation.mutate(poll.id)}
                canManage={canManagePolls}
              />
            ))}
          </section>
        )}

        {/* Closed Polls */}
        {closedPolls.length > 0 && (
          <section className="space-y-6 pt-4">
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
      className={`p-5 rounded-[2.5rem] border transition-all ${isClosed ? 'bg-white/5 border-white/5 grayscale opacity-60' : 'bg-white/5 border-white/10 hover:border-white/20 shadow-2xl'}`}
    >
      <div className="flex justify-end mb-2">
        {canManage && !isClosed ? (
          <button 
            onClick={onClose}
            className="px-3 py-1.5 rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 transition-all active:scale-95 text-[10px] font-bold border border-rose-500/20 shrink-0"
          >
            {t('meeting.lock_poll') || 'Khóa bình chọn'}
          </button>
        ) : isClosed && (
          <div className="px-3 py-1.5 rounded-xl bg-white/5 text-slate-400 text-[10px] font-bold border border-white/10 shrink-0 flex items-center gap-1.5">
             <LockIcon className="h-3 w-3" />
             {t('meeting.poll_closed') || 'Bình chọn đã đóng'}
          </div>
        )}
      </div>

      <div className="mb-4">
        <h5 className="text-[13px] font-bold text-white leading-snug break-all">
          {poll.question}
        </h5>
      </div>

      <div className="space-y-2">
        {poll.options.map(option => {
          const voteCount = option.voterIds.length;
          const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
          const isSelected = userVotedOptions.includes(option.id);
          const isVoteDisabled = isClosed;

          return (
            <div key={option.id} className="space-y-2">
              <button
                disabled={isVoteDisabled}
                onClick={() => onVote?.(option.id)}
                className={`w-full relative group overflow-hidden rounded-[1.25rem] border transition-all py-3 px-4 flex flex-col items-start gap-2 text-left ${isSelected ? 'border-rose-500/40 bg-rose-500/10' : (hasVotedAtAll || isClosed) ? 'border-white/5 bg-white/[0.02]' : 'border-white/5 bg-white/5 hover:border-white/20 hover:bg-white/[0.08]'}`}
              >
                 {/* Progress Bar Background */}
                 {(hasVotedAtAll || isClosed) && (
                   <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      className={`absolute left-0 top-0 bottom-0 ${isSelected ? 'bg-rose-500/20' : 'bg-white/5'} transition-all duration-1000`}
                   />
                 )}

                 <div className="relative z-10 flex items-center gap-3 w-full">
                    {/* Visual Indicator: Radio or Checkbox */}
                    <div className={`h-3.5 w-3.5 shrink-0 border-2 transition-all flex items-center justify-center ${poll.type === 'multiple' ? 'rounded-[4px]' : 'rounded-full'} ${isSelected ? 'border-rose-500 bg-rose-500' : 'border-white/20 group-hover:border-white/40'}`}>
                      {isSelected && (
                         poll.type === 'multiple' 
                         ? <Check className="h-2 w-2 text-white stroke-[4px]" />
                         : <div className="h-1 w-1 rounded-full bg-white" />
                      )}
                    </div>

                    <span className={`text-[12px] font-medium break-all whitespace-normal flex-1 ${isSelected ? 'text-rose-400' : 'text-slate-300'}`}>
                       {option.text}
                    </span>
                 </div>

                 {(hasVotedAtAll || isClosed) && (
                   <div className="relative z-10 flex items-center justify-between w-full mt-0.5 border-t border-white/5 pt-1.5">
                      <span className={`text-[10px] font-bold ${isSelected ? 'text-rose-400' : 'text-slate-500'}`}>
                        {percentage}%
                      </span>
                      {isSelected && <CheckCircle2 className="h-3 w-3 text-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.3)]" />}
                   </div>
                 )}
               </button>
            </div>
          );
        })}
      </div>

      <div className="mt-5 pt-4 border-t border-white/5 flex items-center justify-between">
         <span className="text-[12px] font-bold text-slate-400 tracking-[0.05em]">
            {totalVotes} {t('meeting.votes') || 'lượt bình chọn'}
         </span>
         <span className="text-[12px] font-medium text-slate-400">
            {new Date(poll.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
         </span>
      </div>
    </motion.div>
  );
};

export default PollTab;
