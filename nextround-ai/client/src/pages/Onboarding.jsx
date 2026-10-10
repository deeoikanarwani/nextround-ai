import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, errMsg } from '../api';
import { useAuth } from '../store';
import { Alert } from '../components/ui.jsx';

const LEVELS = [
  ['student', 'Student', 'Still studying; building projects and skills.'],
  ['fresher', 'Fresher', 'Recent graduate or first job search.'],
  ['experienced', 'Experienced', 'Working professional or changing careers.'],
];

export default function Onboarding() {
  const { user, setUser } = useAuth();
  const nav = useNavigate();
  const [level, setLevel] = useState(user?.level || 'fresher');
  const [roles, setRoles] = useState((user?.targetRoles || []).join(', '));
  const [err, setErr] = useState('');

  async function save(e) {
    e.preventDefault();
    try {
      const targetRoles = roles.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 5);
      const { data } = await api.patch('/auth/me', { level, targetRoles, onboarded: true });
      setUser(data.user);
      nav('/resume');
    } catch (x) { setErr(errMsg(x)); }
  }

  return (
    <div className="auth">
      <form className="card stack" style={{ maxWidth: 520 }} onSubmit={save}>
        <h2>Let's tailor your practice</h2>
        <div className="stack">
          {LEVELS.map(([v, t, d]) => (
            <button type="button" key={v} className={`mode ${level === v ? 'sel' : ''}`} onClick={() => setLevel(v)} style={{ width: '100%' }}><b>{t}</b><small>{d}</small></button>
          ))}
        </div>
        <div><label htmlFor="r">Roles you are targeting</label><input id="r" value={roles} onChange={(e) => setRoles(e.target.value)} placeholder="Backend Developer, Java Developer" /><small className="muted">Comma separated, up to 5.</small></div>
        <Alert>{err}</Alert>
        <button className="btn primary">Continue to your resume</button>
      </form>
    </div>
  );
}
