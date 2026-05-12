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
}

const PollModal: React.FC<PollModalProps> = ({ isOpen, onClose, meetingId }) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
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
            className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden border border-white/20"
          >
            {/* Header */}
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-white to-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-rose-500 text-white shadow-lg shadow-rose-500/20">
                  <BarChart3 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">{t('meeting.new_poll') || 'Tạo bình chọn'}</h3>
                  <p className="text-[12px] font-medium text-slate-500">{t('meeting.poll_subtitle') || 'Thu thập ý kiến nhanh chóng từ mọi người'}</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2.5 rounded-xl hover:bg-slate-100 text-slate-300 hover:text-slate-900 transition-all"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Content */}
            <div className="px-8 py-6 overflow-y-auto max-h-[70vh] custom-scrollbar bg-white">
              <CreatePollForm 
                meetingId={meetingId} 
                onClose={onClose}
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
}> = ({ meetingId, onClose, onSuccess }) => {
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
          .map((text, idx) => ({ id: `opt-${idx}`, text }))
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
        <label className="text-[13px] font-medium text-slate-700 px-1">{t('meeting.question')}</label>
        <textarea 
          autoFocus
          value={question}
          onChange={e => setQuestion(e.target.value)}
          maxLength={200}
          placeholder={t('meeting.poll_question_placeholder')}
          className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-rose-500 focus:bg-white focus:shadow-xl focus:shadow-rose-500/5 transition-all text-[14px] font-medium outline-none text-slate-900 resize-none custom-scrollbar"
          rows={2}
        />
      </div>

      {/* Type Toggle */}
      <div className="space-y-2">
        <label className="text-[13px] font-medium text-slate-700 px-1">{t('meeting.poll_type')}</label>
        <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl">
           <button 
             onClick={() => setType('single')}
             className={`flex-1 py-2.5 rounded-xl text-[13px] font-medium transition-all ${type === 'single' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
           >
              {t('meeting.poll_type_single')}
           </button>
           <button 
             onClick={() => setType('multiple')}
             className={`flex-1 py-2.5 rounded-xl text-[13px] font-medium transition-all ${type === 'multiple' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
           >
              {t('meeting.poll_type_multiple')}
           </button>
        </div>
      </div>

      {/* Options List */}
      <div className="space-y-3">
        <label className="text-[13px] font-medium text-slate-700 px-1">{t('meeting.options')}</label>
        <div className="space-y-3">
          {options.map((opt, idx) => (
            <div key={idx} className="flex gap-3 items-center group">
              <div className={`h-10 w-10 rounded-full flex items-center justify-center text-xs font-black transition-all ${opt.trim() ? 'bg-rose-500 text-white' : 'bg-slate-200 text-slate-400'}`}>
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
                className="flex-1 p-4 rounded-xl bg-slate-50 border-2 border-slate-100 focus:border-rose-500 focus:bg-white transition-all text-sm font-bold text-slate-900 outline-none"
              />
              {options.length > 2 && (
                <button 
                  onClick={() => removeOption(idx)}
                  className="p-3.5 rounded-xl text-rose-300 hover:text-rose-500 hover:bg-rose-50 transition-all"
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
            className="w-full py-3.5 rounded-xl border-2 border-dashed border-slate-200 text-slate-600 hover:border-rose-500/50 hover:text-rose-500 hover:bg-rose-50/30 transition-all text-[12px] font-medium tracking-wide"
          >
            + {t('meeting.add_option')}
          </button>
        )}
      </div>

      {/* Footer Buttons */}
      <div className="flex gap-4 pt-6 border-t border-slate-50">
        <button 
          onClick={onClose}
          className="flex-1 py-4 rounded-2xl bg-slate-100 text-slate-500 font-black text-[15px] hover:bg-slate-200 hover:text-slate-900 transition-all"
        >
          {t('common.cancel')}
        </button>
        <button 
          disabled={!isValid || createMutation.isPending}
          onClick={() => createMutation.mutate()}
          className="flex-[2] py-4 rounded-2xl bg-rose-600 text-white font-black text-[15px] hover:bg-rose-700 transition-all disabled:opacity-30 disabled:pointer-events-none shadow-xl shadow-rose-500/20 active:scale-[0.98]"
        >
          {createMutation.isPending ? t('common.loading') : t('meeting.publish_poll')}
        </button>
      </div>
    </div>
  );
};

export default PollModal;
