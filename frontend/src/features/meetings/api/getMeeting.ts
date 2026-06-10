import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/apiClient";
import { Meeting } from "@/types/api";

export const useMeeting = (meetingId: string) => {
  return useQuery<Meeting>({
    queryKey: ["meeting-status", meetingId],
    queryFn: async () => {
      const res = await apiClient.get(`/meetings/${meetingId}`);
      return res.data;
    },
    refetchInterval: (query) => {
      const data = query.state.data as Meeting | undefined;
      return data?.status === "ongoing" ? 5000 : false;
    },
  });
};
