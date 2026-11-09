import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { setUnauthorizedHandler } from './lib/api'
import { Layout } from './components/Layout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AssistantPage } from './pages/AssistantPage'
import { EmployeesPage } from './pages/EmployeesPage'
import { SignInPage } from './pages/SignInPage'

function UnauthorizedBridge() {
  const { signOut } = useAuth()
  const navigate = useNavigate()
  useEffect(() => {
    setUnauthorizedHandler(() => {
      signOut()
      navigate('/signin', { replace: true })
    })
    return () => setUnauthorizedHandler(null)
  }, [signOut, navigate])
  return null
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <UnauthorizedBridge />
        <Routes>
          <Route path="/signin" element={<SignInPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/employees" element={<EmployeesPage />} />
              <Route path="/assistant" element={<AssistantPage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/employees" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
