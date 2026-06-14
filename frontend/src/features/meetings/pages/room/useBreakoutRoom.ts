import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "react-hot-toast";
import { useTranslation } from "react-i18next";
import apiClient from "@/lib/apiClient";
import { showSuccessToast, showErrorToast } from "@/lib/toastUtils";

export interface JoinResponse {
  meetingId: string;
  organizerId: string;
  token: string;
  liveKitUrl: string;
  participants: any[];
  status?: string;
  isBreakoutRoom?: boolean;
  room?: string;
}

export const useBreakoutRoom = (meetingId: string | undefined, userId: string | undefined) => {
  const { t } = useTranslation();
  const [joinData, setJoinData] = useState<JoinResponse | null>(null);
  const [originalJoinData, setOriginalJoinData] = useState<JoinResponse | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionTarget, setTransitionTarget] = useState("");
  const loadingToastIdRef = useRef<string | undefined>(undefined);

  // Keep track of the original main room join data
  useEffect(() => {
    if (joinData && !originalJoinData && !joinData.token.includes("breakout")) {
      setOriginalJoinData(joinData);
    }
  }, [joinData, originalJoinData]);

  const handleConnected = useCallback(() => {
    if (isTransitioning) {
      if (loadingToastIdRef.current) {
        toast.dismiss(loadingToastIdRef.current);
        loadingToastIdRef.current = undefined;
      }
      showSuccessToast(
        transitionTarget 
          ? t('meeting.joined_room', 'Đã tham gia {{room}}', { room: transitionTarget }) 
          : t('meeting.connection_success', 'Kết nối thành công'),
        transitionTarget === t('meeting.main_room', 'phòng chính') ? "🏠" : "🚪"
      );
      setIsTransitioning(false);
    }
  }, [isTransitioning, transitionTarget, t]);

  const handleBreakoutStarted = useCallback(
    async (e?: any) => {
      if (!meetingId) return;
      const isEvent = !!e;
      console.log(
        "[BREAKOUT] Signal received:",
        e?.detail || "Manual/Mount check",
      );

      if (isEvent && e.detail?.assignments) {
        const assignments = e.detail.assignments;
        const isAssigned = assignments.some(
          (as: any) => String(as.userId) === String(userId),
        );
        if (!isAssigned) {
          console.log(
            "[BREAKOUT] User not assigned to any breakout room. Ignoring signal.",
          );
          return;
        }
      }

      if (isEvent) {
        loadingToastIdRef.current = toast.loading(t('meeting.preparing_breakout', 'Đang chuẩn bị phòng thảo luận...'), {
          style: {
            background: "#111115",
            color: "#fff",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: "1rem",
          },
        });
      }

      try {
        const resp = await apiClient.get(
          `/meetings/${meetingId}/breakout-rooms/my-token`,
        );
        if (resp.data && resp.data.token) {
          setIsTransitioning(true);
          setTransitionTarget(resp.data.roomName);

          if (isEvent && loadingToastIdRef.current) {
            toast.loading(t('meeting.moving_to_room', 'Đang di chuyển sang {{room}}...', { room: resp.data.roomName }), {
              id: loadingToastIdRef.current,
            });
          } else {
            if (loadingToastIdRef.current) {
              toast.dismiss(loadingToastIdRef.current);
            }
            loadingToastIdRef.current = toast.loading(t('meeting.moving_to_room', 'Đang di chuyển sang {{room}}...', { room: resp.data.roomName }), {
              style: {
                background: "#111115",
                color: "#fff",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "1rem",
              },
            });
          }

          setJoinData((prev: any) => ({
            ...prev!,
            token: resp.data.token,
            room: resp.data.roomName,
            isBreakoutRoom: true,
          }));
        } else {
          console.log(
            "[BREAKOUT] No token returned for this user. Staying in current room.",
          );
          if (loadingToastIdRef.current) {
            toast.dismiss(loadingToastIdRef.current);
            loadingToastIdRef.current = undefined;
          }
        }
      } catch (err) {
        console.error("Failed to join breakout room", err);
        if (loadingToastIdRef.current) {
          toast.dismiss(loadingToastIdRef.current);
          loadingToastIdRef.current = undefined;
        }
        if (isEvent) {
          showErrorToast(t('meeting.cannot_join_breakout', 'Không thể chuyển sang phòng thảo luận'));
        }
      }
    },
    [meetingId, userId],
  );

  const handleBreakoutEnded = useCallback(async () => {
    if (!meetingId) return;
    console.log("[BREAKOUT] End signal received.");

    loadingToastIdRef.current = toast.loading(t('meeting.moving_to_main', 'Đang di chuyển về phòng chính...'), {
      style: {
        background: "#111115",
        color: "#fff",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        borderRadius: "1rem",
      },
    });

    try {
      await apiClient.post(`/meetings/${meetingId}/breakout-rooms/leave`);
    } catch (err) {
      console.error("Failed to clear breakout room assignment on backend", err);
    }

    setIsTransitioning(true);
    setTransitionTarget(t('meeting.main_room', 'phòng chính'));

    if (originalJoinData) {
      setJoinData(originalJoinData);
    } else {
      try {
        const res = await apiClient.post(`/meetings/${meetingId}/join`);
        setJoinData((prev: any) =>
          prev
            ? { ...prev, token: res.data.token, isBreakoutRoom: false }
            : res.data,
        );
      } catch (err) {
        console.error("Failed to return to main room", err);
        if (loadingToastIdRef.current) {
          toast.dismiss(loadingToastIdRef.current);
          loadingToastIdRef.current = undefined;
        }
        setIsTransitioning(false);
        showErrorToast(t('meeting.return_to_main_error', 'Lỗi khi quay lại phòng chính'));
      }
    }
  }, [meetingId, originalJoinData]);

  const handleJoinBreakoutAsHost = useCallback(
    async (roomId: string) => {
      if (!meetingId) return;

      loadingToastIdRef.current = toast.loading(t('meeting.preparing_breakout', 'Đang chuẩn bị phòng thảo luận...'), {
        style: {
          background: "#111115",
          color: "#fff",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          borderRadius: "1rem",
        },
      });

      try {
        const resp = await apiClient.get(
          `/meetings/${meetingId}/breakout-rooms/${roomId}/token-host`,
        );
        if (resp.data && resp.data.token) {
          setIsTransitioning(true);
          setTransitionTarget(resp.data.roomName);

          toast.loading(t('meeting.moving_to_room', 'Đang di chuyển sang {{room}}...', { room: resp.data.roomName }), {
            id: loadingToastIdRef.current,
          });

          setJoinData((prev: any) => ({
            ...prev!,
            token: resp.data.token,
            room: resp.data.roomName,
            isBreakoutRoom: true,
          }));
        } else {
          console.log("[BREAKOUT] No token returned for host.");
          if (loadingToastIdRef.current) {
            toast.dismiss(loadingToastIdRef.current);
            loadingToastIdRef.current = undefined;
          }
        }
      } catch (err) {
        console.error("Failed to join breakout room as host", err);
        if (loadingToastIdRef.current) {
          toast.dismiss(loadingToastIdRef.current);
          loadingToastIdRef.current = undefined;
        }
        showErrorToast(t('meeting.cannot_join_breakout', 'Không thể chuyển sang phòng thảo luận'));
      }
    },
    [meetingId],
  );

  // Check breakout on mount
  useEffect(() => {
    if (meetingId) {
      handleBreakoutStarted();
    }
  }, [meetingId, handleBreakoutStarted]);

  // Listen to breakout room signals
  useEffect(() => {
    window.addEventListener("breakout-started", handleBreakoutStarted);
    window.addEventListener("breakout-ended", handleBreakoutEnded);

    return () => {
      window.removeEventListener("breakout-started", handleBreakoutStarted);
      window.removeEventListener("breakout-ended", handleBreakoutEnded);
    };
  }, [handleBreakoutStarted, handleBreakoutEnded]);

  // Polling breakout status
  useEffect(() => {
    let interval: NodeJS.Timeout;
    const isInBreakout = joinData?.isBreakoutRoom;

    if (isInBreakout && meetingId) {
      interval = setInterval(async () => {
        try {
          const resp = await apiClient.get(
            `/meetings/${meetingId}/breakout-rooms/my-token`,
          );
          if (!resp.data || !resp.data.token) {
            console.log(
              "[BREAKOUT] Room no longer active (from poll). Returning to main.",
            );
            handleBreakoutEnded();
          }
        } catch (err) {
          console.error("Polling breakout status failed", err);
          handleBreakoutEnded();
        }
      }, 5000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [meetingId, joinData?.token, joinData?.isBreakoutRoom, handleBreakoutEnded]);

  return {
    joinData,
    setJoinData,
    originalJoinData,
    handleBreakoutStarted,
    handleBreakoutEnded,
    handleJoinBreakoutAsHost,
    isInBreakout: !!(joinData?.isBreakoutRoom || joinData?.token.includes("breakout")),
    handleConnected,
  };
};
