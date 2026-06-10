import { useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/apiClient";
import { Meeting } from "@/types/api";

export const useSaveMeeting = (meetingId?: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<Meeting>) => {
      if (!meetingId) {
        const res = await apiClient.post("/meetings", payload);
        return res.data;
      } else {
        const res = await apiClient.put(`/meetings/${meetingId}`, payload);
        return res.data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      if (meetingId) {
        queryClient.invalidateQueries({ queryKey: ["meeting", meetingId] });
        queryClient.invalidateQueries({ queryKey: ["meeting-status", meetingId] });
      }
    },
  });
};

export const useDeleteMeeting = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (meetingId: string) => {
      const res = await apiClient.delete(`/meetings/${meetingId}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
    },
  });
};
