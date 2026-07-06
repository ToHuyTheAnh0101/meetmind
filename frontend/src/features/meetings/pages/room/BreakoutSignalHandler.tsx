import React, { useCallback } from "react";
import { useDataChannel } from "@livekit/components-react";
import { useCustomEvent, emitCustomEvent, MeetingEvents } from "@/hooks/useCustomEvent";
import { MeetingDataMessageType } from "@/features/meetings/types";

export const BreakoutSignalHandler: React.FC = () => {
  const { send } = useDataChannel();

  const handleStart = useCallback((rooms: any) => {
    const assignments = rooms.flatMap((r: any) =>
      r.participants.map((p: any) => ({
        userId: p.userId,
        roomId: r.id,
        roomName: r.name,
      })),
    );

    const payloadObj = {
      type: MeetingDataMessageType.BREAKOUT_STARTED,
      assignments,
    };

    try {
      send(new TextEncoder().encode(JSON.stringify(payloadObj)), {
        reliable: true,
      });
    } catch (err) {
      console.error("Failed to publish BREAKOUT_STARTED", err);
    }

    // Manually trigger for the sender (Host)
    emitCustomEvent(MeetingEvents.BREAKOUT_STARTED, payloadObj);
  }, [send]);

  const handleEnd = useCallback(() => {
    const payloadObj = { type: MeetingDataMessageType.BREAKOUT_ENDED };
    try {
      send(new TextEncoder().encode(JSON.stringify(payloadObj)), {
        reliable: true,
      });
    } catch (err) {
      console.error("Failed to publish BREAKOUT_ENDED", err);
    }

    // Manually trigger for the sender (Host)
    emitCustomEvent(MeetingEvents.BREAKOUT_ENDED, payloadObj);
  }, [send]);

  useCustomEvent(MeetingEvents.SEND_BREAKOUT_START_SIGNAL, handleStart);
  useCustomEvent(MeetingEvents.SEND_BREAKOUT_END_SIGNAL, handleEnd);

  return null;
};

export default BreakoutSignalHandler;
