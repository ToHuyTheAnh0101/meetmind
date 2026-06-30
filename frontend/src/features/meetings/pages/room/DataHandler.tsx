import React from "react";
import { useDataChannel } from "@livekit/components-react";
import { emitCustomEvent, MeetingEvents } from "@/hooks/useCustomEvent";

interface DataHandlerProps {
  meetingId: string;
  onNotify: () => void;
}

export const DataHandler: React.FC<DataHandlerProps> = ({
  meetingId,
  onNotify,
}) => {
  useDataChannel((msg) => {
    try {
      const data = JSON.parse(
        msg.payload instanceof Uint8Array
          ? new TextDecoder().decode(msg.payload)
          : (msg.payload as string),
      );
      if (data.type === "POLL_CREATED" || data.type === "POLL_UPDATED") {
        emitCustomEvent(MeetingEvents.REFRESH_POLLS, { meetingId });
        if (data.type === "POLL_CREATED") {
          onNotify();
        }
      }
      if (data.type === "QA_UPDATED") {
        emitCustomEvent(MeetingEvents.REFRESH_QA, { meetingId });
      }
      if (data.type === "MEETING_UPDATED" || data.type === "PERMISSIONS_UPDATED") {
        emitCustomEvent(MeetingEvents.REFRESH_MEETING, { meetingId });
      }
      if (data.type === "BREAKOUT_STARTED") {
        emitCustomEvent(MeetingEvents.BREAKOUT_STARTED, data);
      }
      if (data.type === "BREAKOUT_ENDED") {
        emitCustomEvent(MeetingEvents.BREAKOUT_ENDED, data);
      }
      if (data.type === "RECORDING_STARTED") {
        emitCustomEvent(MeetingEvents.RECORDING_STARTED, data);
      }
      if (data.type === "RECORDING_STOPPED") {
        emitCustomEvent(MeetingEvents.RECORDING_STOPPED, data);
      }
    } catch (e) {
      console.error("Failed to parse data message", e);
    }
  });
  return null;
};

export default DataHandler;
