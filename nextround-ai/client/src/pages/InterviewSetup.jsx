import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api, errMsg } from '../api';
import { Alert, Spinner } from '../components/ui.jsx';

const MODES = [
  ['quick', 'Quick practice', '5 mixed questions'], ['full', 'Full interview', '10 questions across HR, technical, project and design'],
  ['technical', 'Technical', 'Core technical questions'], ['behavioral', 'Behavioral', 'STAR-style questions'],
  ['system_design', 'System design', 'Architecture and scaling'], ['project', 'Project deep dive', 'Questions about one of your projects'],
  ['job', 'Job interview', 'Tailored to a target job and your resume'], ['targeted', 'Targeted practice', 'Drill one weak area'], ['rapid', 'Rapid fire', 'Short fundamentals'],
];
const FOCUS = { communication: 'Communication', structure: 'Answer structure (STAR)', confidence: 'Confidence', technical: 'Technical depth', problemSolving: 'Problem solving', roleKnowledge: 'Role knowledge' };

export default function InterviewSetup() {
  const [q] = useSearchParams();
  const nav = useNavigate();
  const [resumes, setResumes] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [f, setF] = useState({
    mode: q.get('mode') || 'quick', difficulty: 'intermediate', persona: 'professional',
    resumeId: q.get('resumeId') || '', jobId: q.get('jobId') || '', focus: q.get('focus') || 'communication',
    pname: q.get('project') || '', ptech: q.get('tech') || '', pdesc: '',
  });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  useEffect(() => { Promise.all([api.get('/resumes'), api.get('/jobs')]).then(([r, j]) => { setResumes(r.data.resumes); setJobs(j.data.jobs); }).catch((e) => setErr(errMsg(e))); }, []);

  async function start(e) {
    e.preventDefault(); setErr(''); setBusy(true);
    try {
      const body = { mode: f.mode, difficulty: f.difficulty, persona: f.persona, resumeId: f.resumeId || undefined, jobId: f.jobId || undefined };
      if (f.mode === 'targeted') body.focus = f.focus;
      if (f.mode === 'project') body.project = { name: f.pname, tech: f.ptech.split(',').map((s) => s.trim()).filter(Boolean), description: f.pdesc };
      const { data } = await api.post('/interviews', body);
      nav(`/interview/${data.interview._id}`);
    } catch (x) { setErr(errMsg(x)); setBusy(false); }
  }
  if (!resumes) return <Spinner />;

  return (
    <form className="stack" onSubmit={start}>
      <div className="page-head"><h1>Start an interview</h1><p>Pick a format. The more context you give, the more personal the questions.</p></div>
      <div className="modes">{MODES.map(([k, t, d]) => <button type="button" key={k} className={`mode ${f.mode === k ? 'sel' : ''}`} onClick={() => setF({ ...f, mode: k })}><b>{t}</b><small>{d}</small></button>)}</div>
      <div className="card stack">
        <div className="grid g3">
          <div><label htmlFor="d">Difficulty</label><select id="d" value={f.difficulty} onChange={set('difficulty')}><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option><option value="expert">Expert</option></select></div>
          <div><label htmlFor="p">Interviewer style</label><select id="p" value={f.persona} onChange={set('persona')}><option value="friendly">Friendly</option><option value="professional">Professional</option><option value="strict">Strict</option><option value="technical">Technical</option><option value="behavioral">Behavioral</option></select></div>
          <div><label htmlFor="r">Resume context</label><select id="r" value={f.resumeId} onChange={set('resumeId')}><option value="">None</option>{resumes.map((r) => <option key={r._id} value={r._id}>{r.title}</option>)}</select></div>
        </div>
        {(f.mode === 'job' || jobs.length > 0) && <div><label htmlFor="j">Target job {f.mode === 'job' ? '' : '(optional)'}</label><select id="j" value={f.jobId} onChange={set('jobId')} required={f.mode === 'job'}><option value="">{f.mode === 'job' ? 'Choose a job' : 'None'}</option>{jobs.map((j) => <option key={j._id} value={j._id}>{j.title}{j.company ? ` · ${j.company}` : ''}</option>)}</select></div>}
        {f.mode === 'targeted' && <div><label htmlFor="f">Weakness to practise</label><select id="f" value={f.focus} onChange={set('focus')}>{Object.entries(FOCUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>}
        {f.mode === 'project' && <div className="stack">
          <div><label htmlFor="pn">Project name</label><input id="pn" value={f.pname} onChange={set('pname')} required maxLength={100} placeholder="Fleet Management System" /></div>
          <div><label htmlFor="pt">Technologies</label><input id="pt" value={f.ptech} onChange={set('ptech')} placeholder="Node.js, Express, PostgreSQL, Redis" /></div>
          <div><label htmlFor="pd">What does it do? (optional)</label><textarea id="pd" value={f.pdesc} onChange={set('pdesc')} maxLength={600} style={{ minHeight: 80 }} /></div>
        </div>}
        <Alert>{err}</Alert>
        <div><button className="btn primary" disabled={busy}>{busy ? 'Preparing your interview…' : 'Begin interview'}</button></div>
      </div>
    </form>
  );
}
