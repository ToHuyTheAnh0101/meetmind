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
}
