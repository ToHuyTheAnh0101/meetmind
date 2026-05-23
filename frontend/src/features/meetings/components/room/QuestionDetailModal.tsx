import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  MessageCircle, 
  X,
  User,
  Clock,
  Send
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useDataChannel } from '@livekit/components-react';
import apiClient from '@/lib/apiClient';

interface Answer {
  id: string;
  content: string;
  answeredByUserId: string;
  answeredByUser?: {
    firstName: string;
    lastName: string;
    picture?: string;
  };
  answeredByParticipant?: {
    displayName: string;
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
  createdAt: string;
  answers: Answer[];
}

interface QuestionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  question: Question | null;
  userId: string;
  meetingId: string;
  isOrganizer?: boolean;
  isCoHost?: boolean;
}

const QuestionDetailModal: React.FC<QuestionDetailModalProps> = ({ 
  isOpen, 
  onClose, 
  question: propQuestion, 
  userId,
  meetingId,
  isOrganizer,
  isCoHost
}) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { send } = useDataChannel();
  const [replyContent, setReplyContent] = useState('');
  
  // Keep the question data for exit animation
  const [localQuestion, setLocalQuestion] = React.useState<Question | null>(propQuestion);
  
  React.useEffect(() => {
    if (propQuestion) {
      setLocalQuestion(propQuestion);
    }
  }, [propQuestion]);

  const question = propQuestion || localQuestion;

  const filteredAnswers = React.useMemo(() => {
    if (!question) return [];
    // Hosts and Co-hosts see all answers to "collect" them
    if (isOrganizer || isCoHost) return question.answers;
    // Regular participants see their own answers + host's answers
    return question.answers.filter(a => a.answeredByUserId === userId);
  }, [question, isOrganizer, isCoHost, userId]);

  const answerMutation = useMutation({
    mutationFn: async ({ questionId, content }: { questionId: string; content: string }) => {
      return apiClient.post(`/meetings/${meetingId}/qa/${questionId}/answers`, { content });
    },
    onSuccess: () => {
      setReplyContent('');
      queryClient.invalidateQueries({ queryKey: ['questions', meetingId] });
      
      const encoder = new TextEncoder();
      send(encoder.encode(JSON.stringify({ type: 'QA_UPDATED', meetingId })), { reliable: true });
    }
  });

  const handleSendReply = () => {
    if (!question || !replyContent.trim() || answerMutation.isPending) return;
    answerMutation.mutate({ questionId: question.id, content: replyContent });
  };

  return (
    <AnimatePresence>
      {isOpen && question && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-xl bg-[#0f1115] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden border border-white/10"
          >
            {/* Header */}
            <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between bg-white/5">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-lime-500 text-white shadow-lg shadow-lime-500/20">
                  <MessageCircle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white">{t('meeting.discussion_details') || 'Chi tiết hỏi đáp'}</h3>
                  <p className="text-[13px] font-medium text-slate-300">{t('meeting.view_all_responses') || 'Xem tất cả câu trả lời từ mọi người'}</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2.5 rounded-xl hover:bg-white/5 text-slate-500 hover:text-white transition-all"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Question Content */}
            <div className="px-8 py-6 bg-white/5 border-b border-white/5">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-6 w-6 rounded-full overflow-hidden bg-lime-500/10 flex items-center justify-center border border-lime-500/20">
                  {question.askedByUser?.picture ? (
                    <img src={question.askedByUser.picture} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <User className="h-4 w-4 text-lime-400" />
                  )}
                </div>
                <span className="text-sm font-bold text-slate-200">
                  {question.askedByUserId === userId 
                    ? t('common.you') || 'Bạn'
                    : (question.askedByParticipant?.displayName || (question.askedByUser ? `${question.askedByUser.firstName} ${question.askedByUser.lastName}` : t('common.participant') || 'Người tham gia'))
                  }
                </span>
                <span className="text-[13px] font-medium text-slate-500 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {new Date(question.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="text-lg font-black text-white leading-relaxed">
                {question.content}
              </p>
            </div>

            {/* Answers List */}
            <div className="flex-1 px-8 py-6 overflow-y-auto max-h-[40vh] custom-scrollbar bg-transparent space-y-6">
              <div className="flex items-center justify-between">
                <h4 className="text-[15px] font-bold text-slate-300">
                  {(isOrganizer || isCoHost) ? t('meeting.all_responses') || 'Tất cả câu trả lời' : t('meeting.your_responses') || 'Câu trả lời của bạn'} ({filteredAnswers.length})
                </h4>
              </div>

              {filteredAnswers.length === 0 ? (
                <div className="py-10 flex flex-col items-center justify-center text-slate-600 space-y-2">
                  <MessageCircle className="h-10 w-10" />
                  <p className="text-sm font-bold">{t('meeting.no_responses_yet') || 'Chưa có câu trả lời nào'}</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {filteredAnswers.map((ans) => (
                    <div key={ans.id} className="flex gap-4 group">
                      <div className="shrink-0">
                        <div className={`h-10 w-10 rounded-2xl overflow-hidden flex items-center justify-center transition-all border ${ans.answeredByUserId === userId ? 'bg-lime-500 text-white border-lime-400' : 'bg-white/5 text-slate-500 border-white/5'}`}>
                          {ans.answeredByUser?.picture ? (
                            <img src={ans.answeredByUser.picture} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <User className="h-5 w-5" />
                          )}
                        </div>
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[14px] font-bold text-white">
                            {ans.answeredByUserId === userId 
                              ? t('common.you') || 'Bạn'
                              : (ans.answeredByParticipant?.displayName || (ans.answeredByUser ? `${ans.answeredByUser.firstName} ${ans.answeredByUser.lastName}` : t('common.participant') || 'Người tham gia'))
                            }
                          </span>
                          <span className="text-[12px] text-slate-500 font-medium">
                            {new Date(ans.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="p-4 rounded-2xl bg-white/5 border border-white/5 text-sm text-slate-200 leading-relaxed group-hover:bg-white/10 group-hover:border-lime-500/20 transition-all">
                          {ans.content}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Reply Footer */}
            <div className="px-8 py-4 border-t border-white/5 bg-white/5">
              <div className="relative group">
                <textarea 
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder={t('meeting.enter_answer') || 'Nhập câu trả lời của bạn...'}
                  className="w-full p-3 pr-14 rounded-2xl bg-white/5 border border-white/10 focus:border-lime-500 transition-all text-sm font-bold text-white outline-none resize-none shadow-sm focus:shadow-xl focus:shadow-lime-500/10 custom-scrollbar"
                  rows={3}
                />
                <button 
                  disabled={!replyContent.trim() || answerMutation.isPending}
                  onClick={handleSendReply}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-xl bg-lime-500 text-white hover:bg-lime-600 transition-all disabled:opacity-30 shadow-lg shadow-lime-500/20 active:scale-95"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default QuestionDetailModal;
