import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../store';
import { errMsg } from '../api';
import { Alert } from '../components/ui.jsx';

export default function Auth({ mode }) {
  const isLogin = mode === 'login';
  const { login, register } = useAuth();
  const nav = useNavigate();
  const [f, setF] = useState({ name: '', email: '', password: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setErr(''); setBusy(true);
    try {
      if (isLogin) { await login(f.email, f.password); nav('/dashboard'); }
      else { await register(f.name, f.email, f.password); nav('/onboarding'); }
    } catch (x) { setErr(errMsg(x)); } finally { setBusy(false); }
  }

  return (
    <div className="auth">
      <form className="card stack" onSubmit={submit}>
        <Link to="/" className="brand">NextRound<span>AI</span></Link>
        <h2>{isLogin ? 'Welcome back' : 'Create your account'}</h2>
        {!isLogin && <div><label htmlFor="n">Name</label><input id="n" value={f.name} onChange={set('name')} required maxLength={80} autoComplete="name" /></div>}
        <div><label htmlFor="e">Email</label><input id="e" type="email" value={f.email} onChange={set('email')} required autoComplete="email" /></div>
        <div><label htmlFor="p">Password</label><input id="p" type="password" value={f.password} onChange={set('password')} required minLength={isLogin ? 1 : 8} autoComplete={isLogin ? 'current-password' : 'new-password'} />{!isLogin && <small className="muted">At least 8 characters.</small>}</div>
        {isLogin && <p className="auth-forgot"><Link to="/forgot-password">Forgot password?</Link></p>}
        <Alert>{err}</Alert>
        <button className="btn primary" disabled={busy} style={{ width: '100%' }}>{busy ? 'Please wait…' : isLogin ? 'Log in' : 'Create account'}</button>
        <p className="muted" style={{ textAlign: 'center', marginBottom: 0 }}>{isLogin ? <>New here? <Link to="/register">Create an account</Link></> : <>Already have an account? <Link to="/login">Log in</Link></>}</p>
      </form>
    </div>
  );
}
