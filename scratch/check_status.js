import db from './src/lib/db.js';
db.prepare('SELECT DISTINCT status FROM hr_tool_responses').all()
  .then(rows => {
    console.log('Statuses:', rows);
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
