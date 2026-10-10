import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api, errMsg } from '../api';
import { Alert } from '../components/ui.jsx';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const token = params.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError('');
    setMessage('');
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      const { data } = await api.post('/auth/reset-password', { token, password });
      setMessage(data.message || 'Your password was reset. Redirecting to login…');
      window.setTimeout(() => nav('/login', { replace: true }), 1500);
    } catch (requestError) {
      setError(errMsg(requestError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth">
      <form className="card stack" onSubmit={submit}>
        <Link to="/" className="brand">NextRound<span>AI</span></Link>
        <h2>Choose a new password</h2>
        {!token && <Alert>A reset token is missing. Request a new reset link.</Alert>}
        <div><label htmlFor="new-password">New password</label><input id="new-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} maxLength={100} autoComplete="new-password" /></div>
        <div><label htmlFor="confirm-password">Confirm new password</label><input id="confirm-password" type="password" value={confirm} onChange={(event) => setConfirm(event.target.value)} required minLength={8} maxLength={100} autoComplete="new-password" /></div>
        <Alert>{error}</Alert>
        <Alert kind="ok">{message}</Alert>
        <button className="btn primary" disabled={busy || !token} style={{ width: '100%' }}>{busy ? 'Please wait…' : 'Reset password'}</button>
        <p className="muted" style={{ textAlign: 'center', marginBottom: 0 }}><Link to="/login">Back to log in</Link></p>
      </form>
    </div>
  );
}
