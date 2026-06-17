import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(__dirname, '..', 'neighborhood.db');
const db: Database.Database = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    nickname TEXT NOT NULL,
    phone TEXT NOT NULL,
    building TEXT NOT NULL,
    avatar TEXT DEFAULT '',
    points INTEGER DEFAULT 0,
    help_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS requests (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,
    description TEXT NOT NULL,
    reward TEXT NOT NULL,
    deadline TEXT NOT NULL,
    status TEXT DEFAULT 'open',
    helper_id TEXT,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    started_at TEXT,
    completed_at TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (helper_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS reviews (
    id TEXT PRIMARY KEY,
    request_id TEXT UNIQUE NOT NULL,
    reviewer_id TEXT NOT NULL,
    helper_id TEXT NOT NULL,
    rating INTEGER NOT NULL,
    comment TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (request_id) REFERENCES requests(id),
    FOREIGN KEY (reviewer_id) REFERENCES users(id),
    FOREIGN KEY (helper_id) REFERENCES users(id)
  );
`);

export default db;
