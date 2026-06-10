import React, { useEffect } from "react";
import { useLocalParticipant } from "@livekit/components-react";

export const BreakoutSignalHandler: React.FC = () => {
  const { localParticipant } = useLocalParticipant();

  useEffect(() => {
    const handleStart = (e: any) => {
      const rooms = e.detail;
      const assignments = rooms.flatMap((r: any) =>
        r.participants.map((p: any) => ({
          userId: p.userId,
          roomId: r.id,
          roomName: r.name,
        })),
      );

      const payload = JSON.stringify({
        type: "BREAKOUT_STARTED",
        assignments,
      });

      try {
        localParticipant.publishData(new TextEncoder().encode(payload), {
          reliable: true,
        });
      } catch (err) {
        console.error("Failed to publish BREAKOUT_STARTED", err);
      }

      // Manually trigger for the sender (Host)
      window.dispatchEvent(
        new CustomEvent("breakout-started", { detail: JSON.parse(payload) }),
      );
    };

    const handleEnd = () => {
      const payload = JSON.stringify({ type: "BREAKOUT_ENDED" });
      try {
        localParticipant.publishData(new TextEncoder().encode(payload), {
          reliable: true,
        });
      } catch (err) {
        console.error("Failed to publish BREAKOUT_ENDED", err);
      }

      // Manually trigger for the sender (Host)
      window.dispatchEvent(
        new CustomEvent("breakout-ended", { detail: JSON.parse(payload) }),
      );
    };

    window.addEventListener("send-breakout-start-signal", handleStart);
    window.addEventListener("send-breakout-end-signal", handleEnd);
    return () => {
      window.removeEventListener("send-breakout-start-signal", handleStart);
      window.removeEventListener("send-breakout-end-signal", handleEnd);
    };
  }, [localParticipant]);

  return null;
};

export default BreakoutSignalHandler;
