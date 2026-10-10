import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, errMsg } from '../api';
import { Alert, Empty, Spinner, fmtDate, modeLabel } from '../components/ui.jsx';

export default function Reports() {
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [err, setErr] = useState('');
  const load = () => api.get(`/interviews?page=${page}&limit=10`).then((r) => setData(r.data)).catch((e) => setErr(errMsg(e)));
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [page]);
  async function del(id) { if (!window.confirm('Delete this interview and its report?')) return; await api.delete(`/interviews/${id}`).catch((e) => setErr(errMsg(e))); load(); }
  if (!data) return err ? <Alert>{err}</Alert> : <Spinner />;
  return (
    <div className="stack">
      <div className="page-head"><h1>Reports</h1><p>Every interview you have taken, with coaching feedback.</p></div>
      <Alert>{err}</Alert>
      {!data.interviews.length ? <Empty title="No interviews yet" body="Take your first interview to get a coaching report." to="/interview/new" cta="Start an interview" /> : (
        <div className="card list">
          {data.interviews.map((i) => (
            <div key={i._id} className="row between">
              <span><b>{modeLabel(i.mode)}</b> <span className="muted">· {fmtDate(i.createdAt)} · {i.difficulty}</span></span>
              <span className="row">
                {i.status === 'completed' ? <Link to={`/reports/${i._id}`}>Score {i.overall} · View report</Link> : <Link to={`/interview/${i._id}`}>Continue</Link>}
                <button className="btn ghost sm" onClick={() => del(i._id)}>Delete</button>
              </span>
            </div>
          ))}
        </div>
      )}
      {data.pages > 1 && <div className="row"><button className="btn sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button><small>Page {page} of {data.pages}</small><button className="btn sm" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>Next</button></div>}
    </div>
  );
}
