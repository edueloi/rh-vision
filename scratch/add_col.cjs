const db = require('better-sqlite3')('./aurora_recruitment.db');
try {
  db.prepare('ALTER TABLE users ADD COLUMN photo_url TEXT;').run();
  console.log("Column added");
} catch (e) {
  console.log(e.message);
}
