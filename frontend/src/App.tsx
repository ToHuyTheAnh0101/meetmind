import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Auth context
import { AuthProvider } from './features/auth/AuthContext'
import ProtectedRoute from './features/auth/ProtectedRoute'

// Placeholder components
import LoginPage from './features/auth/LoginPage.tsx'
import AuthCallbackPage from './features/auth/AuthCallbackPage.tsx'
import DashboardPage from './features/dashboard/DashboardPage.tsx'
import MeetingsPage from './features/meetings/MeetingsPage.tsx'
import MeetingRoomPage from './features/meetings/MeetingRoomPage.tsx'
import TemplatesPage from './features/templates/TemplatesPage.tsx'
import ProfilePage from './features/profile/ProfilePage.tsx'
import AppShell from './layouts/AppShell.tsx'

// Create query client
const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/auth/callback" element={<AuthCallbackPage />} />
            
            {/* Full-screen Meeting Room */}
            <Route
              path="/meetings/:id"
              element={
                <ProtectedRoute>
                  <MeetingRoomPage />
                </ProtectedRoute>
              }
            />

            <Route
              element={
                <ProtectedRoute>
                  <AppShell />
                </ProtectedRoute>
              }
            >
              <Route index element={<DashboardPage />} />
              <Route path="meetings" element={<MeetingsPage />} />
              <Route path="templates" element={<TemplatesPage />} />
              <Route path="profile" element={<ProfilePage />} />
            </Route>
            <Route
              path="*"
              element={<Navigate to="/" replace />}
            />
          </Routes>
        </AuthProvider>
      </Router>
    </QueryClientProvider>
  )
}

export default App
