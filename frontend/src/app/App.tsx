import { lazy, Suspense } from "react";
import { Link, Route, Routes } from "react-router-dom";
import { Loading } from "../components/Loading";
import { ErrorBoundary } from "./ErrorBoundary";
import { Header } from "./Header";

const PublicPage = lazy(() => import("../features/public/PublicPage"));
const JobPage = lazy(() => import("../features/public/JobPage"));
const PortalPage = lazy(() => import("../features/portal/PortalPage"));
const AccountPage = lazy(() => import("../features/auth/AccountPage"));

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
  );
}
