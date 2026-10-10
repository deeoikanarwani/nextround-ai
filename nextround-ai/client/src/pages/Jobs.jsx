import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, errMsg } from '../api';
import { Alert, Chips, Empty, Ring, Spinner } from '../components/ui.jsx';

export default function Jobs() {
  const [jobs, setJobs] = useState(null);
  const [resumes, setResumes] = useState([]);
  const [sel, setSel] = useState(null);
  const [f, setF] = useState({ title: '', company: '', description: '', resumeId: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const load = () => Promise.all([api.get('/jobs'), api.get('/resumes')]).then(([j, r]) => { setJobs(j.data.jobs); setResumes(r.data.resumes); setSel((s) => j.data.jobs.find((x) => x._id === s?._id) || j.data.jobs[0] || null); }).catch((e) => setErr(errMsg(e)));
  useEffect(() => { load(); }, []);

  async function add(e) {
    e.preventDefault(); setErr(''); setBusy(true);
    try { const { data } = await api.post('/jobs', { ...f, resumeId: f.resumeId || undefined }); setF({ title: '', company: '', description: '', resumeId: '' }); await load(); setSel(data.job); }
    catch (x) { setErr(errMsg(x)); } finally { setBusy(false); }
  }
  async function rematch(id, resumeId) { try { const { data } = await api.post(`/jobs/${id}/match`, { resumeId }); setSel(data.job); load(); } catch (x) { setErr(errMsg(x)); } }
  async function del(id) { if (!window.confirm('Delete this job?')) return; await api.delete(`/jobs/${id}`).catch((x) => setErr(errMsg(x))); setSel(null); load(); }

  if (!jobs) return <Spinner />;
  const m = sel?.match, a = sel?.analysis;

  return (
    <div className="stack">
      <div className="page-head"><h1>Job intelligence</h1><p>Paste a job description. See how your resume matches and what the interview will focus on.</p></div>
      {!resumes.length && <Alert kind="ok">Upload a resume first to get a match score. <Link to="/resume">Go to Resume</Link></Alert>}
      <form className="card stack" onSubmit={add}>
        <div className="grid g2"><div><label htmlFor="t">Job title</label><input id="t" value={f.title} onChange={set('title')} required maxLength={120} placeholder="Backend Engineer" /></div><div><label htmlFor="c">Company (optional)</label><input id="c" value={f.company} onChange={set('company')} maxLength={120} /></div></div>
        <div><label htmlFor="d">Job description</label><textarea id="d" value={f.description} onChange={set('description')} required minLength={50} placeholder="Paste the full job description" style={{ minHeight: 160 }} /></div>
        {resumes.length > 0 && <div><label htmlFor="r">Match against</label><select id="r" value={f.resumeId} onChange={set('resumeId')}><option value="">Latest resume</option>{resumes.map((r) => <option key={r._id} value={r._id}>{r.title}</option>)}</select></div>}
        <Alert>{err}</Alert>
        <button className="btn primary" disabled={busy}>{busy ? 'Analyzing…' : 'Analyze job'}</button>
      </form>

      {!jobs.length && <Empty title="No target jobs yet" body="Add one above to see your match score and interview focus." />}
      {jobs.length > 0 && <div className="row">{jobs.map((j) => <button key={j._id} className={`btn ${sel?._id === j._id ? 'primary' : ''}`} onClick={() => setSel(j)}>{j.title}{j.company ? ` · ${j.company}` : ''}</button>)}</div>}

      {sel && (
        <div className="stack">
          <div className="card row between">
            <div className="row">{m ? <Ring value={m.score} size={104} label="match" /> : <span className="muted">No match yet</span>}<div><h2>{a.role || sel.title}</h2><p className="muted" style={{ marginBottom: 0 }}>{a.experience}</p></div></div>
            <div className="row">
              {resumes.length > 1 && <select style={{ width: 'auto' }} value={m?.resumeId || ''} onChange={(e) => rematch(sel._id, e.target.value)}><option value="" disabled>Re-match with…</option>{resumes.map((r) => <option key={r._id} value={r._id}>{r.title}</option>)}</select>}
              <Link className="btn primary" to={`/interview/new?mode=job&jobId=${sel._id}${m?.resumeId ? `&resumeId=${m.resumeId}` : ''}`}>Prepare for this role</Link>
              <button className="btn danger" onClick={() => del(sel._id)}>Delete</button>
            </div>
          </div>
          {m && <div className="grid g2">
            <div className="card"><h3>Matched skills</h3>{m.matched.length ? <Chips items={m.matched} kind="good" /> : <p className="muted">No overlap detected.</p>}</div>
            <div className="card"><h3>Missing or weak</h3>{m.missing.length ? <Chips items={m.missing} kind="warn" /> : <p className="muted">Nothing missing. Nice.</p>}</div>
            <div className="card"><h3>Interview focus</h3><Chips items={m.focus} /></div>
            <div className="card"><h3>Recommendations</h3><ul>{m.recommendations.map((r) => <li key={r}>{r}</li>)}</ul></div>
          </div>}
          <div className="grid g2">
            <div className="card"><h3>Required skills</h3><Chips items={a.requiredSkills} />{a.preferredSkills?.length > 0 && <><h3 style={{ marginTop: '1rem' }}>Preferred</h3><Chips items={a.preferredSkills} /></>}</div>
            <div className="card"><h3>Responsibilities</h3>{a.responsibilities?.length ? <ul>{a.responsibilities.map((r) => <li key={r}>{r}</li>)}</ul> : <p className="muted">None extracted.</p>}</div>
          </div>
        </div>
      )}
    </div>
  );
}
