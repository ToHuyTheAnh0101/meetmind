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

export type MeetingStatus = 'scheduled' | 'ongoing' | 'completed' | 'cancelled'

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
}

export interface Participant {
  id: string
  meetingId: string
  userId: string
  isOrganizer: boolean
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
