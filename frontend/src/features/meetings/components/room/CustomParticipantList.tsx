import React from 'react';
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

const ParticipantItem = () => {
  const p = useParticipantContext();

  // Extract avatar from metadata
  let avatarUrl = null;
  if (p.metadata) {
    try {
      const meta = JSON.parse(p.metadata);
      avatarUrl = meta.avatar;
    } catch (e) {
      console.error("Failed to parse metadata", e);
    }
  }

  return (
    <div className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.04] border border-white/20 group hover:bg-white/[0.08] transition-all mb-2">
       <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-slate-800 to-slate-950 flex items-center justify-center text-xs font-black text-slate-400 group-hover:text-white transition-colors overflow-hidden">
             {avatarUrl ? (
               <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
             ) : (
               <User className="h-5 w-5 opacity-40" />
             )}
          </div>
          <div className="flex flex-col">
             <span className="text-base font-black text-white leading-none"><ParticipantName /></span>
             <div className="flex items-center gap-2 mt-2">
                <CustomConnectionIndicator />
                <span className="text-xs text-slate-200 font-bold">Stable Connection</span>
             </div>
          </div>
       </div>
       <div className="flex items-center gap-2">
          <TrackMutedIndicator trackRef={{ participant: p, source: Track.Source.Microphone }} className="text-slate-300 h-4 w-4" />
          <TrackMutedIndicator trackRef={{ participant: p, source: Track.Source.Camera }} className="text-slate-300 h-4 w-4" />
       </div>
    </div>
  );
};

const CustomParticipantList: React.FC = () => {
  const participants = useParticipants();
  
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-6">
         <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Participants ({participants.length})</span>
      </div>
      <ParticipantLoop participants={participants}>
        <ParticipantItem />
      </ParticipantLoop>
    </div>
  );
};

export default CustomParticipantList;
