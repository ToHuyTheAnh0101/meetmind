import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/apiClient';
import { 
  UserX, 
  Check, 
  Loader2, 
  AlertCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import { Meeting } from '@/types/api';
import SettingToggle from '../details/SettingToggle';

interface InRoomSettingsProps {
  meetingId: string;
}

const InRoomSettings: React.FC<InRoomSettingsProps> = ({ meetingId }) => {
  const queryClient = useQueryClient();
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [showPassword, setShowPassword] = useState(false);

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
    password: '',
  });

  useEffect(() => {
    if (meeting) {
      setFormData({
        title: meeting.title,
        description: meeting.description || '',
        waitingRoomEnabled: !!meeting.waitingRoomEnabled,
        muteOnJoin: !!meeting.muteOnJoin,
        password: '', // Password is not sent from server
      });
    }
  }, [meeting]);

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      setSaveStatus('saving');
      return apiClient.put(`/meetings/${meetingId}`, data);
    },
    onSuccess: () => {
      setSaveStatus('saved');
      queryClient.invalidateQueries({ queryKey: ['meeting', meetingId] });
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
    <div className="flex-1 flex flex-col p-6 overflow-y-auto custom-scrollbar">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h4 className="text-sm text-amber-500 flex items-center gap-2 font-premium-ink">
             Session configuration
          </h4>
          <p className="text-[11px] font-medium text-white/50 mt-1.5 px-0.5">
             Manage room parameters in real-time
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
              <label className="text-[13px] font-bold text-slate-800 font-premium-ink px-0.5">Meeting title</label>
              <input 
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                onBlur={() => updateMutation.mutate(formData)}
                className="w-full bg-slate-50/50 border-b border-slate-200 px-3 py-2.5 text-sm font-bold text-slate-900 focus:outline-none focus:border-amber-500/50 transition-all placeholder:text-slate-300 rounded-t-lg"
                placeholder="Enter meeting title..."
              />
           </div>

           <div className="space-y-2">
              <label className="text-[13px] font-bold text-slate-800 font-premium-ink px-0.5">Description</label>
              <textarea 
                rows={2}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                onBlur={() => updateMutation.mutate(formData)}
                className="w-full bg-slate-50/50 border-b border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-600 focus:outline-none focus:border-amber-500/50 transition-all resize-none placeholder:text-slate-300 rounded-t-lg"
                placeholder="Add session description..."
              />
           </div>
        </div>

        {/* Access & Safety */}
        <div className="space-y-8">
           <div className="space-y-2">
              <div className="flex items-center gap-2 mb-3">
                 <span className="text-[13px] font-bold text-slate-800 font-premium-ink px-0.5">Access control</span>
              </div>
              
              <div className="space-y-1">
                 <SettingToggle 
                    label="Waiting Room"
                    description="Manual guest approval"
                    enabled={formData.waitingRoomEnabled}
                    onChange={(val) => handleUpdate({ waitingRoomEnabled: val })}
                 />
                 <SettingToggle 
                    label="Mute on Join"
                    description="Silence guests on entry"
                    enabled={formData.muteOnJoin}
                    onChange={(val) => handleUpdate({ muteOnJoin: val })}
                 />
              </div>
           </div>

           <div className="space-y-5 pt-6 border-t border-slate-100">
              <div className="flex items-center gap-2">
                 <span className="text-[13px] font-bold text-slate-800 font-premium-ink px-0.5">Security code</span>
              </div>
              <div className="relative group">
                 <input 
                   type={showPassword ? "text" : "password"}
                   placeholder="Update session password..."
                   value={formData.password}
                   onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                   onBlur={() => formData.password && updateMutation.mutate(formData)}
                   className="w-full bg-slate-50/50 border-b border-slate-200 px-3 py-2.5 text-sm font-bold text-slate-900 focus:outline-none focus:border-amber-500/50 transition-all placeholder:text-slate-300 rounded-t-lg"
                 />
                 <button 
                   onClick={() => setShowPassword(!showPassword)}
                   className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-amber-600 transition-colors"
                 >
                    {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                 </button>
              </div>
           </div>
        </div>

        {/* Advanced Actions (Minimalist) */}
        <div className="pt-10 border-t border-slate-100">
           <p className="text-[11px] font-bold text-rose-500/80 mb-4 font-premium-ink px-0.5">Destructive actions</p>
           <button className="text-[12px] font-bold text-rose-500 hover:text-rose-600 transition-colors flex items-center gap-2.5 px-0.5">
              <UserX className="h-4.5 w-4.5" />
              Reset meeting tokens
           </button>
           <p className="text-[10px] text-slate-400 mt-3 leading-relaxed px-0.5 max-w-[240px]">
             This will disconnect all current participants and regenerate access credentials.
           </p>
        </div>
      </div>
    </div>
  );
};

export default InRoomSettings;
