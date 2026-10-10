import { useEffect, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './store';
import Layout from './components/Layout.jsx';
import { Spinner } from './components/ui.jsx';

const Landing = lazy(() => import('./pages/Landing.jsx'));
const Auth = lazy(() => import('./pages/Auth.jsx'));
const VerifyEmail = lazy(() => import('./pages/VerifyEmail.jsx'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword.jsx'));
const ResetPassword = lazy(() => import('./pages/ResetPassword.jsx'));
const Onboarding = lazy(() => import('./pages/Onboarding.jsx'));
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const Resume = lazy(() => import('./pages/Resume.jsx'));
const Jobs = lazy(() => import('./pages/Jobs.jsx'));
const InterviewSetup = lazy(() => import('./pages/InterviewSetup.jsx'));
const InterviewLive = lazy(() => import('./pages/InterviewLive.jsx'));
const Reports = lazy(() => import('./pages/Reports.jsx'));
const Report = lazy(() => import('./pages/Report.jsx'));
const Analytics = lazy(() => import('./pages/Analytics.jsx'));
const Settings = lazy(() => import('./pages/Settings.jsx'));

function Private() {
  const { user, ready } = useAuth();
  if (!ready) return <Spinner full />;
  return user ? <Outlet /> : <Navigate to="/login" replace />;
}

export default function App() {
  const init = useAuth((s) => s.init);
  useEffect(() => { init(); }, [init]);
  return (
    <Suspense fallback={<Spinner full />}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Auth mode="login" />} />
        <Route path="/register" element={<Auth mode="register" />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route element={<Private />}>
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/interview/:id" element={<InterviewLive />} />
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/resume" element={<Resume />} />
            <Route path="/jobs" element={<Jobs />} />
            <Route path="/interview/new" element={<InterviewSetup />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/reports/:id" element={<Report />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
