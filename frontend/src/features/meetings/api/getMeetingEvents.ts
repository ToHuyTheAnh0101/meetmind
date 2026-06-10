import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/apiClient";
import { MeetingEvent } from "../types";

export const useMeetingEvents = (meetingId: string) => {
  return useQuery<MeetingEvent[]>({
    queryKey: ["meeting-events", meetingId],
    queryFn: async () => {
      const res = await apiClient.get(`/meetings/${meetingId}/events`);
      return res.data;
    },
  });
};
