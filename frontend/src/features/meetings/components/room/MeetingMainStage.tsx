import React, { useState, useMemo, useEffect, useCallback } from 'react';
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
  DisconnectButton,
  useVisualStableUpdate
} from '@livekit/components-react';
import { Track, ConnectionQuality } from 'livekit-client';
import { MessageSquare, Users as UsersIcon, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Settings, LogOut } from 'lucide-react';

interface MeetingMainStageProps {
  meetingId: string;
  isSidebarOpen: boolean;
  activeTab: 'chat' | 'participants';
  onToggleSidebar: (tab: 'chat' | 'participants') => void;
  onEndSession: () => void;
}

const ParticipantAvatarOverlay = () => {
  const p = useParticipantContext();
  
  const avatarUrl = useMemo(() => {
    if (!p?.metadata) return null;
    try {
      const meta = JSON.parse(p.metadata);
      return meta.avatar;
    } catch (e) {
      return null;
    }
  }, [p?.metadata]);

  if (p?.isCameraEnabled) return null;

  return (
    <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-[#050505]">
      <div className="relative mb-4">
        <div className="absolute inset-0 bg-cyan-500/20 blur-[60px] rounded-full scale-150 animate-pulse" />
        
        {avatarUrl ? (
          <img 
            src={avatarUrl} 
            alt={p?.identity} 
            className="h-28 w-28 md:h-36 md:w-36 rounded-full border-4 border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] relative z-10 object-cover transition-transform duration-500 hover:scale-105"
          />
        ) : (
          <div className="h-28 w-28 md:h-36 md:w-36 rounded-full bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center text-white/10 border-2 border-white/5 relative z-10">
            <UsersIcon className="h-12 w-12 opacity-20" />
          </div>
        )}
      </div>
      
      <div className="relative z-10 mt-3 px-6 py-2 rounded-full bg-black/60 border border-white/30 backdrop-blur-xl shadow-2xl">
         <span className="text-sm font-black text-white tracking-[0.2em] uppercase"><ParticipantName /></span>
      </div>
    </div>
  );
};

const ParticipantStatusOverlay = () => {
  const p = useParticipantContext();
  const isCameraOn = p.isCameraEnabled;

  return (
    <div className="absolute bottom-6 left-6 z-[110] flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/60 backdrop-blur-2xl border border-white/20 shadow-2xl transition-all duration-300 min-h-[36px]">
       <div className="flex items-center gap-2">
         <TrackMutedIndicator trackRef={{ participant: p, source: Track.Source.Microphone }} className="scale-110" />
         {isCameraOn && (
           <span className="text-xs font-bold text-white tracking-wider uppercase truncate max-w-[120px]">
             <ParticipantName />
           </span>
         )}
       </div>
    </div>
  );
};

const CustomConnectionIndicator = React.memo(() => {
  const { quality } = useConnectionQualityIndicator();
  
  const bars = useMemo(() => {
    switch (quality) {
      case ConnectionQuality.Excellent:
        return [
           { active: true, color: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' },
           { active: true, color: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' },
           { active: true, color: 'bg-emerald-500 shadow-[0_0_8_rgba(16,185,129,0.5)]' }
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
  }, [quality]);

  return (
    <div className="flex items-end gap-1 h-3.5 transition-opacity group-hover:opacity-100 opacity-90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
      {bars.map((bar, i) => (
        <div 
          key={i} 
          className={`w-1 rounded-full transition-all duration-500 ${bar.color} ${i === 0 ? 'h-1.5' : i === 1 ? 'h-2.5' : 'h-3.5'}`} 
        />
      ))}
    </div>
  );
});

const CustomParticipantTile = ({ trackRef, className, ...props }: ParticipantTileProps) => {
  return (
    <ParticipantTile 
      trackRef={trackRef}
      {...props} 
      className={`relative group overflow-hidden rounded-[3rem] border-2 border-white/30 shadow-2xl transition-all hover:border-cyan-500/50 bg-[#0a0a0b] aspect-video [&_video]:object-contain [&_video]:w-full [&_video]:h-full [&_.lk-focus-toggle-button]:hidden ${className}`}
    >
      <VideoTrack 
        trackRef={trackRef as any} 
        className="absolute inset-0 w-full h-full z-0 pointer-events-none" 
      />
      
      <ParticipantAvatarOverlay />

      <div className="absolute top-8 left-8 z-[30]">
         <CustomConnectionIndicator />
      </div>
      
      <ParticipantStatusOverlay />
    </ParticipantTile>
  );
};

const CustomVideoGrid = React.memo(() => {
  const cameraTracks = useTracks([{ source: Track.Source.Camera, withPlaceholder: true }]);
  const screenShareTracks = useTracks([{ source: Track.Source.ScreenShare, withPlaceholder: false }]);
  const [page, setPage] = useState(0);
  const itemsPerPage = 12;

  // Use LiveKit's stability hook to prevent 'jumping' when people join/leave
  const stabilizedTracks = useVisualStableUpdate(cameraTracks, 48); // Stabilize up to 48 items globally

  const activeScreenShare = useMemo(() => 
    screenShareTracks.length > 0 ? screenShareTracks[0] : null
  , [screenShareTracks]);

  const totalPages = useMemo(() => 
    Math.ceil(stabilizedTracks.length / itemsPerPage)
  , [stabilizedTracks.length]);

  useEffect(() => {
    if (page >= totalPages && totalPages > 0) {
      setPage(0);
    }
  }, [totalPages, page]);

  const currentTracks = useMemo(() => 
    stabilizedTracks.slice(page * itemsPerPage, (page + 1) * itemsPerPage)
  , [stabilizedTracks, page]);

  const handlePrevPage = useCallback(() => setPage(p => Math.max(0, p - 1)), []);
  const handleNextPage = useCallback(() => setPage(p => Math.min(totalPages - 1, p + 1)), [totalPages]);

  if (activeScreenShare) {
    return (
      <div className="flex h-full w-full gap-4 animate-in fade-in duration-700">
        <div className="flex-[3] h-full relative">
          <CustomParticipantTile trackRef={activeScreenShare} className="h-full w-full !aspect-auto" />
        </div>
        
        <div className="flex-1 h-full overflow-y-auto custom-scrollbar pr-2">
           <div className="flex flex-col gap-4">
              {stabilizedTracks.map((track) => (
                <div key={`${track.participant.identity}-${track.source}`} className="w-full flex-shrink-0 aspect-video">
                  <CustomParticipantTile trackRef={track} />
                </div>
              ))}
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative flex items-center justify-center animate-in fade-in duration-700">
      <div className="w-full max-h-full flex items-center justify-center p-4">
         <GridLayout 
            tracks={currentTracks} 
            className="w-full max-h-full"
         >
            <CustomParticipantTile />
         </GridLayout>
      </div>

      {totalPages > 1 && (
        <>
          <button 
            disabled={page === 0}
            onClick={handlePrevPage}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-50 h-14 w-14 flex items-center justify-center rounded-full bg-black/40 backdrop-blur-xl border border-white/10 text-white transition-all disabled:opacity-0 disabled:pointer-events-none hover:scale-110 hover:bg-black/60"
          >
            <ChevronLeft className="h-8 w-8" />
          </button>
          <button 
            disabled={page >= totalPages - 1}
            onClick={handleNextPage}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-50 h-14 w-14 flex items-center justify-center rounded-full bg-black/40 backdrop-blur-xl border border-white/10 text-white transition-all disabled:opacity-0 disabled:pointer-events-none hover:scale-110 hover:bg-black/60"
          >
            <ChevronRight className="h-8 w-8" />
          </button>
          
          <div className="absolute bottom-[-2.5rem] left-1/2 -translate-x-1/2 flex gap-2 z-50">
             {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${i === page ? 'bg-cyan-500 w-4' : 'bg-white/20 w-1.5 hover:bg-white/40'}`} 
                />
             ))}
          </div>
        </>
      )}
    </div>
  );
});

const MeetingMainStage: React.FC<MeetingMainStageProps> = ({
  meetingId,
  isSidebarOpen,
  activeTab,
  onToggleSidebar,
  onEndSession,
}) => {
  const [isControlsExpanded, setIsControlsExpanded] = useState(true);

  return (
    <div className="flex-1 flex flex-col relative overflow-hidden bg-gradient-to-br from-[#0a0a0b] to-[#010101]">
      {/* Top Bar / Header */}
      <div className="h-16 px-6 flex items-center justify-between border-b border-white/5 relative z-20 bg-black/20 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <div className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_20px_rgba(16,185,129,0.5)]" />
            <span className="text-base font-black uppercase tracking-widest text-white">
              Live Session: {meetingId?.slice(0, 8)}
            </span>
          </div>
         <button 
           onClick={onEndSession} 
           className="px-5 py-2.5 translate-y-1 rounded-2xl bg-rose-500 hover:bg-rose-600 active:bg-rose-700 text-[11px] font-black text-white transition-all uppercase tracking-[0.15em] shadow-xl shadow-rose-500/20 active:scale-95 border border-rose-400/20"
         >
           End Session
         </button>
      </div>

      {/* Video Grid Area */}
      <div className="flex-1 relative p-4 overflow-hidden">
            <CustomVideoGrid />
         </div>

      {/* Control Bar Overlay - Slimmer and Collapsible */}
      <div className={`absolute bottom-12 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 p-2 rounded-[2rem] bg-[#0f0f12]/95 backdrop-blur-3xl border-2 border-white/30 shadow-2xl transition-all duration-300 ${isControlsExpanded ? 'scale-110' : 'scale-100'}`}>
         {isControlsExpanded && (
           <>
             <div className="flex items-center gap-2">
                <TrackToggle 
                  source={Track.Source.Microphone} 
                  className="bg-white/5 hover:bg-white/10 text-white p-3 rounded-xl transition-all [&.lk-button-enabled]:bg-cyan-500/20 [&.lk-button-enabled]:text-cyan-400"
                />
                <TrackToggle 
                  source={Track.Source.Camera} 
                  className="bg-white/5 hover:bg-white/10 text-white p-3 rounded-xl transition-all [&.lk-button-enabled]:bg-cyan-500/20 [&.lk-button-enabled]:text-cyan-400"
                />
                <TrackToggle 
                  source={Track.Source.ScreenShare} 
                  className="bg-white/5 hover:bg-white/10 text-white p-3 rounded-xl transition-all [&.lk-button-enabled]:bg-emerald-500/20 [&.lk-button-enabled]:text-emerald-400"
                />
                <div className="w-px h-6 bg-white/10 mx-1" />
                <button 
                  onClick={() => window.location.reload()} // Temporary settings placeholder
                  className="bg-white/5 hover:bg-white/10 text-white p-3 rounded-xl transition-all"
                >
                   <Settings className="h-5 w-5" />
                </button>
                <DisconnectButton className="bg-rose-500 hover:bg-rose-600 hover:scale-110 text-white p-3 rounded-xl transition-all duration-300 flex items-center justify-center shadow-lg hover:shadow-rose-500/20">
                   <LogOut className="h-5 w-5" />
                </DisconnectButton>
             </div>
             <div className="w-px h-6 bg-white/10 mx-1" />
             <button 
                onClick={() => onToggleSidebar('chat')}
                className={`h-10 w-10 flex items-center justify-center rounded-xl transition-all ${isSidebarOpen && activeTab === 'chat' ? 'bg-cyan-500 text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}
             >
                <MessageSquare className="h-4 w-4" />
             </button>
             <button 
                onClick={() => onToggleSidebar('participants')}
                className={`h-10 w-10 flex items-center justify-center rounded-xl transition-all ${isSidebarOpen && activeTab === 'participants' ? 'bg-indigo-500 text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}
             >
                <UsersIcon className="h-4 w-4" />
             </button>
             <div className="w-px h-6 bg-white/10 mx-1" />
           </>
         )}
         
         <button 
            onClick={() => setIsControlsExpanded(!isControlsExpanded)}
            className="h-10 w-10 flex items-center justify-center rounded-xl bg-white/5 text-white/80 hover:bg-white/10 transition-all"
         >
            {isControlsExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronUp className="h-5 w-5" />}
         </button>
      </div>
    </div>
  );
};

export default MeetingMainStage;
