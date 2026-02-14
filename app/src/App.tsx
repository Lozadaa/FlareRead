import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import { AmbientSoundsProvider } from '@/contexts/AmbientSoundsContext'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { AppShell } from '@/components/layout'
import { GlobalSoundscapePlayer } from '@/components/soundscape/GlobalSoundscapePlayer'
import { ThemeApplicator } from '@/components/ThemeApplicator'
import { LoginPage } from '@/pages/LoginPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { LibraryPage } from '@/pages/LibraryPage'
import { SessionsPage } from '@/pages/SessionsPage'
import { NotesPage } from '@/pages/NotesPage'
import { GoalsPage } from '@/pages/GoalsPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { ReaderPage } from '@/pages/ReaderPage'

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AmbientSoundsProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            {/* Reader is full-screen, outside AppShell */}
            <Route
              path="read/:bookId"
              element={
                <ProtectedRoute>
                  <ReaderPage />
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
              <Route path="library" element={<LibraryPage />} />
              <Route path="sessions" element={<SessionsPage />} />
              <Route path="notes" element={<NotesPage />} />
              <Route path="goals" element={<GoalsPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
          </Routes>
          <GlobalSoundscapePlayer />
          <ThemeApplicator />
        </AmbientSoundsProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
