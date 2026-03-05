import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './contexts/AuthContext'
import { Layout } from './components/Layout'
import { ProtectedRoute } from './components/ProtectedRoute'
import Overview from './pages/Overview'
import Instances from './pages/Instances'
import InstanceDetail from './pages/InstanceDetail'
import Settings from './pages/Settings'
import Billing from './pages/Billing'
import Docs from './pages/Docs'
import Login from './pages/Login'
import Register from './pages/Register'
import './index.css'

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
})

// Create router with protected routes
const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/register',
    element: <Register />,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Overview />,
      },
      {
        path: 'instances',
        element: <Instances />,
      },
      {
        path: 'instances/:id',
        element: <InstanceDetail />,
      },
      {
        path: 'settings',
        element: <Settings />,
      },
      {
        path: 'billing',
        element: <Billing />,
      },
      {
        path: 'docs',
        element: <Docs />,
      },
    ],
  },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </AuthProvider>
  </StrictMode>
)