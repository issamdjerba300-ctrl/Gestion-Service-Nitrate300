const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'app.db');
const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');

module.exports = db;
