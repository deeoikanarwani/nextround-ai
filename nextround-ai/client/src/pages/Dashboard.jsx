import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, errMsg } from '../api';
import { useAuth } from '../store';
import { Alert, Bar, Ring, Spinner, modeLabel, fmtDate } from '../components/ui.jsx';

export default function Dashboard() {
  const { user } = useAuth();
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => { api.get('/dashboard').then((r) => setD(r.data)).catch((e) => setErr(errMsg(e))); }, []);
  if (err) return <Alert>{err}</Alert>;
  if (!d) return <Spinner />;
  const r = d.readiness;

  return (
    <div className="stack">
      <div className="page-head"><h1>Ready for your next round, {user.name.split(' ')[0]}?</h1><p>Your AI career workspace: where you are, and what to do next.</p></div>

      <div className="card next row between">
        <div style={{ flex: 1, minWidth: 240 }}>
          <small className="muted">Your next best action</small>
          <h2>{d.nextAction.title}</h2>
          <p className="muted" style={{ marginBottom: 0 }}>{d.nextAction.body}</p>
        </div>
        <Link className="btn primary" to={d.nextAction.to}>{d.nextAction.cta}</Link>
      </div>

      <div className="grid g2">
        <div className="card">
          <h3>NextRound readiness</h3>
          {r ? (
            <div className="hero-card">
              <Ring value={r.readiness} size={120} label="of 100" />
              <div><p>{r.why}</p>{['technical', 'communication', 'problemSolving', 'confidence', 'roleKnowledge'].map((k) => <Bar key={k} label={{ technical: 'Technical', communication: 'Communication', problemSolving: 'Problem solving', confidence: 'Confidence', roleKnowledge: 'Role knowledge' }[k]} value={r.dimensions[k]} />)}</div>
            </div>
          ) : <p className="muted">Complete your first interview to see your readiness score, what is driving it, and what to practise next.</p>}
        </div>
        <div className="card">
          <h3>Preparation roadmap</h3>
          <div className="road">{d.roadmap.map((s) => <span key={s.label} className={s.status === 'done' ? 'done' : s.status === 'next' ? 'next' : ''}>{s.status === 'done' ? '✓ ' : ''}{s.label}</span>)}</div>
          <div className="list" style={{ marginTop: '1rem' }}>
            <div className="row between"><span>Resume</span>{d.resume ? <span className="chip good">ATS {d.resume.atsScore}</span> : <Link to="/resume">Upload</Link>}</div>
            <div className="row between"><span>Target job</span>{d.job ? <span className="chip">{d.job.title}{d.job.matchScore != null ? ` · ${d.job.matchScore}% match` : ''}</span> : <Link to="/jobs">Add job</Link>}</div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="row between"><h3>Recent interviews</h3><Link to="/reports">All reports</Link></div>
        {d.recent.length ? (
          <div className="list">{d.recent.map((i) => (
            <div key={i.id} className="row between">
              <span><b>{modeLabel(i.mode)}</b> <span className="muted">· {fmtDate(i.createdAt)}</span></span>
              {i.status === 'completed' ? <Link to={`/reports/${i.id}`}>Score {i.overall} · View report</Link> : <Link to={`/interview/${i.id}`}>Resume interview</Link>}
            </div>
          ))}</div>
        ) : <p className="muted">No interviews yet.</p>}
      </div>

      <p className="muted"><small>Today: {d.usage.interviews}/{d.usage.limits.interviewsPerDay} interviews · {d.usage.aiCalls}/{d.usage.limits.aiCallsPerDay} AI calls · AI engine: {d.usage.aiProvider === 'gemini' ? 'Gemini' : 'built-in (add a Gemini key for richer AI)'}</small></p>
    </div>
  );
}
