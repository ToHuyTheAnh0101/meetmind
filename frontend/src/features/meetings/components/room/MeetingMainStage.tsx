import React, { useState, useMemo, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
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
  useLocalParticipant,
} from "@livekit/components-react";
import { Track, ConnectionQuality } from "livekit-client";
import {
  ChevronDown,
  ChevronUp,
  LogOut,
  Users as UsersIcon,
  Mic,
  Radio,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import apiClient from "@/lib/apiClient";
import { showSuccessToast, showErrorToast } from "@/lib/toastUtils";

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
          <img
            src={avatarUrl}
            alt={p?.identity}
            className="h-28 w-28 md:h-36 md:w-36 rounded-full border-4 border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] relative z-10 object-cover"
          />
        ) : (
          <div className="h-28 w-28 md:h-36 md:w-36 rounded-full bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center text-white/10 border-2 border-white/5 relative z-10">
            <UsersIcon className="h-12 w-12 opacity-20" />
          </div>
        )}
      </div>
      <div className="relative z-10 mt-3 px-6 py-2 rounded-full bg-black/60 border border-white/30 backdrop-blur-xl shadow-2xl">
        <span className="text-sm font-bold text-white tracking-tight">
          <ParticipantName />
        </span>
      </div>
    </div>
  );
};

