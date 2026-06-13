import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/apiClient";
import { MeetLog } from "../types";

export const useMeetLogs = (meetingId: string) => {
  return useQuery<MeetLog[]>({
    queryKey: ["meet-logs", meetingId],
    queryFn: async () => {
      const res = await apiClient.get(`/meetings/${meetingId}/logs`);
      return res.data;
    },
  });
};
