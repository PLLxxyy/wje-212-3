import Database from 'better-sqlite3';
import path from 'path';

const initDb = (dbPath?: string): Database.Database => {
  const resolvedPath = dbPath || path.join(__dirname, '..', 'neighborhood.db');
  const db: Database.Database = new Database(resolvedPath);

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

    CREATE TABLE IF NOT EXISTS qa (
      id TEXT PRIMARY KEY,
      request_id TEXT NOT NULL,
      user_id TEXT,
      nickname TEXT,
      content TEXT NOT NULL,
      parent_id TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (request_id) REFERENCES requests(id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (parent_id) REFERENCES qa(id)
    );
  `);

  // 迁移：如果 qa 表缺少 nickname 列，添加它
  const columns = db.prepare("PRAGMA table_info(qa)").all() as { name: string }[];
  const hasNickname = columns.some(c => c.name === 'nickname');
  if (!hasNickname) {
    db.exec('ALTER TABLE qa ADD COLUMN nickname TEXT');
  }
  // 迁移：如果 qa 表的 user_id 是 NOT NULL，修改为允许 NULL
  const user_id_col = columns.find(c => c.name === 'user_id');
  if (user_id_col && (user_id_col as any).notnull) {
    db.exec('CREATE TABLE qa_new (id TEXT PRIMARY KEY, request_id TEXT NOT NULL, user_id TEXT, nickname TEXT, content TEXT NOT NULL, parent_id TEXT, created_at TEXT DEFAULT (datetime(\'now\',\'localtime\')))');
    db.exec('INSERT INTO qa_new (id, request_id, user_id, nickname, content, parent_id, created_at) SELECT id, request_id, user_id, NULL, content, parent_id, created_at FROM qa');
    db.exec('DROP TABLE qa');
    db.exec('ALTER TABLE qa_new RENAME TO qa');
  }

  return db;
};

let db: Database.Database;

if (process.env.NODE_ENV === 'test') {
  db = initDb(':memory:');
} else {
  db = initDb();
}

export { initDb };
export default db;