const ParticipantStatusOverlay = () => {
  const p = useParticipantContext();
  return (
    <div className="absolute bottom-6 left-6 z-[110] flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/60 backdrop-blur-2xl border border-white/20 shadow-2xl">
      <div className="flex items-center gap-2">
        <TrackMutedIndicator
          trackRef={{ participant: p, source: Track.Source.Microphone }}
          className="scale-110"
        />
        {p.isCameraEnabled && (
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

const CustomParticipantTile = ({
  trackRef,
  className,
  ...props
}: ParticipantTileProps) => {
  return (
    <ParticipantTile
      trackRef={trackRef}
      {...props}
      className={`relative group overflow-hidden rounded-[3rem] border-2 border-white/30 bg-[#0a0a0b] aspect-video ${className}`}
    >
      <VideoTrack
        trackRef={trackRef as any}
        className="absolute inset-0 w-full h-full z-0 object-contain"
      />
      <ParticipantAvatarOverlay />
      <div className="absolute top-8 left-8 z-[30]">
        <CustomConnectionIndicator />
      </div>
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
  const { localParticipant } = useLocalParticipant();
  const [isControlsExpanded, setIsControlsExpanded] = useState(true);
  const [showEndConfirmation, setShowEndConfirmation] = useState(false);

  // Background Media Recording states & refs
  const [isRecording, setIsRecording] = useState(false);
  const isRecordingRef = useRef(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const chunkIndexRef = useRef(0);

  const stopRecording = () => {
    isRecordingRef.current = false;
    setIsRecording(false);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (recorderRef.current && recorderRef.current.state === "recording") {
      recorderRef.current.stop();
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (isOrganizer) {
      // Broadcast RECORDING_STOPPED signal
      const payload = JSON.stringify({ type: "RECORDING_STOPPED" });
      try {
        localParticipant.publishData(new TextEncoder().encode(payload), {
          reliable: true,
        });
      } catch (err) {
        console.error("Failed to publish RECORDING_STOPPED signal", err);
      }
      showSuccessToast("Đã tạm dừng trợ lý ghi chép AI.");
    } else {
      showSuccessToast("Đã tạm dừng ghi âm dịch thoại.");
    }
  };

  const startRecording = async () => {
    try {
      // 1. Ensure meeting session is active on the backend and broadcast signal (Organizer only)
      if (isOrganizer) {
        try {
          await apiClient.post(`/meetings/${meetingId}/sessions/start`);
        } catch (err) {
          console.error(
            "Failed to start session on backend, but proceeding anyway",
            err,
          );
        }

        // Broadcast RECORDING_STARTED signal
        const payload = JSON.stringify({ type: "RECORDING_STARTED" });
        try {
          await localParticipant.publishData(
            new TextEncoder().encode(payload),
            {
              reliable: true,
            },
          );
        } catch (err) {
          console.error("Failed to publish RECORDING_STARTED signal", err);
        }
      }

      // 2. Request mic permission and get stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      isRecordingRef.current = true;
      setIsRecording(true);

      // Helper function to start a recorder instance
      const startNewRecorder = () => {
        if (
          !streamRef.current ||
          !streamRef.current.active ||
          !isRecordingRef.current
        )
          return;

        let options = {};
        if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
          options = { mimeType: "audio/webm;codecs=opus" };
        } else if (MediaRecorder.isTypeSupported("audio/ogg;codecs=opus")) {
          options = { mimeType: "audio/ogg;codecs=opus" };
        }

        const recorder = new MediaRecorder(streamRef.current, options);
        recorderRef.current = recorder;

        recorder.ondataavailable = async (e) => {
          // Always upload available data, even if recording was just stopped.
          // The final chunk (e.g. last 15s before session end) must not be lost.
          // The backend now accepts chunks for both ONGOING and COMPLETED sessions.
          if (!isRecordingRef.current) {
            console.log("[Recording] Uploading final chunk after stop...");
          }
          if (e.data && e.data.size > 0) {
            const audioBlob = e.data;
            const chunkIndex = chunkIndexRef.current++;
            console.log(
              `Uploading audio chunk ${chunkIndex}, size: ${audioBlob.size} bytes`,
            );

            const formData = new FormData();
            formData.append("audio", audioBlob, `chunk_${chunkIndex}.webm`);
            formData.append("userId", localParticipant.identity);
            formData.append(
              "speakerName",
              localParticipant.name || localParticipant.identity,
            );
            formData.append("startTime", String(chunkIndex * 30));
            formData.append("endTime", String(chunkIndex * 30 + 35));
            formData.append("chunkIndex", String(chunkIndex));

            try {
              await apiClient.post(
                `/meetings/${meetingId}/transcribe`,
                formData,
                {
                  headers: {
                    "Content-Type": "multipart/form-data",
                  },
                },
              );
              console.log(`Successfully uploaded chunk ${chunkIndex}`);
            } catch (err) {
              console.error(`Failed to upload chunk ${chunkIndex}`, err);
            }
          }
        };

        recorder.start();

        // Cứ mỗi 30 giây, khởi chạy gối đầu recorder tiếp theo trước khi dừng hẳn recorder cũ
        timeoutRef.current = setTimeout(() => {
          if (!isRecordingRef.current) return;

          // 1. Kích hoạt recorder tiếp theo ngay lập tức (Bắt đầu thu gối đầu không khe hở)
          startNewRecorder();

          // 2. Đợi đúng 5 giây (5000ms) gối đầu an toàn rồi mới dừng hẳn recorder hiện tại
          setTimeout(() => {
            if (recorder.state === "recording") {
              recorder.stop();
            }
          }, 5000);
        }, 30000);
      };

      startNewRecorder();
      showSuccessToast(
        isOrganizer
          ? "Đã kích hoạt trợ lý ghi chép AI!"
          : "Hệ thống tự động ghi âm để dịch thoại.",
      );
    } catch (err) {
      console.error("Failed to start MediaRecorder", err);
      showErrorToast("Không thể bắt đầu ghi âm. Vui lòng cấp quyền micro.");
      setIsRecording(false);
      isRecordingRef.current = false;
    }
  };

  useEffect(() => {
    const handleRecordingStarted = () => {
      if (!isOrganizer && !isRecordingRef.current) {
        startRecording();
      }
    };

    const handleRecordingStopped = () => {
      if (!isOrganizer && isRecordingRef.current) {
        stopRecording();
      }
    };

    window.addEventListener("recording-started", handleRecordingStarted);
    window.addEventListener("recording-stopped", handleRecordingStopped);

    return () => {
      window.removeEventListener("recording-started", handleRecordingStarted);
      window.removeEventListener("recording-stopped", handleRecordingStopped);

      // Clean up recording on unmount
      isRecordingRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (recorderRef.current && recorderRef.current.state === "recording") {
        recorderRef.current.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isOrganizer, localParticipant]);

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
            <span className="text-sm font-black tracking-tight">
              RỜI PHÒNG THẢO LUẬN
            </span>
            <LogOut className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      )}

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
              <button
                onClick={() => setShowEndConfirmation(true)}
                className="px-6 py-3 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white font-medium transition-all shadow-lg shadow-rose-500/20"
              >
                {t("meeting.end_session")}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 relative overflow-hidden flex items-center justify-center p-6">
        <div className="w-full h-full max-w-[calc(100vw-480px)] mx-auto">
          <GridLayout
            tracks={tracks}
            className="w-full h-full place-content-center gap-6"
          >
            <CustomParticipantTile />
          </GridLayout>
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
    </div>
  );
};

export default MeetingMainStage;
