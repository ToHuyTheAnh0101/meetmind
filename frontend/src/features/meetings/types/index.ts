import React from "react";
import { MeetingAccessType } from "@/types/api";

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

export enum MeetingModalType {
  POLL = "poll",
  QUESTION = "question",
  BREAKOUT = "breakout",
  CONFIRM_END = "confirmEnd",
}

export enum MeetingSidebarTab {
  CHAT = "chat",
  ROSTER = "roster",
  LOBBY = "lobby",
  SETTINGS = "settings",
  POLLS = "polls",
  QA = "qa",
  PERMISSIONS = "permissions",
  BREAKOUT = "breakout",
  ATTACHMENTS = "attachments",
}

export interface RoomMeetingDetails {
  title: string;
  description: string;
  participantCount: number;
  allowDisplayNameEdit: boolean;
  isQaEnabled: boolean;
  organizerId: string;
  status?: string;
  startTime?: string;
  muteOnJoin?: boolean;
}

export interface MeetingFormData {
  title: string;
  description: string;
  startTime: string;
  accessType: MeetingAccessType;
  waitingRoomEnabled: boolean;
  muteOnJoin: boolean;
  allowDisplayNameEdit: boolean;
  inviteeEmails: string[];
  reminderMinutes: number;
  password: string;
  templateId: string;
}

export enum MeetingDataMessageType {
  POLL_CREATED = "POLL_CREATED",
  POLL_UPDATED = "POLL_UPDATED",
  QA_UPDATED = "QA_UPDATED",
  MEETING_UPDATED = "MEETING_UPDATED",
  PERMISSIONS_UPDATED = "PERMISSIONS_UPDATED",
  BREAKOUT_STARTED = "BREAKOUT_STARTED",
  BREAKOUT_ENDED = "BREAKOUT_ENDED",
  RECORDING_STARTED = "RECORDING_STARTED",
  RECORDING_STOPPED = "RECORDING_STOPPED",
}

export enum SaveStatus {
  IDLE = "idle",
  SAVING = "saving",
  SAVED = "saved",
  ERROR = "error",
}
