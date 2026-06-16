import React, { useState, useMemo, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  useTracks,
  GridLayout,
  ParticipantTile,
  useParticipantContext,
  ParticipantName,
  ParticipantTileProps,
  VideoTrack,
  useConnectionQualityIndicator,
  TrackToggle,
  DisconnectButton,
  useLocalParticipant,
  useMaybeTrackRefContext,
} from "@livekit/components-react";
import { Track, ConnectionQuality } from "livekit-client";
import {
  ChevronDown,
  ChevronUp,
  LogOut,
  Users as UsersIcon,
  Mic,
  MicOff,
  Radio,
  Monitor,
  MonitorOff,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAudioRecording } from "./useAudioRecording";
import { useScreenCapture } from "./useScreenCapture";


interface MeetingMainStageProps {
  meetingId: string;
  isSidebarOpen: boolean;
  activeTab: "chat" | "roster" | "lobby" | "settings" | "polls";
  hasUnreadPolls?: boolean;
  isOrganizer: boolean;
  onToggleSidebar: (
    tab: "chat" | "roster" | "lobby" | "settings" | "polls",
  ) => void;
  onEndSession: () => void;
  onLeaveSession?: () => void;
  onReturnToMain?: () => void;
  isInBreakout?: boolean;
}

interface ParticipantAvatarOverlayProps {
  trackSource?: Track.Source;
  isCompact?: boolean;
}

const ParticipantAvatarOverlay = ({
  trackSource,
  isCompact = false,
}: ParticipantAvatarOverlayProps) => {
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

  // Don't show avatar overlay on Screen Share track
  if (trackSource === Track.Source.ScreenShare) return null;

  // Only show avatar if camera is NOT enabled AND NOT currently publishing
  if (p?.isCameraEnabled) return null;

  const avatarSizeClasses = isCompact
    ? "h-12 w-12 md:h-14 md:w-14"
    : "h-28 w-28 md:h-36 md:w-36";

  const iconSizeClasses = isCompact ? "h-6 w-6" : "h-12 w-12";

  return (
    <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-[#050505]">
      <div className={isCompact ? "relative mb-1.5" : "relative mb-4"}>
        <div className="absolute inset-0 bg-cyan-500/20 blur-[60px] rounded-full scale-150 animate-pulse" />
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={p?.identity}
            className={`${avatarSizeClasses} rounded-full border-4 border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] relative z-10 object-cover`}
          />
        ) : (
          <div
            className={`${avatarSizeClasses} rounded-full bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center text-white/10 border-2 border-white/5 relative z-10`}
          >
            <UsersIcon className={`${iconSizeClasses} opacity-20`} />
          </div>
        )}
      </div>
      {!isCompact && (
        <div className="relative z-10 rounded-full bg-black/60 border border-white/30 backdrop-blur-xl shadow-2xl transition-all mt-3 px-6 py-2">
          <span className="text-sm font-bold text-white tracking-tight">
            <ParticipantName />
          </span>
        </div>
      )}
    </div>
  );
};

const ParticipantStatusOverlay = ({
  trackSource,
  isCompact = false,
}: {
  trackSource?: Track.Source;
  isCompact?: boolean;
}) => {
  const { t } = useTranslation();
  const p = useParticipantContext();
  const isScreenShare = trackSource === Track.Source.ScreenShare;

  if (isCompact) {
    const isMuted = !p?.isMicrophoneEnabled;
    return (
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-[110] flex items-center gap-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 px-2.5 py-0.5 max-w-[calc(100%-16px)] whitespace-nowrap">
        {!isScreenShare && isMuted && (
          <MicOff className="h-3.5 w-3.5 text-rose-500 shrink-0" />
        )}
        {isScreenShare ? (
          <div className="flex items-center gap-1 text-emerald-400">
            <Monitor className="h-3 w-3 animate-pulse shrink-0" />
            <span className="text-[10px] font-bold text-white truncate max-w-[100px]">
              <ParticipantName />
            </span>
          </div>
        ) : (
          <span className="text-[10px] font-bold text-white truncate max-w-[100px]">
            <ParticipantName />
          </span>
        )}
      </div>
    );
  }

  const isMuted = !p?.isMicrophoneEnabled;

  return (
    <div
      className={`absolute z-[110] flex items-center gap-2 rounded-full bg-black/60 backdrop-blur-2xl border border-white/20 shadow-2xl transition-all bottom-6 left-6 px-4 py-2`}
    >
      <div className="flex items-center gap-2">
        {!isScreenShare && isMuted && (
          <MicOff className="h-4 w-4 text-rose-500 shrink-0" />
        )}
        {isScreenShare ? (
          <div className="flex items-center gap-1.5 text-emerald-400">
            <Monitor className="h-3.5 w-3.5 animate-pulse" />
            <span className="text-xs font-bold tracking-wider">
              {t("meeting.screenshare_of", "Màn hình của")} <ParticipantName />
            </span>
          </div>
        ) : (
          <span className="text-xs font-bold text-white truncate max-w-[120px]">
            <ParticipantName />
          </span>
        )}
      </div>
    </div>
  );
};

