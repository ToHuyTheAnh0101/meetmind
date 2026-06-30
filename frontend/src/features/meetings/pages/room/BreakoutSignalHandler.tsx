import React, { useCallback } from "react";
import { useLocalParticipant } from "@livekit/components-react";
import { useCustomEvent, emitCustomEvent, MeetingEvents } from "@/hooks/useCustomEvent";

export const BreakoutSignalHandler: React.FC = () => {
  const { localParticipant } = useLocalParticipant();

  const handleStart = useCallback((rooms: any) => {
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
    emitCustomEvent(MeetingEvents.BREAKOUT_STARTED, JSON.parse(payload));
  }, [localParticipant]);

  const handleEnd = useCallback(() => {
    const payload = JSON.stringify({ type: "BREAKOUT_ENDED" });
    try {
      localParticipant.publishData(new TextEncoder().encode(payload), {
        reliable: true,
      });
    } catch (err) {
      console.error("Failed to publish BREAKOUT_ENDED", err);
    }

    // Manually trigger for the sender (Host)
    emitCustomEvent(MeetingEvents.BREAKOUT_ENDED, JSON.parse(payload));
  }, [localParticipant]);

  useCustomEvent(MeetingEvents.SEND_BREAKOUT_START_SIGNAL, handleStart);
  useCustomEvent(MeetingEvents.SEND_BREAKOUT_END_SIGNAL, handleEnd);

  return null;
};

export default BreakoutSignalHandler;
