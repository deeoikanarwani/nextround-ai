const DEFS = [
  ['JavaScript', 'javascript', 'js', 'es6'], ['TypeScript', 'typescript'], ['Python', 'python'], ['Java', 'java'],
  ['C++', 'c++'], ['C#', 'c#'], ['Go', 'golang'], ['Kotlin', 'kotlin'], ['PHP', 'php'], ['Ruby', 'ruby'], ['SQL', 'sql'],
  ['Node.js', 'node.js', 'nodejs', 'node'], ['Express', 'express', 'express.js', 'expressjs'],
  ['React', 'react', 'react.js', 'reactjs'], ['Next.js', 'next.js', 'nextjs'], ['Angular', 'angular'], ['Vue', 'vue', 'vue.js'],
  ['HTML', 'html', 'html5'], ['CSS', 'css', 'css3'], ['Tailwind CSS', 'tailwind', 'tailwindcss'],
  ['Spring Boot', 'spring boot', 'springboot'], ['Spring', 'spring framework', 'spring mvc'], ['Hibernate', 'hibernate'],
  ['Django', 'django'], ['Flask', 'flask'], ['FastAPI', 'fastapi'],
  ['MongoDB', 'mongodb', 'mongo'], ['PostgreSQL', 'postgresql', 'postgres'], ['MySQL', 'mysql'], ['Redis', 'redis'],
  ['Elasticsearch', 'elasticsearch'], ['Kafka', 'kafka'], ['RabbitMQ', 'rabbitmq'],
  ['Knex.js', 'knex', 'knex.js'], ['Prisma', 'prisma'], ['Sequelize', 'sequelize'],
  ['REST APIs', 'rest api', 'rest apis', 'restful', 'restful apis'], ['GraphQL', 'graphql'], ['gRPC', 'grpc'],
  ['WebSockets', 'websocket', 'websockets', 'socket.io'],
  ['Docker', 'docker'], ['Kubernetes', 'kubernetes', 'k8s'], ['AWS', 'aws', 'amazon web services'], ['Azure', 'azure'],
  ['GCP', 'gcp', 'google cloud'], ['Terraform', 'terraform'], ['CI/CD', 'ci/cd', 'jenkins', 'github actions'],
  ['Git', 'git', 'github', 'gitlab'], ['Linux', 'linux'], ['Microservices', 'microservices', 'microservice'],
  ['System Design', 'system design'], ['JWT', 'jwt'], ['OAuth', 'oauth', 'oauth2'],
  ['Machine Learning', 'machine learning', 'ml'], ['Deep Learning', 'deep learning'], ['TensorFlow', 'tensorflow'],
  ['PyTorch', 'pytorch'], ['Pandas', 'pandas'], ['NumPy', 'numpy'], ['Scikit-learn', 'scikit-learn', 'sklearn'],
  ['Spark', 'apache spark', 'pyspark'], ['Airflow', 'airflow'], ['ETL', 'etl'],
  ['Data Structures', 'data structures', 'dsa'], ['Algorithms', 'algorithms'], ['OOP', 'oop', 'object-oriented', 'object oriented'],
  ['Jest', 'jest'], ['JUnit', 'junit'], ['Agile', 'agile', 'scrum'], ['Redux', 'redux'], ['Zustand', 'zustand'],
  ['Firebase', 'firebase'], ['Selenium', 'selenium'], ['Postman', 'postman'], ['Power BI', 'power bi'], ['Tableau', 'tableau'],
];

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
const COMPILED = DEFS.map(([name, ...aliases]) => ({
  name,
  re: new RegExp(`(?<![a-z0-9+#.])(?:${[...new Set(aliases)].sort((a, b) => b.length - a.length).map(esc).join('|')})(?![a-z0-9+#])`, 'i'),
}));

export function extractSkills(text = '') {
  return COMPILED.filter((s) => s.re.test(text)).map((s) => s.name);
}
