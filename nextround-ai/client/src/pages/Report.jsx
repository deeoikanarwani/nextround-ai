import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, errMsg } from '../api';
import { Alert, Bar, Spinner, fmtDate, modeLabel } from '../components/ui.jsx';

export default function Report() {
  const { id } = useParams();
  const [iv, setIv] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => { api.get(`/interviews/${id}`).then((r) => setIv(r.data.interview)).catch((e) => setErr(errMsg(e))); }, [id]);
  if (err) return <Alert>{err}</Alert>;
  if (!iv) return <Spinner />;
  const r = iv.report;
  if (!r) return <div className="card empty"><h3>This interview isn't finished</h3><Link className="btn primary" to={`/interview/${id}`}>Continue interview</Link></div>;
  const dims = [['technical', 'Technical'], ['communication', 'Communication'], ['problemSolving', 'Problem solving'], ['confidence', 'Confidence'], ['roleKnowledge', 'Role knowledge'], ['structure', 'Answer structure']];

  return (
    <div className="stack">
      <div className="page-head"><small className="muted">{modeLabel(iv.mode)} · {fmtDate(iv.createdAt)} · {r.answered} questions</small><h1>Interview report</h1></div>
      <div className="card grid g2" style={{ alignItems: 'center' }}>
        <div><div className="score-big">{r.overall}<small className="muted" style={{ fontSize: '1.2rem' }}> / 100</small></div><p style={{ marginTop: '.5rem' }}>{r.summary}</p>
          {r.practiceDelta && <p className="chip good">{r.practiceDelta.label}: {r.practiceDelta.before} → {r.practiceDelta.after}</p>}</div>
        <div>{dims.map(([k, l]) => <Bar key={k} label={l} value={r.scores[k]} />)}</div>
      </div>
      <div className="grid g2">
        <div className="card"><h3>What you did well</h3>{r.strengths.length ? <ul>{r.strengths.map((s) => <li key={s.key}><b>{s.label} ({s.score})</b>. {s.reason}</li>)}</ul> : <p className="muted">Keep practising. Strengths will show as scores rise above 75.</p>}</div>
        <div className="card"><h3>Important weaknesses</h3><ul>{r.weaknesses.map((s) => <li key={s.key}><b>{s.label} ({s.score})</b>. {s.reason}</li>)}</ul></div>
      </div>
      {(r.commonImprovements?.length > 0) && <div className="card"><h3>Patterns across your answers</h3><ul>{r.commonImprovements.map((s) => <li key={s}>{s}</li>)}</ul></div>}
      <div className="card next row between">
        <div><small className="muted">Recommended practice</small><h3 style={{ marginBottom: 0 }}>{r.practice[0]?.label}</h3></div>
        <div className="row">{r.practice.map((p) => <Link key={p.focus} className="btn primary" to={`/interview/new?mode=targeted&focus=${p.focus}${iv.job ? `&jobId=${iv.job}` : ''}${iv.resume ? `&resumeId=${iv.resume}` : ''}`}>Practice {p.label.replace('15-minute ', '').replace(' practice', '').toLowerCase()}</Link>)}</div>
      </div>
      <div className="card"><h3>Question-by-question feedback</h3>
        <div className="list">{iv.turns.filter((t) => t.evaluation).map((t, i) => (
          <details key={t._id}><summary><b>{i + 1}. {t.question}</b> <span className="chip">{t.evaluation.overall}</span>{t.followUp && <span className="chip warn" style={{ marginLeft: 6 }}>follow-up</span>}</summary>
            <p className="muted" style={{ marginTop: '.5rem' }}>Your answer: {t.answer}</p>
            {t.evaluation.strengths?.map((s) => <div key={s}>✓ {s}</div>)}
            {t.evaluation.improvements?.map((s) => <div key={s}>⚠ {s}</div>)}
            {t.evaluation.suggestion && <p style={{ marginTop: '.5rem' }}><b>Try this:</b> {t.evaluation.suggestion}</p>}
          </details>
        ))}</div>
      </div>
    </div>
  );
}
