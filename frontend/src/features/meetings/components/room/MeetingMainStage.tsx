import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  useTracks, 
  GridLayout, 
  ParticipantTile, 
  useParticipantContext,
  ParticipantName,
  TrackMutedIndicator,
  ParticipantTileProps,
  VideoTrack,
  useConnectionQualityIndicator,
  TrackToggle,
  DisconnectButton
} from '@livekit/components-react';
import { Track, ConnectionQuality } from 'livekit-client';
import { 
  ChevronDown, 
  ChevronUp, 
  LogOut,
  Users as UsersIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface MeetingMainStageProps {
  meetingId: string;
  isSidebarOpen: boolean;
  activeTab: 'chat' | 'roster' | 'lobby' | 'settings' | 'polls';
  hasUnreadPolls?: boolean;
  isOrganizer: boolean;
  onToggleSidebar: (tab: 'chat' | 'roster' | 'lobby' | 'settings' | 'polls') => void;
  onEndSession: () => void;
  onLeaveSession?: () => void;
  onReturnToMain?: () => void;
  isInBreakout?: boolean;
}

const ParticipantAvatarOverlay = () => {
  const p = useParticipantContext();
  const avatarUrl = useMemo(() => {
    if (!p?.metadata) return null;
    try {
      const meta = JSON.parse(p.metadata);
      return meta.picture || meta.avatar;
    } catch (e) {
      return null;
    }
  }, [p?.metadata]);

  // Only show avatar if camera is NOT enabled AND NOT currently publishing
  if (p?.isCameraEnabled) return null;

  return (
    <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-[#050505]">
      <div className="relative mb-4">
        <div className="absolute inset-0 bg-cyan-500/20 blur-[60px] rounded-full scale-150 animate-pulse" />
        {avatarUrl ? (
          <img src={avatarUrl} alt={p?.identity} className="h-28 w-28 md:h-36 md:w-36 rounded-full border-4 border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] relative z-10 object-cover" />
        ) : (
          <div className="h-28 w-28 md:h-36 md:w-36 rounded-full bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center text-white/10 border-2 border-white/5 relative z-10">
            <UsersIcon className="h-12 w-12 opacity-20" />
          </div>
        )}
      </div>
      <div className="relative z-10 mt-3 px-6 py-2 rounded-full bg-black/60 border border-white/30 backdrop-blur-xl shadow-2xl">
         <span className="text-sm font-bold text-white tracking-tight"><ParticipantName /></span>
      </div>
    </div>
  );
};

const ParticipantStatusOverlay = () => {
  const p = useParticipantContext();
  return (
    <div className="absolute bottom-6 left-6 z-[110] flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/60 backdrop-blur-2xl border border-white/20 shadow-2xl">
       <div className="flex items-center gap-2">
         <TrackMutedIndicator trackRef={{ participant: p, source: Track.Source.Microphone }} className="scale-110" />
         {p.isCameraEnabled && <span className="text-xs font-bold text-white truncate max-w-[120px]"><ParticipantName /></span>}
       </div>
    </div>
  );
};

const CustomConnectionIndicator = () => {
  const { quality } = useConnectionQualityIndicator();
  return (
    <div className="flex items-end gap-1 h-3.5 opacity-90">
      {[1, 2, 3].map((i) => (
        <div key={i} className={`w-1 rounded-full transition-all ${i === 1 ? 'h-1.5' : i === 2 ? 'h-2.5' : 'h-3.5'} ${quality === ConnectionQuality.Excellent ? 'bg-emerald-500' : quality === ConnectionQuality.Good ? 'bg-amber-500' : 'bg-rose-500'}`} />
      ))}
    </div>
  );
};

const CustomParticipantTile = ({ trackRef, className, ...props }: ParticipantTileProps) => {
  return (
    <ParticipantTile trackRef={trackRef} {...props} className={`relative group overflow-hidden rounded-[3rem] border-2 border-white/30 bg-[#0a0a0b] aspect-video ${className}`}>
      <VideoTrack trackRef={trackRef as any} className="absolute inset-0 w-full h-full z-0 object-contain" />
      <ParticipantAvatarOverlay />
      <div className="absolute top-8 left-8 z-[30]"><CustomConnectionIndicator /></div>
      <ParticipantStatusOverlay />
    </ParticipantTile>
  );
};

const MeetingMainStage: React.FC<MeetingMainStageProps> = ({
  meetingId,
  isOrganizer,
  onEndSession,
  onReturnToMain,
  isInBreakout,
}) => {
  const { t } = useTranslation();
  const [isControlsExpanded, setIsControlsExpanded] = useState(true);
  const [showEndConfirmation, setShowEndConfirmation] = useState(false);
  const tracks = useTracks([
    { source: Track.Source.Camera, withPlaceholder: true },
    { source: Track.Source.ScreenShare, withPlaceholder: false }
  ]).sort((a, b) => {
    // Luôn ưu tiên Screen Share lên đầu
    if (a.source === Track.Source.ScreenShare && b.source !== Track.Source.ScreenShare) return -1;
    if (a.source !== Track.Source.ScreenShare && b.source === Track.Source.ScreenShare) return 1;
    // Các trường hợp còn lại sắp xếp cố định theo Identity của người dùng để tránh nhảy màn
    return a.participant.identity.localeCompare(b.participant.identity);
  });

  return (
    <div className="flex-1 flex flex-col relative overflow-hidden max-h-full bg-[#020202]">
      {/* Floating Breakout Leave Button */}
      {isInBreakout && onReturnToMain && (
        <div className="absolute top-8 right-8 z-[50]">
          <button 
            onClick={onReturnToMain}
            className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 backdrop-blur-3xl transition-all shadow-2xl group active:scale-95"
          >
            <div className="h-2 w-2 rounded-full bg-indigo-400 animate-pulse shadow-[0_0_10px_rgba(129,140,248,0.5)]" />
            <span className="text-sm font-black tracking-tight">RỜI PHÒNG THẢO LUẬN</span>
            <LogOut className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      )}

      <AnimatePresence>
        {showEndConfirmation && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowEndConfirmation(false)} className="absolute inset-0 bg-black/60 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="relative w-full max-w-lg rounded-[3rem] border border-white/20 bg-[#111115] p-12 text-center shadow-2xl">
              <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-rose-500/20 text-rose-500 mx-auto"><LogOut className="h-10 w-10" /></div>
              <h2 className="text-3xl font-black text-white">{t('meeting.end_session_confirm')}</h2>
              <p className="mt-4 text-slate-400 text-lg">{t('meeting.end_session_desc')}</p>
              <div className="mt-10 flex flex-col gap-3">
                <button onClick={onEndSession} className="h-14 w-full rounded-2xl bg-rose-500 font-bold text-white shadow-xl shadow-rose-500/20">{t('meeting.end_for_all')}</button>
                <button onClick={() => setShowEndConfirmation(false)} className="h-14 w-full rounded-2xl bg-white/5 font-bold text-slate-300">{t('meeting.keep_active')}</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="h-20 px-8 flex items-center justify-between border-b border-white/5 relative z-20 bg-black/40 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <div className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_15px_rgba(16,185,129,0.5)]" />
            <span className="text-lg font-medium text-white/90">{t('meeting.live_session')}: {meetingId?.slice(0, 8)}</span>
          </div>
          <div className="flex items-center gap-3">
            {isOrganizer && (
              <button onClick={() => setShowEndConfirmation(true)} className="px-6 py-3 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white font-medium transition-all shadow-lg shadow-rose-500/20">
                {t('meeting.end_session')}
              </button>
            )}
          </div>
      </div>

      <div className="flex-1 relative overflow-hidden flex items-center justify-center p-6">
         <div className="w-full h-full max-w-[calc(100vw-480px)] mx-auto">
            <GridLayout tracks={tracks} className="w-full h-full place-content-center gap-6">
               <CustomParticipantTile />
            </GridLayout>
         </div>
      </div>

      <div className={`absolute bottom-8 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 p-2 rounded-[2rem] bg-[#0f0f12]/95 backdrop-blur-3xl border border-white/20 shadow-2xl transition-all duration-300`}>
         {isControlsExpanded && (
           <div className="flex items-center gap-2">
              <TrackToggle source={Track.Source.Microphone} className="bg-white/5 hover:bg-white/10 text-white p-3 rounded-xl transition-all [&[data-lk-enabled='true']]:bg-cyan-500/20 [&[data-lk-enabled='true']]:text-cyan-400" />
              <TrackToggle source={Track.Source.Camera} className="bg-white/5 hover:bg-white/10 text-white p-3 rounded-xl transition-all [&[data-lk-enabled='true']]:bg-cyan-500/20 [&[data-lk-enabled='true']]:text-cyan-400" />
              <TrackToggle source={Track.Source.ScreenShare} className="bg-white/5 hover:bg-white/10 text-white p-3 rounded-xl transition-all [&[data-lk-enabled='true']]:bg-emerald-500/20 [&[data-lk-enabled='true']]:text-emerald-400" />
              <div className="w-px h-6 bg-white/10 mx-1" />
              
              <DisconnectButton className="bg-rose-500 hover:bg-rose-600 text-white p-3 rounded-xl shadow-lg">
                 <LogOut className="h-5 w-5" />
              </DisconnectButton>
           </div>
         )}
         <button onClick={() => setIsControlsExpanded(!isControlsExpanded)} className="h-10 w-10 flex items-center justify-center rounded-xl bg-white/5 text-white/80 hover:bg-white/10 transition-all">{isControlsExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronUp className="h-5 w-5" />}</button>
      </div>
    </div>
  );
};

export default MeetingMainStage;
