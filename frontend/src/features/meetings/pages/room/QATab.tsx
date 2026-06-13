import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDataChannel } from '@livekit/components-react';
import { 
  MessageSquare, 
  HelpCircle, 
  Send, 
  CheckCircle2, 
  User
} from 'lucide-react';
import { motion } from 'framer-motion';
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
    picture?: string;
  };
  askedByParticipant?: {
    displayName: string;
  };
  answers: Answer[];
  createdAt: string;
}

interface QATabProps {
  meetingId: string;
  userId: string;
  hasManagePrivilege: boolean;
  onOpenQuestionModal: (question: Question) => void;
}

const QATab: React.FC<QATabProps> = ({ 
  meetingId, 
  userId, 
  hasManagePrivilege,
  onOpenQuestionModal
}) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { send } = useDataChannel();
  const [newQuestion, setNewQuestion] = useState('');

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
    mutationFn: async (data: { content: string }) => {
      return apiClient.post(`/meetings/${meetingId}/qa`, data);
    },
    onSuccess: () => {
      setNewQuestion('');
      queryClient.invalidateQueries({ queryKey: ['questions', meetingId] });
      // Broadcast update
      const encoder = new TextEncoder();
      send(encoder.encode(JSON.stringify({ type: 'QA_UPDATED', meetingId })), { reliable: true });
    }
  });

  const handleAskQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestion.trim()) return;

    createQuestionMutation.mutate({
      content: newQuestion,
    });
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-950/20">
      <div className="flex-1 overflow-y-auto p-4 space-y-4 dark-scrollbar">
        {/* Create Question Area - Only for Host */}
        {hasManagePrivilege && (
          <form onSubmit={handleAskQuestion} className="bg-white/5 border border-white/10 rounded-2xl p-3 space-y-2 shadow-xl backdrop-blur-sm group">
            <textarea
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              placeholder={t('meeting.host_asking')}
              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white placeholder-slate-500 resize-none min-h-[150px] transition-all focus:bg-white/[0.08] focus:border-lime-500/50 focus:ring-4 focus:ring-lime-500/10 outline-none dark-scrollbar"
            />
            <div className="flex items-center justify-end pt-1.5 border-t border-white/20">
              <button
                type="submit"
                disabled={!newQuestion.trim() || createQuestionMutation.isPending}
                className={`p-2 rounded-xl transition-all ${
                  newQuestion.trim() 
                    ? 'bg-lime-500 text-white hover:scale-105 active:scale-95 shadow-lg shadow-lime-500/20' 
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
          {questions.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-500 space-y-3">
              <HelpCircle className="h-12 w-12 opacity-20" />
              <p className="text-sm font-medium">{t('meeting.no_questions')}</p>
            </div>
          ) : (
            questions.map((q) => (
              <motion.div
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={q.id}
                className={`rounded-2xl border ${
                  q.answers && q.answers.length > 0 ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-white/10 bg-white/5'
                } p-4 space-y-3 transition-all hover:border-white/20 shadow-lg`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-lg overflow-hidden bg-lime-500/10 flex items-center justify-center border border-white/5">
                      {q.askedByUser?.picture ? (
                        <img src={q.askedByUser.picture} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <User className="h-3 w-3 text-lime-400" />
                      )}
                    </div>
                    <span className="text-xs font-bold text-slate-300">
                      {q.askedByUserId === userId 
                        ? t('common.you') 
                        : (q.askedByParticipant?.displayName || (q.askedByUser ? `${q.askedByUser.firstName} ${q.askedByUser.lastName}` : t('common.participant')))
                      }
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] text-slate-500 font-medium">
                      {new Date(q.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                <p className="text-sm text-white font-medium leading-relaxed">
                  {q.content}
                </p>

                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => onOpenQuestionModal(q)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all group"
                    >
                      <MessageSquare className="h-3.5 w-3.5 text-lime-400" />
                      <span className="text-[12px] font-semibold text-slate-400 group-hover:text-slate-200">
                        {hasManagePrivilege ? q.answers.length : q.answers.filter(a => a.answeredByUserId === userId).length} {t('meeting.responses') || 'Phản hồi'}
                      </span>
                    </button>
                    
                    {(q.answers.some(a => a.answeredByUserId === userId)) && (
                      <div className="flex items-center gap-1 text-[12px] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full border border-emerald-400/20">
                        <CheckCircle2 className="h-4 w-4" />
                        {t('meeting.answered')}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => onOpenQuestionModal(q)}
                    className="text-xs font-bold text-lime-400 hover:text-lime-300 transition-colors bg-lime-400/10 px-3 py-1.5 rounded-xl border border-lime-400/10"
                  >
                    {t('common.reply')}
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default QATab;
