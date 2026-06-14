import React from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDataChannel } from '@livekit/components-react';
import {
  BarChart3,
  Plus,
  CheckCircle2,
  Check,
  Lock as LockIcon,
  Users,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import apiClient from '@/lib/apiClient';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Voter {
  id: string;
  name: string;
  avatarUrl?: string;
}

interface PollOption {
  id: string;
  text: string;
  voterIds: string[];
  voters: Voter[];
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
  isInBreakout?: boolean;
}

// ─── Voter Avatar Stack ────────────────────────────────────────────────────────

const VoterAvatarStack: React.FC<{
  voters: Voter[];
  onShowDetail: () => void;
  isSelected: boolean;
}> = ({ voters, onShowDetail, isSelected }) => {
  if (voters.length === 0) return null;

  const MAX_VISIBLE = 4;
  const visible = voters.slice(0, MAX_VISIBLE);
  const overflow = voters.length - MAX_VISIBLE;

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onShowDetail();
      }}
      className="flex items-center gap-1.5 group/stack"
      title={`${voters.length} người đã bình chọn`}
    >
      <div className="flex -space-x-2">
        {visible.map((voter, i) => (
          <div
            key={voter.id}
            style={{ zIndex: MAX_VISIBLE - i }}
            className="relative h-5 w-5 rounded-full border border-slate-900 overflow-hidden bg-slate-700 shrink-0"
            title={voter.name}
          >
            {voter.avatarUrl ? (
              <img
                src={voter.avatarUrl}
                alt={voter.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div
                className={`h-full w-full flex items-center justify-center text-[7px] font-bold ${
                  isSelected ? 'bg-rose-500/60 text-white' : 'bg-slate-600 text-slate-300'
                }`}
              >
                {voter.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        ))}
        {overflow > 0 && (
          <div
            className="relative h-5 w-5 rounded-full border border-slate-900 bg-slate-700 flex items-center justify-center text-[7px] font-bold text-slate-300 shrink-0"
            style={{ zIndex: 0 }}
          >
            +{overflow}
          </div>
        )}
      </div>
      <Users
        className={`h-3 w-3 opacity-0 group-hover/stack:opacity-100 transition-opacity ${
          isSelected ? 'text-rose-400' : 'text-slate-500'
        }`}
      />
    </button>
  );
};

// ─── Voter Detail Modal ────────────────────────────────────────────────────────

const VoterDetailModal: React.FC<{
  optionText: string;
  voters: Voter[];
  onClose: () => void;
}> = ({ optionText, voters, onClose }) => {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        onClick={onClose}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

        {/* Panel */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 12 }}
          transition={{ type: 'spring', stiffness: 340, damping: 28 }}
          className="relative z-10 bg-[#181820] border border-white/10 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between p-5 pb-3 border-b border-white/5">
            <div>
              <p className="text-[10px] font-semibold text-rose-400 uppercase tracking-widest mb-1">
                Người đã bình chọn
              </p>
              <h3 className="text-[13px] font-bold text-white leading-snug break-all max-w-[230px]">
                "{optionText}"
              </h3>
            </div>
            <button
              onClick={onClose}
              className="h-7 w-7 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors shrink-0 ml-3"
            >
              <X className="h-3.5 w-3.5 text-slate-400" />
            </button>
          </div>

          {/* Voter List */}
          <div className="p-4 max-h-72 overflow-y-auto custom-scrollbar space-y-1.5">
            {voters.length === 0 ? (
              <p className="text-center text-slate-500 text-[12px] py-6">
                Chưa có ai bình chọn
              </p>
            ) : (
              voters.map((voter, i) => (
                <motion.div
                  key={voter.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex items-center gap-3 p-2.5 rounded-2xl bg-white/5 hover:bg-white/8 transition-colors"
                >
                  <div className="h-8 w-8 rounded-full overflow-hidden bg-slate-700 shrink-0 border border-white/10">
                    {voter.avatarUrl ? (
                      <img
                        src={voter.avatarUrl}
                        alt={voter.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-[11px] font-bold bg-rose-500/30 text-rose-300">
                        {voter.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <span className="text-[12px] font-medium text-slate-200 truncate">
                    {voter.name}
                  </span>
                </motion.div>
              ))
            )}
          </div>

          {/* Footer count */}
          <div className="px-5 py-3 border-t border-white/5">
            <span className="text-[11px] text-slate-500 font-semibold">
              {voters.length} lượt bình chọn
            </span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// ─── Poll Item ─────────────────────────────────────────────────────────────────

const PollItem: React.FC<{
  poll: Poll;
  userId: string;
  onVote?: (id: string) => void;
  onClose?: () => void;
  canManage: boolean;
  isClosed?: boolean;
}> = ({ poll, userId, onVote, onClose, canManage, isClosed }) => {
  const { t } = useTranslation();
  const [voterModal, setVoterModal] = React.useState<{
    optionText: string;
    voters: Voter[];
  } | null>(null);

  const userVotedOptions = poll.options
    .filter((o) => o.voterIds.includes(userId))
    .map((o) => o.id);
  const hasVotedAtAll = userVotedOptions.length > 0;
  const totalVotes = poll.options.reduce(
    (acc, curr) => acc + curr.voterIds.length,
    0,
  );

  return (
    <>
      {voterModal && (
        <VoterDetailModal
          optionText={voterModal.optionText}
          voters={voterModal.voters}
          onClose={() => setVoterModal(null)}
        />
      )}

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`p-5 rounded-[2.5rem] border transition-all ${
          isClosed
            ? 'bg-white/5 border-white/5 grayscale opacity-60'
            : 'bg-white/5 border-white/10 hover:border-white/20 shadow-2xl'
        }`}
      >
        <div className="flex justify-end mb-2">
          {canManage && !isClosed ? (
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 transition-all active:scale-95 text-[10px] font-bold border border-rose-500/20 shrink-0"
            >
              {t('meeting.lock_poll') || 'Khóa bình chọn'}
            </button>
          ) : (
            isClosed && (
              <div className="px-3 py-1.5 rounded-xl bg-white/5 text-slate-400 text-[10px] font-bold border border-white/10 shrink-0 flex items-center gap-1.5">
                <LockIcon className="h-3 w-3" />
                {t('meeting.poll_closed') || 'Bình chọn đã đóng'}
              </div>
            )
          )}
        </div>

        <div className="mb-4">
          <h5 className="text-[13px] font-bold text-white leading-snug break-all">
            {poll.question}
          </h5>
        </div>

        <div className="space-y-2">
          {poll.options.map((option) => {
            const voteCount = option.voterIds.length;
            const percentage =
              totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
            const isSelected = userVotedOptions.includes(option.id);
            const isVoteDisabled = isClosed;

            return (
              <div key={option.id} className="space-y-2">
                <button
                  disabled={isVoteDisabled}
                  onClick={() => onVote?.(option.id)}
                  className={`w-full relative group overflow-hidden rounded-[1.25rem] border transition-all py-3 px-4 flex flex-col items-start gap-2 text-left ${
                    isSelected
                      ? 'border-rose-500/40 bg-rose-500/10'
                      : hasVotedAtAll || isClosed
                        ? 'border-white/5 bg-white/[0.02]'
                        : 'border-white/5 bg-white/5 hover:border-white/20 hover:bg-white/[0.08]'
                  }`}
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
                    <div
                      className={`h-3.5 w-3.5 shrink-0 border-2 transition-all flex items-center justify-center ${
                        poll.type === 'multiple' ? 'rounded-[4px]' : 'rounded-full'
                      } ${isSelected ? 'border-rose-500 bg-rose-500' : 'border-white/20 group-hover:border-white/40'}`}
                    >
                      {isSelected &&
                        (poll.type === 'multiple' ? (
                          <Check className="h-2 w-2 text-white stroke-[4px]" />
                        ) : (
                          <div className="h-1 w-1 rounded-full bg-white" />
                        ))}
                    </div>

                    <span
                      className={`text-[12px] font-medium break-all whitespace-normal flex-1 ${isSelected ? 'text-rose-400' : 'text-slate-300'}`}
                    >
                      {option.text}
                    </span>
                  </div>

                  {(hasVotedAtAll || isClosed) && (
                    <div className="relative z-10 flex items-center justify-between w-full mt-0.5 border-t border-white/5 pt-1.5">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-bold ${isSelected ? 'text-rose-400' : 'text-slate-500'}`}
                        >
                          {percentage}%
                        </span>

                        {/* ── Avatar Stack ── */}
                        {option.voters && option.voters.length > 0 && (
                          <VoterAvatarStack
                            voters={option.voters}
                            isSelected={isSelected}
                            onShowDetail={() =>
                              setVoterModal({
                                optionText: option.text,
                                voters: option.voters,
                              })
                            }
                          />
                        )}
                      </div>

                      {isSelected && (
                        <CheckCircle2 className="h-3 w-3 text-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.3)]" />
                      )}
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
            {new Date(poll.createdAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
      </motion.div>
    </>
  );
};

// ─── Poll Tab (Main) ───────────────────────────────────────────────────────────

const PollTab: React.FC<PollTabProps> = ({
  meetingId,
  userId,
  canManagePolls,
  onOpenCreateModal,
  isInBreakout,
}) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { send } = useDataChannel();

  // Fetch Polls
  const { data: polls = [] } = useQuery<Poll[]>({
    queryKey: ['polls', meetingId, isInBreakout],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (isInBreakout) {
        params.breakoutRoomId = 'current';
      }
      const response = await apiClient.get(`/meetings/${meetingId}/polls`, { params });
      return response.data;
    },
  });

  // Listener for real-time updates
  React.useEffect(() => {
    const handleRefresh = (e: Event) => {
      const detail = (e as CustomEvent<{ meetingId: string }>).detail;
      if (detail?.meetingId === meetingId) {
        queryClient.invalidateQueries({ queryKey: ['polls', meetingId] });
      }
    };
    window.addEventListener('refresh-polls', handleRefresh);
    return () => window.removeEventListener('refresh-polls', handleRefresh);
  }, [meetingId, queryClient]);

  // Vote Mutation
  const voteMutation = useMutation({
    mutationFn: async ({
      pollId,
      optionId,
    }: {
      pollId: string;
      optionId: string;
    }) => {
      return apiClient.post(`/meetings/${meetingId}/polls/${pollId}/vote`, {
        optionId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['polls', meetingId] });
      const encoder = new TextEncoder();
      send(
        encoder.encode(
          JSON.stringify({ type: 'POLL_UPDATED', pollId: meetingId }),
        ),
        { reliable: true },
      );
    },
  });

  // Close Mutation
  const closeMutation = useMutation({
    mutationFn: async (pollId: string) => {
      return apiClient.post(`/meetings/${meetingId}/polls/${pollId}/close`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['polls', meetingId] });
      const encoder = new TextEncoder();
      send(
        encoder.encode(
          JSON.stringify({ type: 'POLL_UPDATED', pollId: meetingId }),
        ),
        { reliable: true },
      );
    },
  });

  const activePolls = polls.filter((p) => !p.closedAt);
  const closedPolls = polls.filter((p) => p.closedAt);

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
            <span className="text-[15px]">
              {t('meeting.create_poll') || 'Tạo bình chọn mới'}
            </span>
          </button>
        )}

        {/* Empty State */}
        {polls.length === 0 && (
          <div className="py-12 flex flex-col items-center justify-center text-center px-6 bg-white/5 rounded-[2.5rem] border border-white/5">
            <div className="h-16 w-16 rounded-full bg-white/5 flex items-center justify-center mb-6">
              <BarChart3 className="h-8 w-8 text-slate-600" />
            </div>
            <h5 className="text-white font-bold text-lg mb-2">
              {t('meeting.no_active_polls')}
            </h5>
            <p className="text-slate-500 text-sm leading-relaxed max-w-[240px]">
              {t('meeting.poll_subtitle')}
            </p>
          </div>
        )}

        {/* Active Polls Section */}
        {activePolls.length > 0 && (
          <section className="space-y-6">
            {activePolls.map((poll) => (
              <PollItem
                key={poll.id}
                poll={poll}
                userId={userId}
                onVote={(optionId) =>
                  voteMutation.mutate({ pollId: poll.id, optionId })
                }
                onClose={() => closeMutation.mutate(poll.id)}
                canManage={canManagePolls}
              />
            ))}
          </section>
        )}

        {/* Closed Polls */}
        {closedPolls.length > 0 && (
          <section className="space-y-6 pt-4">
            {closedPolls.map((poll) => (
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

export default PollTab;
