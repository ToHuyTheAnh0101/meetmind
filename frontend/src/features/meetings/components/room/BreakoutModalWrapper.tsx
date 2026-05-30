import React from "react";
import { useLocalParticipant, useParticipants } from "@livekit/components-react";
import { toast } from "react-hot-toast";
import apiClient from "@/lib/apiClient";
import { showSuccessToast, showErrorToast } from "@/lib/toastUtils";
import BreakoutManagementModal from "./BreakoutManagementModal";

interface BreakoutModalWrapperProps {
  isOpen: boolean;
  onClose: () => void;
  meetingId: string;
  organizerId: string;
}

export const BreakoutModalWrapper: React.FC<BreakoutModalWrapperProps> = ({
  isOpen,
  onClose,
  meetingId,
  organizerId,
}) => {
  const { localParticipant } = useLocalParticipant();
  const remoteParticipants = useParticipants();

  return (
    <BreakoutManagementModal
      isOpen={isOpen}
      onClose={onClose}
      meetingId={meetingId}
      participants={[
        {
          id: localParticipant.identity,
          userId: localParticipant.identity,
          displayName: localParticipant.name || localParticipant.identity,
          metadata: localParticipant.metadata,
          isOrganizer: localParticipant.identity === organizerId,
        },
        ...remoteParticipants.map((p: any) => ({
          id: p.identity,
          userId: p.identity,
          displayName: p.name || p.identity,
          metadata: p.metadata,
          isOrganizer: p.identity === organizerId,
        })),
      ]}
      onStart={async (roomsData) => {
        const startToastId = toast.loading(
          "Đang khởi tạo các phòng thảo luận...",
          {
            style: {
              background: "#111115",
              color: "#fff",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "1rem",
            },
          },
        );
        try {
          // 1. Setup rooms on backend
          await apiClient.post(`/meetings/${meetingId}/breakout-rooms/setup`, {
            rooms: roomsData.map((r) => ({
              name: r.name,
              assignments: r.participants.map((p: any) => ({
                userId: p.userId,
              })),
            })),
          });

          // 2. Start breakout on backend
          await apiClient.post(`/meetings/${meetingId}/breakout-rooms/start`);

          // 3. Dispatch signal to participants
          window.dispatchEvent(
            new CustomEvent("send-breakout-start-signal", {
              detail: roomsData,
            }),
          );

          toast.dismiss(startToastId);
          showSuccessToast("Đã bắt đầu chia phòng họp nhỏ!");
          onClose();
        } catch (err) {
          console.error("Failed to start breakout", err);
          toast.dismiss(startToastId);
          showErrorToast("Không thể khởi động phòng họp nhỏ");
        }
      }}
    />
  );
};

export default BreakoutModalWrapper;
