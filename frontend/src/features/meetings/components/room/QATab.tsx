import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDataChannel } from '@livekit/components-react';
import { 
  MessageSquare, 
  HelpCircle, 
  Send, 
  CheckCircle2, 
  User, 
  XCircle,
  EyeOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import apiClient from '@/lib/apiClient';

interface Answer {
  id: string;
  content: string;
  answeredByUserId: string;
  answeredByUser?: {
    firstName: string;
    lastName: string;
  };
  createdAt: string;
}

interface Question {
  id: string;
  content: string;
  askedByUserId: string;
  askedByUser?: {
    firstName: string;
    lastName: string;
  };
  askedByParticipant?: {
    displayName: string;
  };
  type: 'host_qa' | 'audience_qa';
  isAnonymous: boolean;
  status: 'pending' | 'answered' | 'dismissed';
  upvoterIds: string[];
  answers: Answer[];
  createdAt: string;
}

interface QATabProps {
  meetingId: string;
  userId: string;
  hasManagePrivilege: boolean;
  isQaEnabled: boolean;
  isAnonymousAllowed: boolean;
}

const QATab: React.FC<QATabProps> = ({ 
  meetingId, 
  userId, 
  hasManagePrivilege,
  isQaEnabled,
  isAnonymousAllowed 
}) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { send } = useDataChannel();
  const [activeSubTab, setActiveSubTab] = useState<'discussion' | 'qa'>('discussion');
  const [newQuestion, setNewQuestion] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');

  // Fetch Questions
  const { data: questions = [] } = useQuery<Question[]>({
    queryKey: ['questions', meetingId],
    queryFn: async () => {
      const response = await apiClient.get(`/meetings/${meetingId}/qa`);
      return response.data;
    }
  });

  // Real-time Listener
  useEffect(() => {
    const handleRefresh = (e: any) => {
      if (e.detail?.meetingId === meetingId) {
        queryClient.invalidateQueries({ queryKey: ['questions', meetingId] });
      }
    };
    window.addEventListener('refresh-qa', handleRefresh);
    return () => window.removeEventListener('refresh-qa', handleRefresh);
  }, [meetingId, queryClient]);

  // Mutations
  const createQuestionMutation = useMutation({
    mutationFn: async (data: { content: string; type: 'host_qa' | 'audience_qa'; isAnonymous: boolean }) => {
      return apiClient.post(`/meetings/${meetingId}/qa`, data);
    },
    onSuccess: () => {
      setNewQuestion('');
      setIsAnonymous(false);
      queryClient.invalidateQueries({ queryKey: ['questions', meetingId] });
      // Broadcast update
      const encoder = new TextEncoder();
      send(encoder.encode(JSON.stringify({ type: 'QA_UPDATED', meetingId })), { reliable: true });
    }
  });

  const answerMutation = useMutation({
    mutationFn: async ({ questionId, content }: { questionId: string; content: string }) => {
      return apiClient.post(`/meetings/${meetingId}/qa/${questionId}/answers`, { content });
    },
    onSuccess: () => {
      setReplyTo(null);
      setReplyContent('');
      queryClient.invalidateQueries({ queryKey: ['questions', meetingId] });
      const encoder = new TextEncoder();
      send(encoder.encode(JSON.stringify({ type: 'QA_UPDATED', meetingId })), { reliable: true });
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ questionId, status }: { questionId: string; status: string }) => {
      return apiClient.patch(`/meetings/${meetingId}/qa/${questionId}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questions', meetingId] });
      const encoder = new TextEncoder();
      send(encoder.encode(JSON.stringify({ type: 'QA_UPDATED', meetingId })), { reliable: true });
    }
  });

  const discussionQuestions = questions.filter(q => q.type === 'host_qa');
  const audienceQuestions = questions.filter(q => q.type === 'audience_qa');

  const handleAskQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestion.trim()) return;

    createQuestionMutation.mutate({
      content: newQuestion,
      type: activeSubTab === 'discussion' ? 'host_qa' : 'audience_qa',
      isAnonymous
    });
  };

  const handleSendReply = (questionId: string) => {
    if (!replyContent.trim()) return;
    answerMutation.mutate({ questionId, content: replyContent });
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-950/20">
      {/* Sub-tabs */}
      <div className="flex p-1 bg-white/5 mx-4 mt-4 rounded-xl">
        <button
          onClick={() => setActiveSubTab('discussion')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${
            activeSubTab === 'discussion' 
              ? 'bg-lime-500 text-white shadow-lg' 
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <MessageSquare className="h-3.5 w-3.5" />
          {t('meeting.discussion')}
        </button>
        <button
          onClick={() => setActiveSubTab('qa')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${
            activeSubTab === 'qa' 
              ? 'bg-lime-500 text-white shadow-lg' 
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <HelpCircle className="h-3.5 w-3.5" />
          {t('meeting.qa_section')}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {/* Create Question Area */}
        {(activeSubTab === 'discussion' ? hasManagePrivilege : (isQaEnabled || hasManagePrivilege)) && (
          <form onSubmit={handleAskQuestion} className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-4 shadow-xl backdrop-blur-sm group">
            <textarea
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              placeholder={activeSubTab === 'discussion' ? t('meeting.host_asking') : t('meeting.ask_host')}
              className={`w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white placeholder-slate-500 resize-none min-h-[100px] transition-all focus:bg-white/[0.08] focus:border-${activeSubTab === 'discussion' ? 'cyan' : 'lime'}-500/50 focus:ring-4 focus:ring-${activeSubTab === 'discussion' ? 'cyan' : 'lime'}-500/10 outline-none`}
            />
            <div className="flex items-center justify-between pt-2 border-t border-white/5">
              {activeSubTab === 'qa' && isAnonymousAllowed ? (
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                    className="rounded border-white/20 bg-white/5 text-lime-500 focus:ring-lime-500 focus:ring-offset-slate-900"
                  />
                  <span className="text-xs text-slate-400 group-hover:text-slate-300 transition-colors">
                    {t('meeting.ask_anonymous')}
                  </span>
                </label>
              ) : (
                <div />
              )}
              <button
                disabled={!newQuestion.trim() || createQuestionMutation.isPending}
                className={`p-2 rounded-xl transition-all ${
                  newQuestion.trim() 
                    ? (activeSubTab === 'discussion' ? 'bg-cyan-500' : 'bg-lime-500') + ' text-white hover:scale-105 active:scale-95' 
                    : 'bg-white/5 text-slate-600 cursor-not-allowed'
                }`}
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </form>
        )}

        {/* Question List */}
        <div className="space-y-4 pb-10">
          {(activeSubTab === 'discussion' ? discussionQuestions : audienceQuestions).length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-500 space-y-3">
              <HelpCircle className="h-12 w-12 opacity-20" />
              <p className="text-sm font-medium">{t('meeting.no_questions')}</p>
            </div>
          ) : (
            (activeSubTab === 'discussion' ? discussionQuestions : audienceQuestions).map((q) => (
              <motion.div
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={q.id}
                className={`rounded-2xl border ${
                  q.status === 'answered' ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-white/10 bg-white/5'
                } p-4 space-y-3 transition-all hover:border-white/20`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg ${q.isAnonymous ? 'bg-slate-800' : 'bg-lime-500/10'} text-slate-400`}>
                      {q.isAnonymous ? <EyeOff className="h-3 w-3" /> : <User className="h-3 w-3 text-lime-400" />}
                    </div>
                    <span className="text-xs font-bold text-slate-300">
                      {q.isAnonymous 
                        ? t('common.anonymous') 
                        : (q.askedByUserId === userId 
                            ? t('common.you') 
                            : (q.askedByParticipant?.displayName || (q.askedByUser ? `${q.askedByUser.firstName} ${q.askedByUser.lastName}` : t('common.participant')))
                          )
                      }
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {hasManagePrivilege && q.status === 'pending' && (
                      <button 
                        onClick={() => updateStatusMutation.mutate({ questionId: q.id, status: 'dismissed' })}
                        className="p-1 hover:text-rose-400 text-slate-600 transition-colors"
                        title={t('common.dismiss')}
                      >
                        <XCircle className="h-4 w-4" />
                      </button>
                    )}
                    <span className="text-[10px] text-slate-500 font-medium">
                      {new Date(q.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                <p className="text-sm text-white font-medium leading-relaxed">
                  {q.content}
                </p>

                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-4">
                    {q.status === 'answered' && (
                      <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full border border-emerald-400/20">
                        <CheckCircle2 className="h-3 w-3" />
                        {t('meeting.answered')}
                      </div>
                    )}
                  </div>

                  {(hasManagePrivilege || q.type === 'host_qa') && (
                    <button
                      onClick={() => setReplyTo(replyTo === q.id ? null : q.id)}
                      className="text-xs font-bold text-lime-400 hover:text-lime-300 transition-colors"
                    >
                      {replyTo === q.id ? t('common.cancel') : t('common.reply')}
                    </button>
                  )}
                </div>

                {/* Answers List */}
                <AnimatePresence>
                  {q.answers.length > 0 && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      className="mt-3 space-y-3 pt-3 border-t border-white/5"
                    >
                      {q.answers.map((ans) => (
                        <div key={ans.id} className="flex gap-3">
                          <div className="shrink-0 mt-0.5">
                            <div className="h-5 w-5 rounded-full bg-slate-800 flex items-center justify-center">
                              <User className="h-3 w-3 text-slate-500" />
                            </div>
                          </div>
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold text-slate-400">
                                {ans.answeredByUserId === userId 
                                  ? t('common.you') 
                                  : (ans.answeredByUser ? `${ans.answeredByUser.firstName} ${ans.answeredByUser.lastName}` : t('common.participant'))
                                }
                              </span>
                            </div>
                            <p className="text-xs text-slate-300 leading-relaxed">
                              {ans.content}
                            </p>
                          </div>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Reply Input */}
                <AnimatePresence>
                  {replyTo === q.id && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="mt-3 pt-3 border-t border-white/5 space-y-2"
                    >
                      <textarea
                        autoFocus
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        placeholder={t('meeting.enter_answer')}
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-slate-600 resize-none min-h-[80px] transition-all focus:bg-white/[0.08] focus:border-lime-500/50 focus:ring-4 focus:ring-lime-500/10 outline-none"
                      />
                      <div className="flex justify-end">
                        <button
                          onClick={() => handleSendReply(q.id)}
                          disabled={!replyContent.trim() || answerMutation.isPending}
                          className="px-4 py-1.5 bg-lime-500 text-white text-[10px] font-bold rounded-lg hover:bg-lime-600 transition-all disabled:opacity-50"
                        >
                          {t('meeting.send_answer')}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default QATab;
