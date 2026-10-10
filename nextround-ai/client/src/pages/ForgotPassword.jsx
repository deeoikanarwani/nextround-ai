import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, errMsg } from '../api';
import { Alert } from '../components/ui.jsx';

const confirmation = 'If that email exists, we sent a reset link';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.post('/auth/forgot-password', { email });
      setMessage(confirmation);
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
        <h2>Forgot your password?</h2>
        <p className="muted">Enter the email address on your account.</p>
        <div><label htmlFor="forgot-email">Email</label><input id="forgot-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" /></div>
        <Alert>{error}</Alert>
        <Alert kind="ok">{message}</Alert>
        <button className="btn primary" disabled={busy} style={{ width: '100%' }}>{busy ? 'Please wait…' : 'Send reset link'}</button>
        <p className="muted" style={{ textAlign: 'center', marginBottom: 0 }}><Link to="/login">Back to log in</Link></p>
      </form>
    </div>
  );
}
