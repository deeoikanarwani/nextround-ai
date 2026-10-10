import { Link } from 'react-router-dom';

export const Spinner = ({ full }) => (
  <div className={full ? 'center-screen' : 'center-box'}><div className="spinner" aria-label="Loading" /></div>
);

export const Alert = ({ children, kind = 'error' }) => (children ? <div className={`alert ${kind}`} role="alert">{children}</div> : null);

export const Empty = ({ title, body, to, cta }) => (
  <div className="empty">
    <h3>{title}</h3>
    <p>{body}</p>
    {to && <Link className="btn primary" to={to}>{cta}</Link>}
  </div>
);

export function Ring({ value, size = 96, label }) {
  const v = Math.max(0, Math.min(100, value ?? 0));
  const r = size / 2 - 7, c = 2 * Math.PI * r;
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth="7" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--accent)" strokeWidth="7" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - v / 100)} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      </svg>
      <div className="ring-text"><b>{value == null ? '–' : Math.round(v)}</b>{label && <small>{label}</small>}</div>
    </div>
  );
}

export const Bar = ({ label, value, note }) => (
  <div className="bar-row">
    <div className="bar-head"><span>{label}</span><b>{value ?? '–'}</b></div>
    <div className="bar"><i style={{ width: `${value ?? 0}%` }} /></div>
    {note && <small className="muted">{note}</small>}
  </div>
);

export const Chips = ({ items = [], kind }) => (
  <div className="chips">{items.map((s) => <span key={s} className={`chip ${kind || ''}`}>{s}</span>)}</div>
);

export function LineChart({ points, height = 160 }) {
  if (!points.length) return null;
  const W = 600, H = height, pad = 24;
  const x = (i) => (points.length === 1 ? W / 2 : pad + (i * (W - pad * 2)) / (points.length - 1));
  const y = (v) => H - pad - ((v ?? 0) / 100) * (H - pad * 2);
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${x(i)},${y(p.value)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="linechart" role="img" aria-label="Score trend">
      {[0, 50, 100].map((g) => <g key={g}><line x1={pad} x2={W - pad} y1={y(g)} y2={y(g)} stroke="var(--line)" /><text x="2" y={y(g) + 4} fontSize="10" fill="var(--muted)">{g}</text></g>)}
      <path d={d} fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinejoin="round" />
      {points.map((p, i) => <circle key={i} cx={x(i)} cy={y(p.value)} r="4" fill="#fff" stroke="var(--accent)" strokeWidth="2"><title>{`${p.label}: ${p.value}`}</title></circle>)}
    </svg>
  );
}

export const modeLabel = (m) => ({ quick: 'Quick practice', full: 'Full interview', technical: 'Technical', behavioral: 'Behavioral', system_design: 'System design', project: 'Project deep dive', job: 'Job interview', targeted: 'Targeted practice', rapid: 'Rapid fire' }[m] || m);
export const fmtDate = (d) => new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
