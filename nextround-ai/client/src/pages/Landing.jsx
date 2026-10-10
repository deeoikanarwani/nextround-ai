import { Link } from 'react-router-dom';
import { useAuth } from '../store';
import { Bar, Chips, LineChart, Ring } from '../components/ui.jsx';

const Resume = () => <div className="pv-row"><Ring value={82} size={92} label="ATS" /><div style={{ flex: 1 }}><Bar label="Skill coverage" value={91} /><Bar label="Project strength" value={78} /></div></div>;
const Match = () => <div className="pv-box"><div className="row between"><b>Backend Engineer</b><span className="chip good">87% match</span></div><div style={{ margin: '.5rem 0' }}><Chips items={['Java', 'Spring Boot', 'SQL', 'AWS']} kind="good" /></div><Chips items={['Docker', 'Kubernetes']} kind="warn" /></div>;
const Chat = () => <div className="stack"><div className="bubble">You mentioned authorization. How did you stop one company's users from editing another company's data?</div><div className="bubble you">Every query is scoped by company id from the token, and I check ownership in middleware…</div><div className="bubble">If you had 10x the users, what would you change first?</div></div>;
const Feedback = () => <div className="pv-box"><div className="row between"><b>Communication</b><b>72</b></div><small className="muted">Clear explanation, good vocabulary. Answer ran long and the conclusion was weak. Try Situation → Action → Result.</small></div>;
const Ready = () => <div className="pv-row"><Ring value={82} size={92} label="ready" /><div><b>You are close to interview-ready.</b><p className="muted" style={{ marginBottom: 0 }}>Biggest opportunity: system design. Next: 15-minute practice.</p></div></div>;

export default function Landing() {
  const user = useAuth((s) => s.user);
  const cta = user ? '/dashboard' : '/register';
  const story = [
    ['Start with your resume', 'Upload it once. It becomes the context for every question, and you see which claims you should be ready to defend.', <Resume />],
    ['Prepare for the role', 'Paste a job description and see exactly where your resume matches, where it does not, and what the interview will focus on.', <Match />],
    ['Practice with an interviewer that listens', 'Questions react to what you say. Mention a technology and it asks why you chose it and how it scales.', <Chat />],
    ['Understand every score', 'No mystery numbers. Each score comes with what worked, what did not, and a better structure to try.', <Feedback />],
    ['Know what to do next', 'Your readiness score comes with one recommendation, not twenty.', <Ready />],
    ['Watch yourself improve', 'Every interview is remembered. See your trend and whether the weak spot you practised actually moved.', <div className="pv-box"><LineChart points={[68, 72, 74, 78, 81, 84].map((v, i) => ({ value: v, label: `Interview ${i + 1}` }))} height={130} /></div>],
  ];
  return (
    <div className="landing">
      <div className="wrap">
        <div className="l-nav"><span className="brand">NextRound<span>AI</span></span><div className="row">{user ? <Link className="btn primary" to="/dashboard">Open dashboard</Link> : <><Link className="btn ghost" to="/login">Log in</Link><Link className="btn primary" to="/register">Start practicing</Link></>}</div></div>
        <section className="hero">
          <div className="stack">
            <h1>Walk into your next interview with confidence.</h1>
            <p className="lead">Practice with an AI interviewer that understands your resume, your target role, and the way you answer.</p>
            <div className="row"><Link className="btn primary" to={cta}>Start Practicing</Link><a className="btn" href="#story">Explore NextRound AI</a></div>
            <small className="muted">Free to use. Your resume stays private.</small>
          </div>
          <div className="preview"><Resume /><Match /><Chat /></div>
        </section>
        <div id="story">
          {story.map(([t, p, ui]) => <section className="story" key={t}><div className="story-text"><h2>{t}</h2><p>{p}</p></div><div className="preview">{ui}</div></section>)}
        </div>
        <section className="timeline">
          {[['01', 'Build your profile', 'Pick your level and upload your resume.'], ['02', 'Choose your target role', 'Paste a job and see your match.'], ['03', 'Practice with AI', 'Adaptive questions, honest evaluation.'], ['04', 'Improve with feedback', 'Practice weak spots, then measure the change.']].map(([n, t, p]) => <div key={n}><b>{n}. {t}</b><p>{p}</p></div>)}
        </section>
        <section className="final"><h2>Ready for your next round?</h2><Link className="btn primary" to={cta}>Start Practicing</Link></section>
      </div>
    </div>
  );
}
