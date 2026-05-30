import React from "react";
import { useDataChannel } from "@livekit/components-react";

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
        window.dispatchEvent(
          new CustomEvent("refresh-polls", { detail: { meetingId } }),
        );
        if (data.type === "POLL_CREATED") {
          onNotify();
        }
      }
      if (data.type === "QA_UPDATED") {
        window.dispatchEvent(
          new CustomEvent("refresh-qa", { detail: { meetingId } }),
        );
      }
      if (data.type === "MEETING_UPDATED") {
        window.dispatchEvent(
          new CustomEvent("refresh-meeting", { detail: { meetingId } }),
        );
      }
      if (data.type === "BREAKOUT_STARTED") {
        window.dispatchEvent(
          new CustomEvent("breakout-started", { detail: data }),
        );
      }
      if (data.type === "BREAKOUT_ENDED") {
        window.dispatchEvent(
          new CustomEvent("breakout-ended", { detail: data }),
        );
      }
      if (data.type === "RECORDING_STARTED") {
        window.dispatchEvent(
          new CustomEvent("recording-started", { detail: data }),
        );
      }
      if (data.type === "RECORDING_STOPPED") {
        window.dispatchEvent(
          new CustomEvent("recording-stopped", { detail: data }),
        );
      }
    } catch (e) {
      console.error("Failed to parse data message", e);
    }
  });
  return null;
};

export default DataHandler;
