const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'app.db');

const initDatabase = () => {
  const db = new Database(DB_PATH);

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  console.log('✅ Database initialized successfully');
  console.log(`📁 Database location: ${DB_PATH}`);

  db.close();
};

if (require.main === module) {
  initDatabase();
}

module.exports = initDatabase;
