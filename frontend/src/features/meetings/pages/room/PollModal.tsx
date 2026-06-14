import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useDataChannel } from '@livekit/components-react';
import { 
  BarChart3, 
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import apiClient from '@/lib/apiClient';

interface PollModalProps {
  isOpen: boolean;
  onClose: () => void;
  meetingId: string;
  isInBreakout?: boolean;
  breakoutRoomId?: string;
}

const PollModal: React.FC<PollModalProps> = ({ isOpen, onClose, meetingId, isInBreakout, breakoutRoomId }) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-lg bg-[#0f1115] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden border border-white/10"
          >
            {/* Header */}
            <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between bg-white/5">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-rose-500 text-white shadow-lg shadow-rose-500/20">
                  <BarChart3 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white">{t('meeting.new_poll') || 'Tạo bình chọn'}</h3>
                  <p className="text-[13px] font-medium text-slate-300">{t('meeting.poll_subtitle') || 'Thu thập ý kiến nhanh chóng từ mọi người'}</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2.5 rounded-xl hover:bg-white/5 text-slate-500 hover:text-white transition-all"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Content */}
            <div className="px-8 py-6 overflow-y-auto max-h-[70vh] custom-scrollbar bg-transparent">
              <CreatePollForm 
                meetingId={meetingId} 
                onClose={onClose}
                isInBreakout={isInBreakout}
                breakoutRoomId={breakoutRoomId}
                onSuccess={() => {
                  queryClient.invalidateQueries({ queryKey: ['polls', meetingId] });
                  onClose();
                }}
              />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

const CreatePollForm: React.FC<{ 
  meetingId: string; 
  onClose: () => void;
  onSuccess: () => void;
  isInBreakout?: boolean;
  breakoutRoomId?: string;
}> = ({ meetingId, onClose, onSuccess, isInBreakout, breakoutRoomId }) => {
  const { t } = useTranslation();
  const { send } = useDataChannel();
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [type, setType] = useState<'single' | 'multiple'>('single');

  const createMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        question,
        type,
        options: options
          .filter(opt => opt.trim())
          .map((text, idx) => ({ id: `opt-${idx}`, text })),
        breakoutRoomId: isInBreakout ? (breakoutRoomId || 'current') : undefined,
      };
      return apiClient.post(`/meetings/${meetingId}/polls`, payload);
    },
    onSuccess: () => {
      const encoder = new TextEncoder();
      send(encoder.encode(JSON.stringify({ type: 'POLL_CREATED', pollId: meetingId })), { reliable: true });
      onSuccess();
    }
  });

  const addOption = () => {
    if (options.length < 5) setOptions([...options, '']);
  };

  const removeOption = (idx: number) => {
    if (options.length > 2) setOptions(options.filter((_, i) => i !== idx));
  };

  const isValid = question.trim() && options.filter(o => o.trim()).length >= 2;

  return (
    <div className="space-y-6">
      {/* Question Input */}
      <div className="space-y-2">
        <label className="text-[14px] font-bold text-slate-200 px-1">{t('meeting.question')}</label>
        <textarea 
          autoFocus
          value={question}
          onChange={e => setQuestion(e.target.value)}
          maxLength={200}
          placeholder={t('meeting.poll_question_placeholder')}
          className="w-full p-4 rounded-2xl bg-white/5 border border-white/10 focus:border-rose-500 focus:bg-white/10 transition-all text-[15px] font-medium outline-none text-white resize-none custom-scrollbar"
          rows={3}
        />
      </div>

      {/* Type Toggle */}
      <div className="space-y-2">
        <label className="text-[14px] font-bold text-slate-200 px-1">{t('meeting.poll_type')}</label>
        <div className="flex gap-2 p-1 bg-white/5 rounded-2xl">
           <button 
             onClick={() => setType('single')}
             className={`flex-1 py-3 rounded-xl text-[13px] font-black transition-all ${type === 'single' ? 'bg-white/10 text-rose-500 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
           >
              {t('meeting.poll_type_single')}
           </button>
           <button 
             onClick={() => setType('multiple')}
             className={`flex-1 py-3 rounded-xl text-[13px] font-black transition-all ${type === 'multiple' ? 'bg-white/10 text-rose-500 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
           >
              {t('meeting.poll_type_multiple')}
           </button>
        </div>
      </div>

      {/* Options List */}
      <div className="space-y-3">
        <label className="text-[14px] font-bold text-slate-200 px-1">{t('meeting.options')}</label>
        <div className="space-y-3">
          {options.map((opt, idx) => (
            <div key={idx} className="flex gap-3 items-center group">
              <div className={`h-10 w-10 rounded-full flex items-center justify-center text-xs font-black transition-all ${opt.trim() ? 'bg-rose-500 text-white' : 'bg-white/10 text-slate-600'}`}>
                {idx + 1}
              </div>
              <input 
                value={opt}
                onChange={e => {
                  const newOpts = [...options];
                  newOpts[idx] = e.target.value;
                  setOptions(newOpts);
                }}
                maxLength={100}
                placeholder={`${t('meeting.option')} ${idx + 1}`}
                className="flex-1 p-4 rounded-xl bg-white/5 border border-white/10 focus:border-rose-500 focus:bg-white/10 transition-all text-sm font-bold text-white outline-none"
              />
              {options.length > 2 && (
                <button 
                  onClick={() => removeOption(idx)}
                  className="p-3.5 rounded-xl text-slate-600 hover:text-rose-500 hover:bg-white/5 transition-all"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
        {options.length < 5 && (
          <button 
            onClick={addOption}
            className="w-full py-3.5 rounded-xl border-2 border-dashed border-white/10 text-slate-500 hover:border-rose-500/50 hover:text-rose-500 hover:bg-white/5 transition-all text-[13px] font-bold tracking-wide"
          >
            + {t('meeting.add_option')}
          </button>
        )}
      </div>

      {/* Footer Buttons */}
      <div className="flex gap-4 pt-6 border-t border-white/5">
        <button 
          onClick={onClose}
          className="flex-1 py-4 rounded-2xl bg-white/5 text-slate-400 font-black text-[15px] hover:bg-white/10 hover:text-white transition-all"
        >
          {t('common.cancel')}
        </button>
        <button 
          disabled={!isValid || createMutation.isPending}
          onClick={() => createMutation.mutate()}
          className="flex-[2] py-4 rounded-2xl bg-rose-600 text-white font-black text-[15px] hover:bg-rose-500 transition-all disabled:opacity-30 disabled:pointer-events-none shadow-xl shadow-rose-500/20 active:scale-[0.98]"
        >
          {createMutation.isPending ? t('common.loading') : t('meeting.publish_poll')}
        </button>
      </div>
    </div>
  );
};

export default PollModal;
