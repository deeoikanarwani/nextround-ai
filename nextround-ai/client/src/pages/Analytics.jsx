import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, errMsg } from '../api';
import { Alert, Bar, Empty, LineChart, Spinner, fmtDate, modeLabel } from '../components/ui.jsx';

export default function Analytics() {
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => { api.get('/analytics').then((r) => setD(r.data)).catch((e) => setErr(errMsg(e))); }, []);
  if (err) return <Alert>{err}</Alert>;
  if (!d) return <Spinner />;
  if (!d.count) return <Empty title="No data yet" body="Finish an interview and your progress will show up here." to="/interview/new" cta="Start an interview" />;
  const sign = (n) => (n > 0 ? `+${n}` : n);

  return (
    <div className="stack">
      <div className="page-head"><h1>Progress</h1><p>{d.overallChange == null ? 'Take one more interview to see your trend.' : d.overallChange >= 0 ? `Your overall score changed by ${sign(d.overallChange)} points since your first interview.` : `Your overall score is ${Math.abs(d.overallChange)} points below your first interview. Check the weak areas below.`}</p></div>
      <div className="card"><h3>Overall score by interview</h3><LineChart points={d.trend.map((t) => ({ value: t.overall, label: fmtDate(t.date) }))} /></div>
      <div className="grid g2">
        <div className="card"><h3>Skill averages</h3>{d.dimensions.map((x) => <Bar key={x.key} label={x.label} value={x.average} note={x.change == null ? null : `${sign(x.change)} vs. early interviews`} />)}</div>
        <div className="stack">
          <div className="card"><h3>Strongest</h3>{d.strengths.map((s) => <p key={s.key} style={{ marginBottom: '.3rem' }}>✓ {s.label} ({s.average})</p>)}</div>
          <div className="card"><h3>Practise next</h3>{d.weaknesses.map((w) => <div key={w.key} className="row between" style={{ marginBottom: '.4rem' }}><span>⚠ {w.label} ({w.average})</span><Link className="btn sm primary" to={`/interview/new?mode=targeted&focus=${w.key}`}>Practice</Link></div>)}</div>
        </div>
      </div>
      <div className="card"><h3>History</h3><div className="list">{[...d.trend].reverse().slice(0, 15).map((t) => <div key={t.id} className="row between"><span>{modeLabel(t.mode)} <span className="muted">· {fmtDate(t.date)}</span></span><Link to={`/reports/${t.id}`}>{t.overall}</Link></div>)}</div></div>
    </div>
  );
}
