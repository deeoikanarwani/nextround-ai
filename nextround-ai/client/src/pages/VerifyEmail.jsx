import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, errMsg } from '../api';
import { useAuth } from '../store';
import { Alert } from '../components/ui.jsx';

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const user = useAuth((state) => state.user);
  const refreshUser = useAuth((state) => state.refreshUser);
  const canResend = (user && !user.emailVerified) || (!user && Boolean(localStorage.getItem('nr_token')));
  const [status, setStatus] = useState('checking');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [resending, setResending] = useState(false);
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;
    if (!token) {
      setStatus('error');
      setError('This verification link is missing its token.');
      return;
    }
    api.post('/auth/verify-email', { token })
      .then(async ({ data }) => {
        setStatus('success');
        setMessage(data.message || 'Your email has been verified.');
        if (localStorage.getItem('nr_token')) {
          try { await refreshUser(); } catch { /* the verification result remains valid */ }
        }
      })
      .catch((requestError) => {
        setStatus('error');
        setError(errMsg(requestError));
      });
  }, [refreshUser, token]);

  async function resend() {
    setResending(true);
    setError('');
    try {
      const { data } = await api.post('/auth/resend-verification');
      setMessage(data.message || 'Verification email sent.');
    } catch (requestError) {
      setError(errMsg(requestError));
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="auth">
      <div className="card stack">
        <Link to="/" className="brand">NextRound<span>AI</span></Link>
        <h2>{status === 'checking' ? 'Verifying your email…' : status === 'success' ? 'Email verified' : 'Email verification'}</h2>
        {status === 'checking' && <p className="muted">Please wait while we verify your address.</p>}
        <Alert>{error}</Alert>
        <Alert kind="ok">{message}</Alert>
        {status === 'error' && canResend && <button className="btn primary" onClick={resend} disabled={resending}>{resending ? 'Sending…' : 'Resend verification email'}</button>}
        <Link className="btn ghost" to={user ? '/dashboard' : '/login'}>Continue to {user ? 'dashboard' : 'login'}</Link>
      </div>
    </div>
  );
}
