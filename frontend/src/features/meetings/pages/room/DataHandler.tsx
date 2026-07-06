import React from "react";
import { useDataChannel } from "@livekit/components-react";
import { emitCustomEvent, MeetingEvents } from "@/hooks/useCustomEvent";
import { MeetingDataMessageType } from "@/features/meetings/types";

interface DataHandlerProps {
  meetingId: string;
}

export const DataHandler: React.FC<DataHandlerProps> = ({
  meetingId,
}) => {
  useDataChannel((msg) => {
    try {
      const data = JSON.parse(
        msg.payload instanceof Uint8Array
          ? new TextDecoder().decode(msg.payload)
          : (msg.payload as string),
      );
      if (
        data.type === MeetingDataMessageType.POLL_CREATED ||
        data.type === MeetingDataMessageType.POLL_UPDATED
      ) {
        emitCustomEvent(MeetingEvents.REFRESH_POLLS, { meetingId });
      }
      if (data.type === MeetingDataMessageType.QA_UPDATED) {
        emitCustomEvent(MeetingEvents.REFRESH_QA, { meetingId });
      }
      if (
        data.type === MeetingDataMessageType.MEETING_UPDATED ||
        data.type === MeetingDataMessageType.PERMISSIONS_UPDATED
      ) {
        emitCustomEvent(MeetingEvents.REFRESH_MEETING, { meetingId });
      }
      if (data.type === MeetingDataMessageType.BREAKOUT_STARTED) {
        emitCustomEvent(MeetingEvents.BREAKOUT_STARTED, data);
      }
      if (data.type === MeetingDataMessageType.BREAKOUT_ENDED) {
        emitCustomEvent(MeetingEvents.BREAKOUT_ENDED, data);
      }
      if (data.type === MeetingDataMessageType.RECORDING_STARTED) {
        emitCustomEvent(MeetingEvents.RECORDING_STARTED, data);
      }
      if (data.type === MeetingDataMessageType.RECORDING_STOPPED) {
        emitCustomEvent(MeetingEvents.RECORDING_STOPPED, data);
      }
    } catch (e) {
      console.error("Failed to parse data message", e);
    }
  });
  return null;
};

export default DataHandler;
