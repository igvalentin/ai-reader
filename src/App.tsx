import { Suspense, lazy } from 'react'
import { Route, Routes } from 'react-router-dom'
import { PageLoader } from './components/atoms/PageLoader'

const HomePage = lazy(() => import('./pages/HomePage'))
const AdminUsersPage = lazy(() => import('./pages/AdminUsersPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))

function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/admin" element={<AdminUsersPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  )
}

export default App
