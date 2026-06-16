import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useLocalParticipant } from "@livekit/components-react";
import apiClient from "@/lib/apiClient";
import { showSuccessToast, showErrorToast } from "@/lib/toastUtils";

interface UseAudioRecordingOptions {
  meetingId: string;
  isOrganizer: boolean;
}

export interface AudioRecordingControls {
  isRecording: boolean;
  recordingStartTimeRef: React.MutableRefObject<number | null>;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
}

export function useAudioRecording({
  meetingId,
  isOrganizer,
}: UseAudioRecordingOptions): AudioRecordingControls {
  const { t } = useTranslation();
  const { localParticipant, isMicrophoneEnabled } = useLocalParticipant();

  const [isRecording, setIsRecording] = useState(false);
  const isRecordingRef = useRef(false);
  const streamRef = useRef<MediaStream | null>(null);
  const chunkIndexRef = useRef(0);
  const recordingStartTimeRef = useRef<number | null>(null);
  const currentRecorderRef = useRef<MediaRecorder | null>(null);
  const activeTimeoutsRef = useRef<NodeJS.Timeout[]>([]);

  // ─── Internal helpers ────────────────────────────────────────────────────

  const clearAllTimeouts = () => {
    activeTimeoutsRef.current.forEach((t) => clearTimeout(t));
    activeTimeoutsRef.current = [];
  };

  const stopLocalMediaRecording = () => {
    clearAllTimeouts();

    if (
      currentRecorderRef.current &&
      currentRecorderRef.current.state === "recording"
    ) {
      try {
        currentRecorderRef.current.stop();
      } catch (err) {
        console.error("Error stopping recorder:", err);
      }
      currentRecorderRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const startLocalMediaRecording = async () => {
    try {
      stopLocalMediaRecording();

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      if (!recordingStartTimeRef.current) {
        recordingStartTimeRef.current = Date.now();
      }

      const startNewRecorder = (chunkStartOffset: number) => {
        if (
          !streamRef.current ||
          !streamRef.current.active ||
          !isRecordingRef.current ||
          !isMicrophoneEnabled
        )
          return;

        let options = {};
        if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
          options = { mimeType: "audio/webm;codecs=opus" };
        } else if (MediaRecorder.isTypeSupported("audio/ogg;codecs=opus")) {
          options = { mimeType: "audio/ogg;codecs=opus" };
        }

        const recorder = new MediaRecorder(streamRef.current!, options);
        currentRecorderRef.current = recorder;

        recorder.ondataavailable = async (e) => {
          if (e.data && e.data.size > 0) {
            const audioBlob = e.data;
            const chunkIndex = chunkIndexRef.current++;
            const chunkEndOffset = recordingStartTimeRef.current
              ? (Date.now() - recordingStartTimeRef.current) / 1000
              : chunkStartOffset + 15;

            console.log(
              `Uploading audio chunk ${chunkIndex}, size: ${audioBlob.size} bytes, range: ${chunkStartOffset.toFixed(1)}s - ${chunkEndOffset.toFixed(1)}s`,
            );

            const formData = new FormData();
            formData.append("audio", audioBlob, `chunk_${chunkIndex}.webm`);
            formData.append("userId", localParticipant.identity);
            formData.append(
              "speakerName",
              localParticipant.name || localParticipant.identity,
            );
            formData.append("startTime", String(chunkStartOffset));
            formData.append("endTime", String(chunkEndOffset));
            formData.append("chunkIndex", String(chunkIndex));

            try {
              await apiClient.post(
                `/meetings/${meetingId}/transcribe`,
                formData,
                { headers: { "Content-Type": "multipart/form-data" } },
              );
              console.log(`Successfully uploaded chunk ${chunkIndex}`);
            } catch (err) {
              console.error(`Failed to upload chunk ${chunkIndex}`, err);
            }
          }
        };

        recorder.start();

        // Rollover: slice every 15 seconds with 3s overlap
        const currentTimeout = setTimeout(() => {
          if (!isRecordingRef.current || !isMicrophoneEnabled) return;

          const nextOffset = recordingStartTimeRef.current
            ? (Date.now() - recordingStartTimeRef.current) / 1000
            : chunkStartOffset + 15;

          startNewRecorder(nextOffset);

          const stopTimeout = setTimeout(() => {
            if (recorder.state === "recording") {
              try {
                recorder.stop();
              } catch (err) {
                console.error("Error stopping old recorder:", err);
              }
            }
          }, 3000);
          activeTimeoutsRef.current.push(stopTimeout);
        }, 15000);

        activeTimeoutsRef.current.push(currentTimeout);
      };

      const initialOffset = recordingStartTimeRef.current
        ? (Date.now() - recordingStartTimeRef.current) / 1000
        : 0;
      startNewRecorder(initialOffset);
    } catch (err) {
      console.error("Failed to start MediaRecorder", err);
      showErrorToast(
        t(
          "meeting.recording.mic_permission_error",
          "Không thể bắt đầu ghi âm. Vui lòng cấp quyền micro.",
        ),
      );
    }
  };

  // ─── Public API ──────────────────────────────────────────────────────────

  const stopRecording = () => {
    isRecordingRef.current = false;
    setIsRecording(false);
    recordingStartTimeRef.current = null;

    if (isOrganizer) {
      // Delay backend deactivation to ensure the final chunk uploads successfully
      setTimeout(() => {
        apiClient
          .put(`/meetings/${meetingId}`, { aiActivated: false })
          .catch((err) => {
            console.error("Failed to deactivate AI Assistant on backend", err);
          });
      }, 1500);

      const payload = JSON.stringify({ type: "RECORDING_STOPPED" });
      try {
        localParticipant.publishData(new TextEncoder().encode(payload), {
          reliable: true,
        });
      } catch (err) {
        console.error("Failed to publish RECORDING_STOPPED signal", err);
      }
      showSuccessToast(
        t("meeting.recording.ai_paused", "Đã tạm dừng trợ lý ghi chép AI."),
      );
    } else {
      showSuccessToast(
        t(
          "meeting.recording.transcription_paused",
          "Đã tạm dừng ghi âm dịch thoại.",
        ),
      );
    }
  };

  const startRecording = async () => {
    try {
      if (isOrganizer) {
        await apiClient.put(`/meetings/${meetingId}`, { aiActivated: true });

        const payload = JSON.stringify({ type: "RECORDING_STARTED" });
        try {
          await localParticipant.publishData(
            new TextEncoder().encode(payload),
            { reliable: true },
          );
        } catch (err) {
          console.error("Failed to publish RECORDING_STARTED signal", err);
        }
      }

      isRecordingRef.current = true;
      setIsRecording(true);
      recordingStartTimeRef.current = Date.now();
      showSuccessToast(
        isOrganizer
          ? t(
              "meeting.recording.ai_activated",
              "Đã kích hoạt trợ lý ghi chép AI!",
            )
          : t(
              "meeting.recording.transcription_activated",
              "Hệ thống tự động ghi âm để dịch thoại.",
            ),
      );
    } catch (err) {
      console.error("Failed to start AI Assistant", err);
      showErrorToast(
        t(
          "meeting.recording.ai_start_failed",
          "Không thể bắt đầu trợ lý AI.",
        ),
      );
      setIsRecording(false);
      isRecordingRef.current = false;
    }
  };

  // ─── Effects ─────────────────────────────────────────────────────────────

  // Listen for organizer broadcast signals
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
    };
  }, [isOrganizer]);

  // Reactively start/stop local MediaRecorder based on recording + mic status
  const shouldLocalRecord = isRecording && isMicrophoneEnabled;

  useEffect(() => {
    if (shouldLocalRecord) {
      startLocalMediaRecording();
    } else {
      stopLocalMediaRecording();
    }

    return () => {
      stopLocalMediaRecording();
    };
  }, [shouldLocalRecord]);

  return {
    isRecording,
    recordingStartTimeRef,
    startRecording,
    stopRecording,
  };
}
