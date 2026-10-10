// Question bank used as the deterministic fallback when Gemini is unavailable.
export const BANK = {
  technical: [
    'Explain how {skill} works under the hood, as you would to a teammate new to it.',
    'Tell me about a bug or performance problem you hit while working with {skill}. How did you debug it?',
    'How would you design a REST API for a resource where users may only edit their own data?',
    'Explain the difference between SQL and NoSQL databases and when you would choose each.',
    'How do you handle errors and input validation in a backend service?',
    'Walk me through what happens, step by step, when a user submits a login form in your app.',
    'How would you test a feature you just built, and what would you not bother testing?',
    'Explain time and space complexity using an example from code you wrote.',
  ],
  behavioral: [
    'Tell me about a difficult technical problem you solved. What was the situation, what did you do, and what was the result?',
    'Describe a time you disagreed with a teammate or reviewer. How did you handle it?',
    'Tell me about a deadline you were at risk of missing. What did you do?',
    'Describe a time you received critical feedback on your work. What changed afterwards?',
    'Tell me about something you had to learn quickly to finish a task.',
    'Why are you interested in the {role} role?',
    'Tell me about the project you are most proud of and your specific contribution.',
    'Where do you want to grow over the next two years?',
  ],
  system_design: [
    'Design a URL shortener. Cover the API, storage, and how it scales.',
    'Design a notification system that sends emails and push messages reliably.',
    'How would you design the backend of a fleet-tracking or ride-hailing style app? What are the key components?',
    'How would you add caching to a read-heavy service, and what could go wrong?',
    'How would you scale a service from 1,000 to 1,000,000 users?',
    'Design a rate limiter for a public API.',
  ],
  project: [
    'In two minutes, explain {project}: the problem, your role, and the architecture.',
    'Why did you choose {skill} for {project}?',
    'How does authentication and authorization work in {project}?',
    'What was the hardest technical problem in {project}, and how did you solve it?',
    'How would {project} behave at 10x the load? What would you change first?',
    'What happens in {project} if a key dependency such as the database or cache fails?',
    'What would you redesign in {project} if you started again?',
    'How did you test {project}?',
  ],
  rapid: [
    'What is the difference between a process and a thread?',
    'What is a database index and when can it hurt?',
    'What does idempotent mean for an API?',
    'What is the difference between authentication and authorization?',
    'What is a race condition? Give a quick example.',
    'REST vs GraphQL: one-minute comparison.',
    'What is a foreign key and why use it?',
    'What does CORS protect against?',
    'Stack vs queue: when would you use each?',
    'What is caching and what is cache invalidation?',
  ],
  job: [
    'This role requires {skill}. Describe your experience with it, or how you would become productive quickly.',
    'Which responsibility in this {role} role excites you most, and how would you approach it in your first month?',
    'Pick a requirement of this {role} role that you are weakest in. How would you close the gap?',
    'How would your projects prepare you for the day-to-day work of a {role}?',
  ],
};

export const SEQUENCES = {
  quick: ['technical', 'behavioral', 'technical', 'project', 'behavioral'],
  full: ['behavioral', 'technical', 'technical', 'project', 'system_design', 'behavioral', 'technical', 'system_design', 'project', 'behavioral'],
  technical: ['technical'],
  behavioral: ['behavioral'],
  system_design: ['system_design'],
  project: ['project'],
  job: ['job', 'technical', 'job', 'behavioral', 'system_design', 'job', 'technical', 'behavioral'],
  rapid: ['rapid'],
};

export const FOCUS_SEQUENCE = {
  communication: ['behavioral'], structure: ['behavioral'], confidence: ['behavioral'],
  technical: ['technical'], problemSolving: ['system_design', 'technical'], roleKnowledge: ['job', 'technical'],
};

export const FOLLOWUPS = [
  'You mentioned {s}. Why did you choose it over the alternatives, and what trade-offs did you accept?',
  'You mentioned {s}. What would break first if usage grew 10x, and how would you handle it?',
  'You mentioned {s}. Walk me through a concrete problem you hit with it and how you solved it.',
];
