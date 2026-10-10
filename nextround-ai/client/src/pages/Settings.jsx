import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, errMsg } from '../api';
import { useAuth } from '../store';
import { Alert } from '../components/ui.jsx';

export default function Settings() {
  const { user, setUser, logout } = useAuth();
  const nav = useNavigate();
  const [name, setName] = useState(user.name);
  const [level, setLevel] = useState(user.level);
  const [roles, setRoles] = useState((user.targetRoles || []).join(', '));
  const [pw, setPw] = useState('');
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [msg, setMsg] = useState(''); const [err, setErr] = useState('');
  const [passwordMsg, setPasswordMsg] = useState(''); const [passwordErr, setPasswordErr] = useState('');

  async function save(e) {
    e.preventDefault(); setErr(''); setMsg('');
    try { const { data } = await api.patch('/auth/me', { name, level, targetRoles: roles.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 5) }); setUser(data.user); setMsg('Saved.'); } catch (x) { setErr(errMsg(x)); }
  }
  async function changePassword(event) {
    event.preventDefault(); setPasswordErr(''); setPasswordMsg('');
    if (passwords.newPassword !== passwords.confirmPassword) { setPasswordErr('New passwords do not match.'); return; }
    try {
      const { data } = await api.post('/auth/change-password', {
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
      });
      localStorage.setItem('nr_token', data.token);
      setUser(data.user);
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPasswordMsg('Password changed.');
    } catch (x) { setPasswordErr(errMsg(x)); }
  }
  async function wipe() {
    if (!window.confirm('Delete all your resumes, jobs and interviews? This cannot be undone.')) return;
    try { await api.delete('/auth/me/data'); setMsg('Your data was deleted.'); } catch (x) { setErr(errMsg(x)); }
  }
  async function close() {
    if (!window.confirm('Permanently delete your account and all data?')) return;
    try { await api.delete('/auth/me', { data: { password: pw } }); await logout(); nav('/'); } catch (x) { setErr(errMsg(x)); }
  }

  return (
    <div className="stack" style={{ maxWidth: 560 }}>
      <div className="page-head"><h1>Settings</h1></div>
      <form className="card stack" onSubmit={save}>
        <div><label htmlFor="n">Name</label><input id="n" value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} /></div>
        <div><label htmlFor="l">Experience level</label><select id="l" value={level} onChange={(e) => setLevel(e.target.value)}><option value="student">Student</option><option value="fresher">Fresher</option><option value="experienced">Experienced</option></select></div>
        <div><label htmlFor="r">Target roles</label><input id="r" value={roles} onChange={(e) => setRoles(e.target.value)} /></div>
        <Alert kind="ok">{msg}</Alert><Alert>{err}</Alert>
        <div><button className="btn primary">Save changes</button></div>
      </form>
      <form className="card stack" onSubmit={changePassword}>
        <h3>Change password</h3>
        <div><label htmlFor="current-password">Current password</label><input id="current-password" type="password" value={passwords.currentPassword} onChange={(event) => setPasswords({ ...passwords, currentPassword: event.target.value })} required autoComplete="current-password" /></div>
        <div><label htmlFor="new-password">New password</label><input id="new-password" type="password" value={passwords.newPassword} onChange={(event) => setPasswords({ ...passwords, newPassword: event.target.value })} required minLength={8} maxLength={100} autoComplete="new-password" /></div>
        <div><label htmlFor="confirm-new-password">Confirm new password</label><input id="confirm-new-password" type="password" value={passwords.confirmPassword} onChange={(event) => setPasswords({ ...passwords, confirmPassword: event.target.value })} required minLength={8} maxLength={100} autoComplete="new-password" /></div>
        <Alert kind="ok">{passwordMsg}</Alert><Alert>{passwordErr}</Alert>
        <div><button className="btn primary">Change password</button></div>
      </form>
      <div className="card stack"><h3>Privacy</h3><p className="muted">Your resumes, jobs and interviews are private to your account.</p><div><button className="btn danger" onClick={wipe}>Delete all my data</button></div></div>
      <div className="card stack"><h3>Delete account</h3><div><label htmlFor="pw">Confirm with your password</label><input id="pw" type="password" value={pw} onChange={(e) => setPw(e.target.value)} /></div><div><button className="btn danger" disabled={!pw} onClick={close}>Delete my account</button></div></div>
    </div>
  );
}
