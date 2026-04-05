export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  profilePictureUrl: string | null
}

export interface AuthVerifyResponse {
  isAuthenticated: boolean
  user: User
}
