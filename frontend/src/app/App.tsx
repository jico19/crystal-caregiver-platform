import { Component, lazy, Suspense, type ReactNode } from 'react'
import { Link, Route, Routes, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { api, queryClient } from '../api/client'
import { useSession } from '../features/auth/session'
import { Failure, Loading } from '../components/Forms'

const PublicPage = lazy(() => import('../features/public/PublicPage'))
const JobPage = lazy(() => import('../features/public/JobPage'))
const PortalPage = lazy(() => import('../features/portal/PortalPage'))
const AccountPage = lazy(() => import('../features/auth/AccountPage'))

class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    return this.state.failed ? (
      <main>
        <h1>This page could not load</h1>
        <a href="/">Reload the home page</a>
      </main>
    ) : (
      this.props.children
    )
  }
}

function Header() {
  const session = useSession()
  const navigate = useNavigate()
  const logout = useMutation({
    mutationFn: () => api.post('auth/logout/'),
    onSuccess: () => {
      queryClient.clear()
      queryClient.setQueryData(['session'], null)
      navigate('/login')
    },
  })

  return (
    <>
      <header>
        <a className="skip" href="#main">Skip to content</a>
        <Link className="brand" to="/">
          Crystal Care
          <span>Multi-state home care</span>
        </Link>
        <nav aria-label="Main navigation">
          <Link to="/states/FL">Caregiver opportunities</Link>
          {session.data ? (
            <>
              <Link to="/portal">Your portal</Link>
              <button
                className="secondary"
                disabled={logout.isPending}
                onClick={() => logout.mutate()}
              >
                Sign out
              </button>
            </>
          ) : (
            <Link to="/login">Sign in →</Link>
          )}
        </nav>
      </header>
      <Failure error={logout.error} />
    </>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <Header />
      <div className="demo-banner">
        Demo workflow — pending agency confirmation. Synthetic data only.
      </div>
      <main id="main">
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/" element={<PublicPage />} />
            <Route path="/states/:state" element={<PublicPage />} />
            <Route path="/jobs/:id" element={<JobPage />} />
            <Route path="/login" element={<AccountPage mode="login" />} />
            <Route path="/forgot-password" element={<AccountPage mode="reset" />} />
            <Route path="/reset-password" element={<AccountPage mode="confirm" />} />
            <Route path="/accept-invitation" element={<AccountPage mode="invite" />} />
            <Route path="/portal" element={<PortalPage />} />
            <Route path="/portal/:role" element={<PortalPage />} />
            <Route
              path="*"
              element={
                <section>
                  <h1>Page not found</h1>
                  <Link to="/">Return home</Link>
                </section>
              }
            />
          </Routes>
        </Suspense>
      </main>
      <footer>
        <span>Crystal Care · FL / IN / GA</span>
        <span>Illustrative prototype. No real applications or care records.</span>
      </footer>
    </ErrorBoundary>
  )
}
