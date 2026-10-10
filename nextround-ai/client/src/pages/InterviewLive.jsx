import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, errMsg } from '../api';
import { Alert, Spinner, modeLabel } from '../components/ui.jsx';

const LABEL = { technical: 'Technical', communication: 'Communication', problemSolving: 'Problem solving', confidence: 'Confidence', roleKnowledge: 'Role knowledge', structure: 'Structure' };

export default function InterviewLive() {
  const { id } = useParams();
  const nav = useNavigate();
  const [iv, setIv] = useState(null);
  const [answer, setAnswer] = useState('');
  const [fb, setFb] = useState(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [secs, setSecs] = useState(0);
  const timer = useRef();

  useEffect(() => {
    api.get(`/interviews/${id}`).then((r) => { if (r.data.interview.status === 'completed') nav(`/reports/${id}`, { replace: true }); else setIv(r.data.interview); }).catch((e) => setErr(errMsg(e)));
  }, [id, nav]);

  const turn = iv?.turns?.[iv.turns.length - 1];
  useEffect(() => { setSecs(0); clearInterval(timer.current); timer.current = setInterval(() => setSecs((s) => s + 1), 1000); return () => clearInterval(timer.current); }, [turn?._id]);

  async function submit(e) {
    e.preventDefault(); if (!answer.trim()) return;
    setErr(''); setBusy(true);
    try {
      const { data } = await api.post(`/interviews/${id}/answer`, { answer });
      setIv(data.interview); setFb(data.evaluation); setAnswer(''); setDone(data.done);
    } catch (x) { setErr(errMsg(x)); } finally { setBusy(false); }
  }
  async function finishEarly() {
    if (!window.confirm('Finish now and see your report? Unanswered questions are skipped.')) return;
    try { await api.post(`/interviews/${id}/finish`); nav(`/reports/${id}`); } catch (x) { setErr(errMsg(x)); }
  }

  if (err && !iv) return <div className="studio-main"><Alert>{err}</Alert><Link to="/dashboard">Back to dashboard</Link></div>;
  if (!iv) return <Spinner full />;
  const answered = iv.turns.filter((t) => t.evaluation).length;

  return (
    <div className="studio">
      <div className="studio-top">
        <div><b>{modeLabel(iv.mode)}</b> <span className="muted">· {iv.difficulty}</span></div>
        <div className="row" style={{ flex: 1, justifyContent: 'center' }}><div className="progress"><i style={{ width: `${(answered / iv.total) * 100}%` }} /></div><small className="muted">{Math.min(answered + (done ? 0 : 1), iv.total)} / {iv.total}</small></div>
        <div className="row">{!done && <small className="muted">{Math.floor(secs / 60)}:{String(secs % 60).padStart(2, '0')}</small>}{!done && <button className="btn ghost sm" onClick={finishEarly} disabled={!answered}>Finish</button>}<Link className="btn ghost sm" to="/dashboard">Exit</Link></div>
      </div>
      <div className="studio-main">
        {fb && (
          <div className="fb">
            <b>Feedback on your last answer · {fb.overall}/100</b>
            <div className="chips" style={{ margin: '.5rem 0' }}>{Object.entries(fb.scores).map(([k, v]) => <span key={k} className="chip">{LABEL[k]} {v}</span>)}</div>
            {fb.strengths?.length > 0 && <><small className="muted">What worked</small><ul>{fb.strengths.map((s) => <li key={s}>{s}</li>)}</ul></>}
            {fb.improvements?.length > 0 && <><small className="muted">To improve</small><ul>{fb.improvements.map((s) => <li key={s}>{s}</li>)}</ul></>}
          </div>
        )}
        {done ? (
          <div className="q-card"><h2>Interview complete</h2><p className="muted">Your coaching report is ready.</p><button className="btn primary" onClick={() => nav(`/reports/${id}`)}>View report</button></div>
        ) : (
          <form onSubmit={submit}>
            <div className="q-card">
              <small className="muted">{turn?.followUp ? 'Follow-up from your last answer' : `Question ${answered + 1}`}</small>
              <h2>{turn?.question}</h2>
            </div>
            <textarea value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Type your answer as you would say it in the interview…" maxLength={3000} style={{ minHeight: 180 }} autoFocus disabled={busy} />
            <div className="row between" style={{ marginTop: '.6rem' }}><small className="muted">{answer.length}/3000</small><button className="btn primary" disabled={busy || !answer.trim()}>{busy ? 'Evaluating…' : 'Submit answer'}</button></div>
            <Alert>{err}</Alert>
          </form>
        )}
      </div>
    </div>
  );
}
