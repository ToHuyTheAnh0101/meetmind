const TOKEN_KEY = 'meetmind_token'

export const getToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY)
}

export const setToken = (token: string): void => {
  localStorage.setItem(TOKEN_KEY, token)
}

export const clearToken = (): void => {
  localStorage.removeItem(TOKEN_KEY)
}

export const isTokenExpired = (token: string): boolean => {
  try {
    const payload = token.split('.')[1]
    const decodedPayload = JSON.parse(atob(payload))
    return decodedPayload.exp * 1000 < Date.now()
  } catch (error) {
    return true
  }
}
