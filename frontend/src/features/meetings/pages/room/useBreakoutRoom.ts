import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "react-hot-toast";
import { useTranslation } from "react-i18next";
import apiClient from "@/lib/apiClient";
import { showSuccessToast, showErrorToast } from "@/lib/toastUtils";
import { useCustomEvent, MeetingEvents } from "@/hooks/useCustomEvent";

export interface JoinResponse {
  meetingId: string;
  organizerId: string;
  token: string;
  liveKitUrl: string;
  participants: any[];
  status?: string;
  isBreakoutRoom?: boolean;
  room?: string;
  breakoutRoomId?: string;
}

export const useBreakoutRoom = (meetingId: string | undefined, userId: string | undefined) => {
  const { t } = useTranslation();
  const [joinData, setJoinData] = useState<JoinResponse | null>(null);
  const [originalJoinData, setOriginalJoinData] = useState<JoinResponse | null>(null);
  const isTransitioningRef = useRef(false);
  const setIsTransitioning = (val: boolean) => {
    isTransitioningRef.current = val;
  };

  const transitionTargetRef = useRef("");
  const setTransitionTarget = (val: string) => {
    transitionTargetRef.current = val;
  };

  const originalJoinDataRef = useRef<JoinResponse | null>(null);
  const joinDataRef = useRef<JoinResponse | null>(null);
  useEffect(() => {
    joinDataRef.current = joinData;
  }, [joinData]);

  const loadingToastIdRef = useRef<string | undefined>(undefined);
  const isOrganizer = !!(userId && (joinData?.organizerId === userId || originalJoinData?.organizerId === userId || originalJoinDataRef.current?.organizerId === userId));

  // Keep track of the original main room join data
  useEffect(() => {
    if (joinData && !originalJoinDataRef.current && !joinData.token.includes("breakout") && !joinData.isBreakoutRoom) {
      originalJoinDataRef.current = joinData;
      setOriginalJoinData(joinData);
    }
  }, [joinData]);

  const handleConnected = useCallback(() => {
    if (isTransitioningRef.current) {
      if (loadingToastIdRef.current) {
        toast.dismiss(loadingToastIdRef.current);
        loadingToastIdRef.current = undefined;
      }
      showSuccessToast(
        transitionTargetRef.current 
          ? t('meeting.joined_room', 'Đã tham gia {{room}}', { room: transitionTargetRef.current }) 
          : t('meeting.connection_success', 'Kết nối thành công'),
        transitionTargetRef.current === t('meeting.main_room', 'phòng chính') ? "🏠" : "🚪"
      );
      setIsTransitioning(false);
    }
  }, [t]);

  const handleBreakoutStarted = useCallback(
    async (e?: any) => {
      if (!meetingId) return;
      const isEvent = !!e;
      
      const currentlyInBreakout = !!(joinDataRef.current?.isBreakoutRoom || joinDataRef.current?.token.includes("breakout"));
      if (isEvent && currentlyInBreakout) {
        console.log("[BREAKOUT] Start signal received but user is already in a breakout room. Ignoring.");
        return;
      }

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
            breakoutRoomId: resp.data.roomId,
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
    [meetingId, userId, t]
  );

  const handleBreakoutEnded = useCallback(async () => {
    if (!meetingId) return;

    const currentlyInBreakout = !!(joinDataRef.current?.isBreakoutRoom || joinDataRef.current?.token.includes("breakout"));
    if (!currentlyInBreakout) {
      console.log("[BREAKOUT] End signal received but user is already in the main room. Ignoring.");
      return;
    }

    console.log("[BREAKOUT] End signal received.");
    sessionStorage.removeItem(`host_breakout_room:${meetingId}`);

    loadingToastIdRef.current = toast.loading(t('meeting.moving_to_main', 'Đang di chuyển về phòng chính...'), {
      style: {
        background: "#111115",
        color: "#fff",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        borderRadius: "1rem",
      },
    });

    apiClient.post(`/meetings/${meetingId}/breakout-rooms/leave`).catch((err) => {
      console.error("Failed to clear breakout room assignment on backend", err);
    });

    setIsTransitioning(true);
    setTransitionTarget(t('meeting.main_room', 'phòng chính'));

    if (originalJoinDataRef.current) {
      setJoinData(originalJoinDataRef.current);
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
  }, [meetingId, t]);

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

          sessionStorage.setItem(`host_breakout_room:${meetingId}`, roomId);

          setJoinData((prev: any) => ({
            ...prev!,
            token: resp.data.token,
            room: resp.data.roomName,
            isBreakoutRoom: true,
            breakoutRoomId: resp.data.roomId,
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

  // Check and auto-join active breakout room once user actually enters the meeting room
  useEffect(() => {
    if (meetingId && joinData && !joinData.isBreakoutRoom && !joinData.token.includes("breakout")) {
      if (isOrganizer) {
        const savedRoomId = sessionStorage.getItem(`host_breakout_room:${meetingId}`);
        if (savedRoomId) {
          handleJoinBreakoutAsHost(savedRoomId);
          return;
        }
      }
      handleBreakoutStarted();
    }
  }, [meetingId, joinData?.token, joinData?.isBreakoutRoom, isOrganizer, handleBreakoutStarted, handleJoinBreakoutAsHost]);

  // Listen to breakout room signals
  useCustomEvent(MeetingEvents.BREAKOUT_STARTED, handleBreakoutStarted);
  useCustomEvent(MeetingEvents.BREAKOUT_ENDED, handleBreakoutEnded);

  // Polling breakout status
  useEffect(() => {
    let interval: NodeJS.Timeout;
    const isInBreakout = joinData?.isBreakoutRoom;

    if (isInBreakout && meetingId && !isOrganizer) {
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
  }, [meetingId, joinData?.token, joinData?.isBreakoutRoom, handleBreakoutEnded, isOrganizer]);

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
