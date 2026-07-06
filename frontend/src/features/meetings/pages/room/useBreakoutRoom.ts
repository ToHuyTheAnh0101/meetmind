import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "react-hot-toast";
import { useTranslation } from "react-i18next";
import apiClient from "@/lib/apiClient";
import { showSuccessToast, showErrorToast } from "@/lib/toastUtils";
import { useCustomEvent, MeetingEvents } from "@/hooks/useCustomEvent";
import { Participant } from "@/types/api";
import { checkIsOrganizer } from "@/lib/permissions";

export interface JoinResponse {
  meetingId: string;
  organizerId: string;
  token: string;
  liveKitUrl: string;
  participants: Participant[];
  status?: string;
  isBreakoutRoom?: boolean;
  room?: string;
  breakoutRoomId?: string;
}

const DARK_TOAST_STYLE = {
  style: {
    background: "#111115",
    color: "#fff",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    borderRadius: "1rem",
  },
};

export const useBreakoutRoom = (meetingId: string | undefined, userId: string | undefined) => {
  const { t } = useTranslation();
  const [joinData, setJoinData] = useState<JoinResponse | null>(null);
  const [originalJoinData, setOriginalJoinData] = useState<JoinResponse | null>(null);

  const isTransitioningRef = useRef(false);
  const transitionTargetRef = useRef("");
  const originalJoinDataRef = useRef<JoinResponse | null>(null);
  const joinDataRef = useRef<JoinResponse | null>(null);
  const loadingToastIdRef = useRef<string | undefined>(undefined);

  const isOrganizer =
    checkIsOrganizer(userId, joinData?.organizerId) ||
    checkIsOrganizer(userId, originalJoinData?.organizerId) ||
    checkIsOrganizer(userId, originalJoinDataRef.current?.organizerId);

  useEffect(() => {
    joinDataRef.current = joinData;
  }, [joinData]);

  // Keep track of the original main room join data
  useEffect(() => {
    if (joinData && !originalJoinDataRef.current && !joinData.token.includes("breakout") && !joinData.isBreakoutRoom) {
      originalJoinDataRef.current = joinData;
      setOriginalJoinData(joinData);
    }
  }, [joinData]);

  const showLoadingToast = useCallback((message: string) => {
    loadingToastIdRef.current = toast.loading(message, DARK_TOAST_STYLE);
  }, []);

  const dismissLoadingToast = useCallback(() => {
    if (loadingToastIdRef.current) {
      toast.dismiss(loadingToastIdRef.current);
      loadingToastIdRef.current = undefined;
    }
  }, []);

  const handleConnected = useCallback(() => {
    if (isTransitioningRef.current) {
      dismissLoadingToast();
      showSuccessToast(
        transitionTargetRef.current
          ? t('meeting.joined_room', 'Đã tham gia {{room}}', { room: transitionTargetRef.current })
          : t('meeting.connection_success', 'Kết nối thành công'),
        transitionTargetRef.current === t('meeting.main_room', 'phòng chính') ? "🏠" : "🚪"
      );
      isTransitioningRef.current = false;
    }
  }, [t, dismissLoadingToast]);

  const handleBreakoutStarted = useCallback(
    async (e?: any) => {
      if (!meetingId) return;
      const isEvent = !!e;

      const currentlyInBreakout = !!(joinDataRef.current?.isBreakoutRoom || joinDataRef.current?.token.includes("breakout"));
      if (isEvent && currentlyInBreakout) return;

      if (isEvent && e.detail?.assignments) {
        const assignments = e.detail.assignments;
        const isAssigned = assignments.some(
          (as: any) => String(as.userId) === String(userId),
        );
        if (!isAssigned) return;
      }

      if (isEvent) {
        showLoadingToast(t('meeting.preparing_breakout', 'Đang chuẩn bị phòng thảo luận...'));
      }

      try {
        const resp = await apiClient.get(
          `/meetings/${meetingId}/breakout-rooms/my-token`,
        );
        if (resp.data && resp.data.token) {
          isTransitioningRef.current = true;
          transitionTargetRef.current = resp.data.roomName;

          const movingMsg = t('meeting.moving_to_room', 'Đang di chuyển sang {{room}}...', { room: resp.data.roomName });
          if (loadingToastIdRef.current) {
            toast.loading(movingMsg, { id: loadingToastIdRef.current });
          } else {
            showLoadingToast(movingMsg);
          }

          setJoinData((prev: any) => ({
            ...prev!,
            token: resp.data.token,
            room: resp.data.roomName,
            isBreakoutRoom: true,
            breakoutRoomId: resp.data.roomId,
          }));
        } else {
          dismissLoadingToast();
        }
      } catch (err) {
        console.error("Failed to join breakout room", err);
        dismissLoadingToast();
        if (isEvent) {
          showErrorToast(t('meeting.cannot_join_breakout', 'Không thể chuyển sang phòng thảo luận'));
        }
      }
    },
    [meetingId, userId, t, showLoadingToast, dismissLoadingToast]
  );

  const handleBreakoutEnded = useCallback(async () => {
    if (!meetingId) return;

    const currentlyInBreakout = !!(joinDataRef.current?.isBreakoutRoom || joinDataRef.current?.token.includes("breakout"));
    if (!currentlyInBreakout) return;

    sessionStorage.removeItem(`host_breakout_room:${meetingId}`);
    showLoadingToast(t('meeting.moving_to_main', 'Đang di chuyển về phòng chính...'));

    apiClient.post(`/meetings/${meetingId}/breakout-rooms/leave`).catch((err) => {
      console.error("Failed to clear breakout room assignment on backend", err);
    });

    isTransitioningRef.current = true;
    transitionTargetRef.current = t('meeting.main_room', 'phòng chính');

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
        dismissLoadingToast();
        isTransitioningRef.current = false;
        showErrorToast(t('meeting.return_to_main_error', 'Lỗi khi quay lại phòng chính'));
      }
    }
  }, [meetingId, t, showLoadingToast, dismissLoadingToast]);

  const handleJoinBreakoutAsHost = useCallback(
    async (roomId: string) => {
      if (!meetingId) return;

      showLoadingToast(t('meeting.preparing_breakout', 'Đang chuẩn bị phòng thảo luận...'));

      try {
        const resp = await apiClient.get(
          `/meetings/${meetingId}/breakout-rooms/${roomId}/token-host`,
        );
        if (resp.data && resp.data.token) {
          isTransitioningRef.current = true;
          transitionTargetRef.current = resp.data.roomName;

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
          dismissLoadingToast();
        }
      } catch (err) {
        console.error("Failed to join breakout room as host", err);
        dismissLoadingToast();
        showErrorToast(t('meeting.cannot_join_breakout', 'Không thể chuyển sang phòng thảo luận'));
      }
    },
    [meetingId, t, showLoadingToast, dismissLoadingToast],
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
