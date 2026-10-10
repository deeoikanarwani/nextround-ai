import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../store';
import { api, errMsg } from '../api';

const links = [
  ['/dashboard', 'Dashboard'], ['/resume', 'Resume'], ['/jobs', 'Jobs'], ['/interview/new', 'Interview'], ['/reports', 'Reports'], ['/analytics', 'Analytics'], ['/settings', 'Settings'],
];

export default function Layout() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [cooldown, setCooldown] = useState(0);
  const [resendError, setResendError] = useState('');
  const [resendMessage, setResendMessage] = useState('');

  useEffect(() => {
    if (!cooldown) return undefined;
    const timer = window.setTimeout(() => setCooldown((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  async function resendVerification() {
    setCooldown(60);
    setResendError('');
    setResendMessage('');
    try {
      const { data } = await api.post('/auth/resend-verification');
      setResendMessage(data.message || 'Verification email sent.');
    } catch (error) {
      setResendError(errMsg(error));
    }
  }

  return (
    <div className="app">
      <header className="topbar">
        <NavLink to="/dashboard" className="brand">NextRound<span>AI</span></NavLink>
        <nav>{links.map(([to, label]) => <NavLink key={to} to={to} end={to === '/interview/new'} className={({ isActive }) => (isActive ? 'active' : '')}>{label}</NavLink>)}</nav>
        <div className="who">
          <span>{user?.name}</span>
          <button className="btn ghost sm" onClick={async () => { await logout(); nav('/'); }}>Log out</button>
        </div>
      </header>
      {user?.emailVerified === false && <div className="verify-banner" role="status">
        <span>Please verify your email to start interviews</span>
        <button className="btn ghost sm" onClick={resendVerification} disabled={cooldown > 0}>{cooldown ? `Resend in ${cooldown}s` : 'Resend email'}</button>
        {resendMessage && <span className="verify-banner-message">{resendMessage}</span>}
        {resendError && <span className="verify-banner-error">{resendError}</span>}
      </div>}
      <main className="page"><Outlet /></main>
    </div>
  );
}
