import React from "react";

export interface MeetingDiaryTabProps {
  meetingId: string;
}

export interface MeetLog {
  id: string;
  type: string;
  triggeredByUserId: string;
  triggeredByUser?: {
    id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    picture?: string;
  };
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface LogConfig {
  icon: React.ElementType;
  color: string;
  bgGlow: string;
  labelVi: string;
  labelEn: string;
}
