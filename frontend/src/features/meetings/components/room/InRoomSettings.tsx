import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDataChannel } from '@livekit/components-react';
import apiClient from '@/lib/apiClient';
import { 
  Check, 
  Loader2, 
  AlertCircle
} from 'lucide-react';
import { Meeting } from '@/types/api';
import SettingToggle from '../details/SettingToggle';

interface InRoomSettingsProps {
  meetingId: string;
}

const InRoomSettings: React.FC<InRoomSettingsProps> = ({ meetingId }) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { send } = useDataChannel();
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // 1. Fetch current meeting state
  const { data: meeting, isLoading } = useQuery<Meeting>({
    queryKey: ['meeting', meetingId],
    queryFn: async () => {
      const response = await apiClient.get(`/meetings/${meetingId}`);
      return response.data;
    },
  });

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    waitingRoomEnabled: false,
    muteOnJoin: false,
  });

  useEffect(() => {
    if (meeting) {
      setFormData({
        title: meeting.title,
        description: meeting.description || '',
        waitingRoomEnabled: !!meeting.waitingRoomEnabled,
        muteOnJoin: !!meeting.muteOnJoin,
      });
    }
  }, [meeting]);

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      console.log('InRoomSettings: Updating meeting with data:', data);
      setSaveStatus('saving');
      return apiClient.put(`/meetings/${meetingId}`, data);
    },
    onSuccess: () => {
      console.log('InRoomSettings: Update successful');
      setSaveStatus('saved');
      queryClient.invalidateQueries({ queryKey: ['meeting', meetingId] });
      
      // Broadcast to others
      const encoder = new TextEncoder();
      send(encoder.encode(JSON.stringify({ type: 'MEETING_UPDATED', meetingId })), { reliable: true });

      // Also refresh locally for the host
      window.dispatchEvent(new CustomEvent('refresh-meeting', { detail: { meetingId } }));

      setTimeout(() => setSaveStatus('idle'), 2000);
    },
    onError: () => {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  });

  const handleUpdate = (updates: Partial<typeof formData>) => {
    const newData = { ...formData, ...updates };
    setFormData(newData);
    updateMutation.mutate(newData);
  };


  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h4 className="text-sm text-amber-500 flex items-center gap-2 font-premium-ink">
               {t('meeting.session_config')}
            </h4>
            <p className="text-[12px] font-medium text-white/50 mt-1.5 px-0.5">
               {t('meeting.manage_params')}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            {saveStatus === 'saving' && <Loader2 className="h-4 w-4 animate-spin text-amber-500" />}
            {saveStatus === 'saved' && <Check className="h-4 w-4 text-emerald-500" />}
            {saveStatus === 'error' && <AlertCircle className="h-4 w-4 text-rose-500" />}
          </div>
        </div>

        <div className="space-y-10 font-sans">
          {/* Basic Info */}
           <div className="space-y-7">
              <div className="space-y-2">
                 <label className="text-[13px] font-bold text-slate-200 font-premium-ink px-0.5">{t('meeting.title')}</label>
                 <input 
                   type="text"
                   value={formData.title}
                   onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                   onBlur={() => updateMutation.mutate(formData)}
                   className="w-full bg-white/5 border-b border-white/10 px-3 py-2.5 text-sm font-bold text-white focus:outline-none focus:border-amber-500/30 transition-all placeholder:text-slate-300 rounded-t-lg"
                   placeholder={t('meeting.enter_meeting_title')}
                 />
              </div>

              <div className="space-y-2">
                 <label className="text-[13px] font-bold text-slate-200 font-premium-ink px-0.5">{t('meeting.description')}</label>
                 <textarea 
                   rows={2}
                   value={formData.description}
                   onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                   onBlur={() => updateMutation.mutate(formData)}
                   className="w-full bg-white/5 border-b border-white/10 px-3 py-2.5 text-sm font-medium text-slate-300 focus:outline-none focus:border-amber-500/30 transition-all resize-none placeholder:text-slate-300 rounded-t-lg"
                   placeholder={t('meeting.add_description')}
                 />
              </div>
          </div>

          {/* Access & Safety */}
          <div className="space-y-8">
              <div className="space-y-2">
                 <div className="flex items-center gap-2 mb-3">
                    <span className="text-[13px] font-bold text-slate-200 font-premium-ink px-0.5">{t('meeting.access_control')}</span>
                 </div>
                 
                 <div className="space-y-1">
                    <SettingToggle 
                       label={t('meeting.waiting_room')}
                       description={t('meeting.manual_approval')}
                       enabled={formData.waitingRoomEnabled}
                       onChange={(val) => handleUpdate({ waitingRoomEnabled: val })}
                    />
                    <SettingToggle 
                       label={t('meeting.mute_on_entry')}
                       description={t('meeting.silence_guests')}
                       enabled={formData.muteOnJoin}
                       onChange={(val) => handleUpdate({ muteOnJoin: val })}
                    />
                 </div>
              </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InRoomSettings;
