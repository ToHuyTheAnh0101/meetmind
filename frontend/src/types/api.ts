export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  picture?: string | null
  profilePictureUrl: string | null
}

export interface AuthVerifyResponse {
  isAuthenticated: boolean
  user: User
}

export type MeetingStatus = 'scheduled' | 'ongoing' | 'completed' | 'canceled' | 'pending_completion';
export type MeetingAccessType = 'public' | 'invite_only';

export enum ParticipantStatus {
  ADMITTED = 'admitted',
  WAITING = 'waiting',
  DENIED = 'denied',
}

export interface Meeting {
  id: string
  title: string
  description?: string | null
  status: MeetingStatus
  startTime: string
  endTime?: string | null
  createdAt?: string
  updatedAt?: string
  organizer?: User
  participants?: Participant[]
  // Advanced configuration
  accessType?: MeetingAccessType
  waitingRoomEnabled?: boolean
  muteOnJoin?: boolean
  inviteeEmails?: string[]
  reminderMinutes?: number
}

export interface Participant {
  id: string
  meetingId: string
  userId: string
  isOrganizer: boolean
  status: ParticipantStatus
  user: User
}

export interface PaginationMeta {
  total: number
  page: number
  limit: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

export interface PaginatedResponse<T> {
  items: T[]
  meta: PaginationMeta
}
