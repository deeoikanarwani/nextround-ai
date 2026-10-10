import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, errMsg } from '../api';
import { Alert, Bar, Chips, Empty, Ring, Spinner, fmtDate } from '../components/ui.jsx';

export default function Resume() {
  const [list, setList] = useState(null);
  const [sel, setSel] = useState(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const file = useRef();

  const load = () => api.get('/resumes').then((r) => { setList(r.data.resumes); setSel((s) => r.data.resumes.find((x) => x._id === s?._id) || r.data.resumes[0] || null); }).catch((e) => setErr(errMsg(e)));
  useEffect(() => { load(); }, []);

  async function upload(form) {
    setErr(''); setBusy(true);
    try { await api.post('/resumes', form); setText(''); if (file.current) file.current.value = ''; await load(); }
    catch (e) { setErr(errMsg(e)); } finally { setBusy(false); }
  }
  const onFile = () => { const f = file.current.files[0]; if (!f) return; const fd = new FormData(); fd.append('file', f); upload(fd); };
  const onText = () => upload({ title: 'Pasted resume', text });
  async function del(id) { if (!window.confirm('Delete this resume permanently?')) return; await api.delete(`/resumes/${id}`).catch((e) => setErr(errMsg(e))); setSel(null); load(); }

  if (!list) return <Spinner />;
  const a = sel?.analysis;

  return (
    <div className="stack">
      <div className="page-head"><h1>Resume intelligence</h1><p>Your resume becomes the context for every interview.</p></div>
      <div className="card stack">
        <h3>{list.length ? 'Add another resume' : 'Upload your resume'}</h3>
        <div className="row"><input ref={file} type="file" accept=".pdf,.txt,application/pdf,text/plain" onChange={onFile} disabled={busy} style={{ maxWidth: 340 }} /><small className="muted">PDF or TXT, up to 2 MB. Stored privately; only you can see it.</small></div>
        <details><summary className="muted">Or paste the text</summary><textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste your resume text here" style={{ marginTop: '.5rem' }} /><button className="btn" disabled={busy || text.length < 100} onClick={onText} style={{ marginTop: '.5rem' }}>Analyze pasted text</button></details>
        {busy && <p className="muted">Analyzing your resume…</p>}
        <Alert>{err}</Alert>
      </div>

      {!list.length && <Empty title="No resume yet" body="Upload a PDF to get your ATS score, skill coverage and the claims you should be ready to defend." />}

      {sel && a && (
        <>
          <div className="row between">
            <div className="row">{list.length > 1 && <select value={sel._id} onChange={(e) => setSel(list.find((x) => x._id === e.target.value))} style={{ width: 'auto' }}>{list.map((r) => <option key={r._id} value={r._id}>{r.title} · {fmtDate(r.createdAt)}</option>)}</select>}</div>
            <div className="row"><Link className="btn primary" to="/jobs">Compare with a job</Link><button className="btn danger" onClick={() => del(sel._id)}>Delete</button></div>
          </div>
          {a.summary && <p>{a.summary}</p>}
          <div className="grid g2">
            <div className="card"><div className="hero-card"><Ring value={a.atsScore} size={110} label="ATS" /><div><Bar label="Skill coverage" value={a.skillCoverage} /><Bar label="Experience strength" value={a.experienceStrength} /><Bar label="Project strength" value={a.projectStrength} /></div></div></div>
            <div className="card"><h3>Skills detected</h3><Chips items={a.skills} />{!a.skills?.length && <p className="muted">No known skills detected. Add a Skills section.</p>}</div>
          </div>
          <div className="grid g2">
            <div className="card"><h3>Strengths</h3>{a.strengths?.length ? <ul>{a.strengths.map((s) => <li key={s}>✓ {s}</li>)}</ul> : <p className="muted">None detected yet.</p>}</div>
            <div className="card"><h3>Improvements</h3><ul>{a.improvements?.map((s) => <li key={s}>⚠ {s}</li>)}</ul></div>
          </div>
          {a.projects?.length > 0 && <div className="card"><h3>Projects found</h3><div className="list">{a.projects.map((p) => <div key={p.name} className="row between"><span><b>{p.name}</b> <span className="muted">{p.tech?.join(', ')}</span></span><Link className="btn sm" to={`/interview/new?mode=project&resumeId=${sel._id}&project=${encodeURIComponent(p.name)}&tech=${encodeURIComponent((p.tech || []).join(','))}`}>Project interview</Link></div>)}</div></div>}
          {a.defensibility?.length > 0 && <div className="card"><h3>Be ready to defend these claims</h3><div className="list">{a.defensibility.map((d, i) => <div key={i}><b>“{d.claim}”</b><p className="muted" style={{ marginBottom: 0 }}>{d.prepare}</p></div>)}</div></div>}
          <p className="muted"><small>{a.aiPowered ? 'Analyzed with Gemini.' : 'Analyzed with built-in rules. Add a free Gemini key on the server for deeper insights.'}</small></p>
        </>
      )}
    </div>
  );
}
