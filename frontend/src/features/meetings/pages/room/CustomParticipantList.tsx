import React from 'react';
import { useTranslation } from 'react-i18next';
import { 
  useParticipants, 
  useParticipantContext, 
  ParticipantLoop, 
  ParticipantName, 
  TrackMutedIndicator,
  useConnectionQualityIndicator
} from '@livekit/components-react';
import { ConnectionQuality } from 'livekit-client';
import { User } from 'lucide-react';
import { Track } from 'livekit-client';

const CustomConnectionIndicator = () => {
  const { quality } = useConnectionQualityIndicator();
  
  const getBars = () => {
    switch (quality) {
      case ConnectionQuality.Excellent:
        return [
           { active: true, color: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' },
           { active: true, color: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' },
           { active: true, color: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' }
        ];
      case ConnectionQuality.Good:
        return [
           { active: true, color: 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]' },
           { active: true, color: 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]' },
           { active: false, color: 'bg-white/10' }
        ];
      case ConnectionQuality.Poor:
        return [
           { active: true, color: 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]' },
           { active: false, color: 'bg-white/10' },
           { active: false, color: 'bg-white/10' }
        ];
      default:
        return [
           { active: false, color: 'bg-white/10' },
           { active: false, color: 'bg-white/10' },
           { active: false, color: 'bg-white/10' }
        ];
    }
  };

  return (
    <div className="flex items-end gap-0.5 h-3.5 mb-0.5">
      {getBars().map((bar, i) => (
        <div 
          key={i} 
          className={`w-1 rounded-full transition-all duration-500 ${bar.color} ${i === 0 ? 'h-1.5' : i === 1 ? 'h-2.5' : 'h-3.5'}`} 
        />
      ))}
    </div>
  );
};

const ParticipantItem = ({ organizerId }: { organizerId: string }) => {
  const { t } = useTranslation();
  const p = useParticipantContext();

  // Extract avatar from metadata
  let avatarUrl = null;
  if (p.metadata) {
    try {
      const meta = JSON.parse(p.metadata);
      avatarUrl = meta.picture || meta.avatar;
    } catch (e) {
      console.error("Failed to parse metadata", e);
    }
  }

  return (
    <div className="flex items-center justify-between py-4 border-b border-white/5 group transition-all">
       <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-white/5 flex items-center justify-center text-xs font-bold text-slate-300 group-hover:text-white transition-colors overflow-hidden border border-white/10">
             {avatarUrl ? (
               <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
             ) : (
               <User className="h-5 w-5 opacity-40" />
             )}
          </div>
          <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <ParticipantName className="text-[15px] font-semibold text-white" />
                {p.identity === organizerId && (
                  <span className="px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-400 text-[10px] font-bold border border-cyan-500/20">
                    {t('meeting.host')}
                  </span>
                )}
              </div>
             <div className="flex items-center gap-3 mt-2 opacity-100">
                <CustomConnectionIndicator />
                 <span className="text-[13px] text-slate-500 font-medium tracking-tight">{t('meeting.stable_connection')}</span>
             </div>
          </div>
       </div>
       <div className="flex items-center gap-3">
          <TrackMutedIndicator trackRef={{ participant: p, source: Track.Source.Microphone }} className="text-slate-300 h-5 w-5 opacity-100" />
          <TrackMutedIndicator trackRef={{ participant: p, source: Track.Source.Camera }} className="text-slate-300 h-5 w-5 opacity-100" />
       </div>
    </div>
  );
};

const CustomParticipantList: React.FC<{ organizerId: string }> = ({ organizerId }) => {
  const { t } = useTranslation();
  const participants = useParticipants();
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
         <span className="text-[13px] font-bold text-slate-500 tracking-[0.05em]">
            {t('meeting.participants')} — {participants.length}
         </span>
      </div>
      <ParticipantLoop participants={participants}>
        <ParticipantItem organizerId={organizerId} />
      </ParticipantLoop>
    </div>
  );
};

export default CustomParticipantList;