const CustomConnectionIndicator = () => {
  const { quality } = useConnectionQualityIndicator();
  return (
    <div className="flex items-end gap-1 h-3.5 opacity-90">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className={`w-1 rounded-full transition-all ${i === 1 ? "h-1.5" : i === 2 ? "h-2.5" : "h-3.5"} ${quality === ConnectionQuality.Excellent ? "bg-emerald-500" : quality === ConnectionQuality.Good ? "bg-amber-500" : "bg-rose-500"}`}
        />
      ))}
    </div>
  );
};

interface CustomParticipantTileProps extends ParticipantTileProps {
  isCompact?: boolean;
  hideStatusOverlay?: boolean;
}

const CustomParticipantTile = ({
  trackRef,
  className,
  isCompact = false,
  hideStatusOverlay = false,
  ...props
}: CustomParticipantTileProps) => {
  const trackRefContext = useMaybeTrackRefContext();
  const activeTrackRef = trackRef || trackRefContext;
  const isScreenShare = activeTrackRef?.source === Track.Source.ScreenShare;
  return (
    <ParticipantTile
      trackRef={activeTrackRef}
      {...props}
      className={`relative group overflow-hidden rounded-2xl border-2 bg-[#0a0a0b] aspect-video transition-all ${
        isScreenShare
          ? "border-emerald-500/80 shadow-[0_0_30px_rgba(16,185,129,0.2)]"
          : "border-white/30"
      } ${className}`}
    >
      <VideoTrack
        trackRef={activeTrackRef as any}
        className="absolute inset-0 w-full h-full z-0 object-contain"
      />
      <ParticipantAvatarOverlay
        trackSource={activeTrackRef?.source}
        isCompact={isCompact}
      />
      <div
        className={`absolute z-[30] transition-all ${isCompact ? "top-3 left-3" : "top-8 left-8"}`}
      >
        <CustomConnectionIndicator />
      </div>
      {!hideStatusOverlay && (
        <ParticipantStatusOverlay
          trackSource={activeTrackRef?.source}
          isCompact={isCompact}
        />
      )}
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
  const { localParticipant, isScreenShareEnabled } =
    useLocalParticipant();
  const screenShareTrack = localParticipant.getTrackPublication(
    Track.Source.ScreenShare,
  );
  const [isControlsExpanded, setIsControlsExpanded] = useState(true);
  const [showEndConfirmation, setShowEndConfirmation] = useState(false);
  const [cameraPage, setCameraPage] = useState(0);
  const [activeScreenShareIndex, setActiveScreenShareIndex] = useState(0);
  const [isShareDropdownOpen, setIsShareDropdownOpen] = useState(false);
  const shareDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        shareDropdownRef.current &&
        !shareDropdownRef.current.contains(event.target as Node)
      ) {
        setIsShareDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const [isLargeScreen, setIsLargeScreen] = useState(window.innerWidth >= 1024);

  useEffect(() => {
    const handleResize = () => {
      setIsLargeScreen(window.innerWidth >= 1024);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // ─── Audio recording (transcription) ──────────────────────────────────────
  const { isRecording, recordingStartTimeRef, startRecording, stopRecording } =
    useAudioRecording({ meetingId, isOrganizer });

  // ─── Screen capture (slide change detection + upload) ─────────────────────
  const hiddenVideoRef = useRef<HTMLVideoElement>(null);

  useScreenCapture({
    meetingId,
    isRecording,
    recordingStartTimeRef,
    hiddenVideoRef,
    screenShareTrack,
    isScreenShareEnabled,
  });

  const tracks = useTracks([
    { source: Track.Source.Camera, withPlaceholder: true },
    { source: Track.Source.ScreenShare, withPlaceholder: false },
  ]).sort((a, b) => {
    // Luôn ưu tiên Screen Share lên đầu
    if (
      a.source === Track.Source.ScreenShare &&
      b.source !== Track.Source.ScreenShare
    )
      return -1;
    if (
      a.source !== Track.Source.ScreenShare &&
      b.source === Track.Source.ScreenShare
    )
      return 1;
    // Các trường hợp còn lại sắp xếp cố định theo Identity của người dùng để tránh nhảy màn
    return a.participant.identity.localeCompare(b.participant.identity);
  });

  const screenshareTracks = tracks.filter(
    (t) => t.source === Track.Source.ScreenShare,
  );

  // Auto-bound screenshare index if number of tracks decreases
  useEffect(() => {
    if (activeScreenShareIndex >= screenshareTracks.length && screenshareTracks.length > 0) {
      setActiveScreenShareIndex(screenshareTracks.length - 1);
    }
  }, [screenshareTracks.length, activeScreenShareIndex]);

  const activeScreenShareTrack = screenshareTracks[activeScreenShareIndex];
  const cameraTracks = tracks.filter(
    (t) => t.source !== Track.Source.ScreenShare,
  );

  const pageSize = 3;
  const totalCameraPages = Math.ceil(cameraTracks.length / pageSize);

  // Auto-bound page index if number of tracks decreases
  useEffect(() => {
    if (cameraPage >= totalCameraPages && totalCameraPages > 0) {
      setCameraPage(totalCameraPages - 1);
    }
  }, [cameraTracks.length, totalCameraPages, cameraPage]);

  const displayedCameraTracks = isLargeScreen
    ? cameraTracks.slice(cameraPage * pageSize, (cameraPage + 1) * pageSize)
    : cameraTracks;

  return (
    <div className="flex-1 flex flex-col relative overflow-hidden max-h-full bg-[#020202]">
      <AnimatePresence>
        {showEndConfirmation && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowEndConfirmation(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative w-full max-w-lg rounded-[3rem] border border-white/20 bg-[#111115] p-12 text-center shadow-2xl"
            >
              <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-rose-500/20 text-rose-500 mx-auto">
                <LogOut className="h-10 w-10" />
              </div>
              <h2 className="text-3xl font-black text-white">
                {t("meeting.end_session_confirm")}
              </h2>
              <p className="mt-4 text-slate-400 text-lg">
                {t("meeting.end_session_desc")}
              </p>
              <div className="mt-10 flex flex-col gap-3">
                <button
                  onClick={onEndSession}
                  className="h-14 w-full rounded-2xl bg-rose-500 font-bold text-white shadow-xl shadow-rose-500/20"
                >
                  {t("meeting.end_for_all")}
                </button>
                <button
                  onClick={() => setShowEndConfirmation(false)}
                  className="h-14 w-full rounded-2xl bg-white/5 font-bold text-slate-300"
                >
                  {t("meeting.keep_active")}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="h-20 px-8 flex items-center justify-between border-b border-white/5 relative z-20 bg-black/40 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_15px_rgba(16,185,129,0.5)]" />
          <span className="text-lg font-medium text-white/90">
            {t("meeting.live_session")}: {meetingId?.slice(0, 8)}
          </span>
          {isRecording && (
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.1)]">
              <div className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-xs font-bold text-cyan-400 tracking-wider animate-pulse">
                Trợ lý AI đang ghi chép...
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          {isOrganizer && (
            <>
              {!isInBreakout && (
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`px-5 py-3 rounded-2xl flex items-center gap-2.5 font-semibold text-sm transition-all tracking-tight active:scale-95 border ${
                    isRecording
                      ? "bg-cyan-500/15 border-cyan-500/30 text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.15)]"
                      : "bg-white/5 border-white/10 hover:bg-white/10 text-white/80"
                  }`}
                >
                  {isRecording ? (
                    <>
                      <Radio className="h-4 w-4 animate-pulse text-cyan-400" />
                      <span>Dừng trợ lý ghi chép</span>
                    </>
                  ) : (
                    <>
                      <Mic className="h-4 w-4 text-white/60" />
                      <span>Trợ lý ghi chép AI</span>
                    </>
                  )}
                </button>
              )}
              <button
                onClick={() => setShowEndConfirmation(true)}
                className="px-6 py-3 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white font-semibold text-sm transition-all shadow-lg shadow-rose-500/20 active:scale-95"
              >
                {t("meeting.end_session")}
              </button>
            </>
          )}
          {isInBreakout && onReturnToMain && (
            <button
              onClick={onReturnToMain}
              className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all shadow-lg shadow-indigo-600/20 flex items-center gap-2 active:scale-95"
            >
              <span>{t("meeting.leave_breakout", "Rời phòng thảo luận")}</span>
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Screen Share Management Banner */}
      {isScreenShareEnabled && (
        <div className="flex items-center justify-between px-6 py-2.5 bg-emerald-500/10 border-b border-emerald-500/20 z-20">
          <div className="flex items-center gap-2.5">
            <Monitor className="h-4 w-4 text-emerald-400 animate-pulse" />
            <span className="text-sm font-bold text-emerald-400">
              Bạn đang chia sẻ màn hình
            </span>
          </div>
          <button
            onClick={() => localParticipant.setScreenShareEnabled(false)}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-rose-500/20 text-emerald-400 hover:text-rose-400 border border-emerald-500/30 hover:border-rose-500/30 text-xs font-bold transition-all"
          >
            <MonitorOff className="h-3.5 w-3.5" />
            <span>Dừng chia sẻ</span>
          </button>
        </div>
      )}

      <div className="flex-1 relative overflow-hidden flex items-center justify-center p-6">
        <div className="w-full h-full mx-auto">
          {activeScreenShareTrack ? (
            <div className="w-full h-full flex flex-col lg:flex-row gap-6 items-stretch">
              {/* Main Focused Screen Share */}
              <div className="flex-1 min-w-0 h-full relative rounded-2xl overflow-hidden flex items-center justify-center bg-[#0a0a0b] border-2 border-emerald-500/50 shadow-[0_0_30px_rgba(16,185,129,0.15)]">
                <CustomParticipantTile
                  trackRef={activeScreenShareTrack}
                  hideStatusOverlay={true}
                  className="w-full h-full border-none bg-transparent shadow-none"
                />

                {/* Screenshare Selector Dropdown */}
                <div 
                  ref={shareDropdownRef}
                  className="absolute z-[120] bottom-6 left-6"
                >
                  {screenshareTracks.length > 1 ? (
                    <div className="relative">
                      {isShareDropdownOpen && (
                        <div className="absolute bottom-full left-0 mb-2 z-[130] w-64 rounded-2xl bg-[#0f0f12]/95 backdrop-blur-3xl border border-white/20 p-2 shadow-2xl flex flex-col gap-1">
                          <div className="px-3 py-1.5 text-[10px] font-bold text-white/40 tracking-wider">
                            {t('meeting.sharing_screens', 'Người đang chia sẻ')}
                          </div>
                          {screenshareTracks.map((track, idx) => (
                            <button
                              key={`${track.participant.identity}-${track.source}`}
                              onClick={() => {
                                setActiveScreenShareIndex(idx);
                                setIsShareDropdownOpen(false);
                              }}
                              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-all ${
                                idx === activeScreenShareIndex
                                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                  : "text-white/80 hover:text-white hover:bg-white/5 border border-transparent"
                              }`}
                            >
                              <div className="flex items-center gap-2 truncate">
                                <Monitor className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate">
                                  {track.participant.name || track.participant.identity}
                                </span>
                              </div>
                              {idx === activeScreenShareIndex && (
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                      
                      <button
                        onClick={() => setIsShareDropdownOpen(!isShareDropdownOpen)}
                        className="flex items-center gap-2 rounded-full bg-black/60 backdrop-blur-2xl border border-emerald-500/40 hover:border-emerald-500/80 shadow-2xl transition-all px-4 py-2 hover:bg-black/80"
                      >
                        <div className="flex items-center gap-1.5 text-emerald-400">
                          <Monitor className="h-3.5 w-3.5 animate-pulse" />
                          <span className="text-xs font-bold tracking-wider">
                            {t('meeting.screenshare_of', 'Màn hình của')}{" "}
                            {activeScreenShareTrack?.participant.name || activeScreenShareTrack?.participant.identity}
                          </span>
                        </div>
                        <ChevronDown className="h-3.5 w-3.5 text-emerald-400/80" />
                      </button>
                    </div>
                  ) : (
                    // Default static label if only 1 person is sharing screen
                    <div className="flex items-center gap-2 rounded-full bg-black/60 backdrop-blur-2xl border border-white/20 shadow-2xl px-4 py-2">
                      <div className="flex items-center gap-1.5 text-emerald-400">
                        <Monitor className="h-3.5 w-3.5 animate-pulse" />
                        <span className="text-xs font-bold tracking-wider">
                          {t('meeting.screenshare_of', 'Màn hình của')}{" "}
                          {activeScreenShareTrack?.participant.name || activeScreenShareTrack?.participant.identity}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Camera Tiles Strip */}
              {cameraTracks.length > 0 && (
                <div className="w-full lg:w-48 shrink-0 flex flex-col items-center justify-center gap-3">
                  {/* Up Chevron Button */}
                  {isLargeScreen && totalCameraPages > 1 && (
                    <button
                      onClick={() => setCameraPage((p) => Math.max(0, p - 1))}
                      disabled={cameraPage === 0}
                      className="hidden lg:flex items-center justify-center w-8 h-8 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none transition-all duration-200 active:scale-95"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </button>
                  )}

                  {/* Camera list grid */}
                  <div className="w-full flex flex-row lg:flex-col gap-3 overflow-auto lg:overflow-hidden pr-1 items-center lg:items-stretch justify-start">
                    {displayedCameraTracks.map((track) => (
                      <CustomParticipantTile
                        key={`${track.participant.identity}-${track.source}`}
                        trackRef={track}
                        className="w-48 lg:w-full aspect-video shrink-0"
                        isCompact={true}
                      />
                    ))}
                  </div>

                  {/* Down Chevron Button */}
                  {isLargeScreen && totalCameraPages > 1 && (
                    <button
                      onClick={() =>
                        setCameraPage((p) =>
                          Math.min(totalCameraPages - 1, p + 1),
                        )
                      }
                      disabled={cameraPage === totalCameraPages - 1}
                      className="hidden lg:flex items-center justify-center w-8 h-8 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none transition-all duration-200 active:scale-95"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                  )}

                  {/* Dot Indicators */}
                  {isLargeScreen && totalCameraPages > 1 && (
                    <div className="hidden lg:flex items-center gap-1.5 mt-1">
                      {Array.from({ length: totalCameraPages }).map(
                        (_, idx) => (
                          <button
                            key={idx}
                            onClick={() => setCameraPage(idx)}
                            className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                              idx === cameraPage
                                ? "bg-cyan-400 scale-125 shadow-[0_0_8px_rgba(34,211,238,0.5)]"
                                : "bg-white/20 hover:bg-white/40"
                            }`}
                          />
                        ),
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <GridLayout
              tracks={tracks}
              className="w-full h-full place-content-center gap-6"
            >
              <CustomParticipantTile />
            </GridLayout>
          )}
        </div>
      </div>

      <div
        className={`absolute bottom-8 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 p-2 rounded-[2rem] bg-[#0f0f12]/95 backdrop-blur-3xl border border-white/20 shadow-2xl transition-all duration-300`}
      >
        {isControlsExpanded && (
          <div className="flex items-center gap-2">
            <TrackToggle
              source={Track.Source.Microphone}
              className="bg-white/5 hover:bg-white/10 text-white p-3 rounded-xl transition-all [&[data-lk-enabled='true']]:bg-cyan-500/20 [&[data-lk-enabled='true']]:text-cyan-400"
            />
            <TrackToggle
              source={Track.Source.Camera}
              className="bg-white/5 hover:bg-white/10 text-white p-3 rounded-xl transition-all [&[data-lk-enabled='true']]:bg-cyan-500/20 [&[data-lk-enabled='true']]:text-cyan-400"
            />
            <TrackToggle
              source={Track.Source.ScreenShare}
              className="bg-white/5 hover:bg-white/10 text-white p-3 rounded-xl transition-all [&[data-lk-enabled='true']]:bg-emerald-500/20 [&[data-lk-enabled='true']]:text-emerald-400"
            />
            <div className="w-px h-6 bg-white/10 mx-1" />

            <DisconnectButton className="bg-rose-500 hover:bg-rose-600 text-white p-3 rounded-xl shadow-lg">
              <LogOut className="h-5 w-5" />
            </DisconnectButton>
          </div>
        )}
        <button
          onClick={() => setIsControlsExpanded(!isControlsExpanded)}
          className="h-10 w-10 flex items-center justify-center rounded-xl bg-white/5 text-white/80 hover:bg-white/10 transition-all"
        >
          {isControlsExpanded ? (
            <ChevronDown className="h-5 w-5" />
          ) : (
            <ChevronUp className="h-5 w-5" />
          )}
        </button>
      </div>
      {/* Hidden Video element for screen capturing */}
      <video
        ref={hiddenVideoRef}
        autoPlay
        playsInline
        muted
        style={{ display: "none" }}
      />
    </div>
  );
};

export default MeetingMainStage;
