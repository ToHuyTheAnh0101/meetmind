import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/apiClient";
import { Participant, PaginatedResponse, Meeting } from "@/types/api";

// --- Centralized Query Key Factory ---
export const meetingRoomKeys = {
  all: ["meeting-room"] as const,
  participants: (meetingId: string) => [...meetingRoomKeys.all, "participants", meetingId] as const,
  questions: (meetingId: string, isInBreakout = false, breakoutRoomId?: string) => 
    [...meetingRoomKeys.all, "questions", meetingId, { isInBreakout, breakoutRoomId }] as const,
  questionsPrefix: (meetingId: string) => [...meetingRoomKeys.all, "questions", meetingId] as const,
  polls: (meetingId: string, isInBreakout = false, breakoutRoomId?: string) => 
    [...meetingRoomKeys.all, "polls", meetingId, { isInBreakout, breakoutRoomId }] as const,
  pollsPrefix: (meetingId: string) => [...meetingRoomKeys.all, "polls", meetingId] as const,
  details: (meetingId: string) => ["meeting", meetingId] as const, // Keeps compatibility with standard meeting key
};

// --- Q&A Types ---
export interface Answer {
  id: string;
  content: string;
  answeredByUserId: string;
  answeredByUser?: {
    firstName: string;
    lastName: string;
    picture?: string;
  };
  answeredByParticipant?: {
    displayName: string;
  };
  createdAt: string;
}

export interface Question {
  id: string;
  content: string;
  askedByUserId: string;
  askedByUser?: {
    firstName: string;
    lastName: string;
    picture?: string;
  };
  askedByParticipant?: {
    displayName: string;
  };
  answers: Answer[];
  createdAt: string;
  revealAnswers?: boolean;
}

// --- Polls Types ---
export interface Voter {
  id: string;
  name: string;
  avatarUrl?: string;
}

export interface PollOption {
  id: string;
  text: string;
  voterIds: string[];
  voters: Voter[];
}

export interface Poll {
  id: string;
  question: string;
  type: "single" | "multiple";
  options: PollOption[];
  closedAt: string | null;
  createdAt: string;
  createdByUserId: string;
}

// --- Custom Query Hooks ---

/**
 * Fetch participants of a meeting
 */
export const useMeetingParticipants = (meetingId: string) => {
  return useQuery<PaginatedResponse<Participant>>({
    queryKey: meetingRoomKeys.participants(meetingId),
    queryFn: async () => {
      const response = await apiClient.get(`/meetings/${meetingId}/participants`);
      return response.data;
    },
    enabled: !!meetingId,
    refetchInterval: false,
  });
};

/**
 * Fetch Q&A questions of a meeting or breakout room
 */
export const useMeetingQuestions = (
  meetingId: string,
  isInBreakout = false,
  breakoutRoomId?: string,
  options?: { enabled?: boolean }
) => {
  return useQuery<Question[]>({
    queryKey: meetingRoomKeys.questions(meetingId, isInBreakout, breakoutRoomId),
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (isInBreakout) {
        params.breakoutRoomId = breakoutRoomId || "current";
      }
      const response = await apiClient.get(`/meetings/${meetingId}/qa`, { params });
      return response.data;
    },
    enabled: options?.enabled ?? !!meetingId,
  });
};

/**
 * Fetch Polls of a meeting or breakout room
 */
export const useMeetingPolls = (
  meetingId: string,
  isInBreakout = false,
  breakoutRoomId?: string,
  options?: { enabled?: boolean }
) => {
  return useQuery<Poll[]>({
    queryKey: meetingRoomKeys.polls(meetingId, isInBreakout, breakoutRoomId),
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (isInBreakout) {
        params.breakoutRoomId = breakoutRoomId || "current";
      }
      const response = await apiClient.get(`/meetings/${meetingId}/polls`, { params });
      return response.data;
    },
    enabled: options?.enabled ?? !!meetingId,
  });
};

/**
 * Fetch meeting details/settings config
 */
export const useMeetingDetails = (meetingId: string) => {
  return useQuery<Meeting>({
    queryKey: meetingRoomKeys.details(meetingId),
    queryFn: async () => {
      const response = await apiClient.get(`/meetings/${meetingId}`);
      return response.data;
    },
    enabled: !!meetingId,
  });
};
