import { useState, useEffect, useCallback } from "react";
import { toast } from "react-hot-toast";
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
  const [joinData, setJoinData] = useState<JoinResponse | null>(null);
  const [originalJoinData, setOriginalJoinData] = useState<JoinResponse | null>(null);

  // Keep track of the original main room join data
  useEffect(() => {
    if (joinData && !originalJoinData && !joinData.token.includes("breakout")) {
      setOriginalJoinData(joinData);
    }
  }, [joinData, originalJoinData]);

  const handleBreakoutStarted = useCallback(
    async (e?: any) => {
      if (!meetingId) return;
      const isEvent = !!e;
      console.log(
        "[BREAKOUT] Signal received:",
        e?.detail || "Manual/Mount check",
      );

      // If it's a real-time event, check if the current user is assigned first
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

      let loadingToastId: string | undefined;

      if (isEvent) {
        loadingToastId = toast.loading("Đang chuẩn bị phòng thảo luận...", {
          style: {
            background: "#111115",
            color: "#fff",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: "1rem",
          },
        });

        // Wait 1.5 seconds to make sure backend commits are done
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }

      try {
        const resp = await apiClient.get(
          `/meetings/${meetingId}/breakout-rooms/my-token`,
        );
        if (resp.data && resp.data.token) {
          if (isEvent && loadingToastId) {
            toast.loading(`Đang di chuyển sang ${resp.data.roomName}...`, {
              id: loadingToastId,
            });
          } else {
            loadingToastId = toast.loading(`Đang di chuyển sang ${resp.data.roomName}...`, {
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

          setTimeout(() => {
            if (loadingToastId) toast.dismiss(loadingToastId);
            showSuccessToast(`Đã tham gia ${resp.data.roomName}`, "🚪");
          }, 3500);
        } else {
          console.log(
            "[BREAKOUT] No token returned for this user. Staying in current room.",
          );
          if (loadingToastId) toast.dismiss(loadingToastId);
        }
      } catch (err) {
        console.error("Failed to join breakout room", err);
        if (loadingToastId) toast.dismiss(loadingToastId);
        if (isEvent) {
          showErrorToast("Không thể chuyển sang phòng thảo luận");
        }
      }
    },
    [meetingId, userId],
  );

  const handleBreakoutEnded = useCallback(async () => {
    if (!meetingId) return;
    console.log("[BREAKOUT] End signal received.");

    const loadingToastId = toast.loading("Đang di chuyển về phòng chính...", {
      style: {
        background: "#111115",
        color: "#fff",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        borderRadius: "1rem",
      },
    });

    // Notify backend that this user is leaving the breakout room
    try {
      await apiClient.post(`/meetings/${meetingId}/breakout-rooms/leave`);
    } catch (err) {
      console.error("Failed to clear breakout room assignment on backend", err);
    }

    if (originalJoinData) {
      setJoinData(originalJoinData);
      setTimeout(() => {
        toast.dismiss(loadingToastId);
        showSuccessToast("Đã quay lại phòng chính", "🏠");
      }, 3500);
    } else {
      try {
        const res = await apiClient.post(`/meetings/${meetingId}/join`);
        setJoinData((prev: any) =>
          prev
            ? { ...prev, token: res.data.token, isBreakoutRoom: false }
            : res.data,
        );
        setTimeout(() => {
          toast.dismiss(loadingToastId);
          showSuccessToast("Đã quay lại phòng chính", "🏠");
        }, 3500);
      } catch (err) {
        console.error("Failed to return to main room", err);
        toast.dismiss(loadingToastId);
        showErrorToast("Lỗi khi quay lại phòng chính");
      }
    }
  }, [meetingId, originalJoinData]);

  const handleJoinBreakoutAsHost = useCallback(
    async (roomId: string) => {
      if (!meetingId) return;

      const loadingToastId = toast.loading("Đang di chuyển sang phòng thảo luận...", {
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
          toast.loading(`Đang di chuyển sang ${resp.data.roomName}...`, {
            id: loadingToastId,
          });

          setJoinData((prev: any) => ({
            ...prev!,
            token: resp.data.token,
            room: resp.data.roomName,
            isBreakoutRoom: true,
          }));

          setTimeout(() => {
            if (loadingToastId) toast.dismiss(loadingToastId);
            showSuccessToast(`Đã tham gia ${resp.data.roomName}`, "🚪");
          }, 3500);
        } else {
          console.log("[BREAKOUT] No token returned for host.");
          if (loadingToastId) toast.dismiss(loadingToastId);
        }
      } catch (err) {
        console.error("Failed to join breakout room as host", err);
        if (loadingToastId) toast.dismiss(loadingToastId);
        showErrorToast("Không thể chuyển sang phòng thảo luận");
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
  };
};
