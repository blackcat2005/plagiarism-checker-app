import { app } from 'electron'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const Database = require('better-sqlite3')
const path = require('path')
const fs = require('fs')

export class DatabaseManager {
  private static instance: DatabaseManager
  private db

  private constructor() {
    // Đảm bảo thư mục data tồn tại
    const userDataPath = app.getPath('userData')
    const dbDir = path.join(userDataPath, 'database')
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true })
    }
    // Kết nối đến database
    const dbPath = path.join(dbDir, 'plagiarism.db')
    this.db = new Database(dbPath)

    // Bật foreign keys
    this.db.pragma('foreign_keys = ON')
    this.initDatabase()
  }

  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager()
    }
    return DatabaseManager.instance
  }

  public getDatabase() {
    return this.db
  }

  private initDatabase() {
    const createTables = `
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL
    );

    CREATE TABLE IF NOT EXISTS submissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type INTEGER NOT NULL,
        status INTEGER NOT NULL,
        document_count INTEGER DEFAULT 0,
        user_id INTEGER NOT NULL,
        result_path TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        submission_id INTEGER NOT NULL,
        is_doc_check BOOLEAN DEFAULT FALSE,
        FOREIGN KEY (submission_id) REFERENCES submissions(id)
    );

    CREATE TABLE IF NOT EXISTS sentences (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        id_in_doc INTEGER NOT NULL,
        doc_id INTEGER NOT NULL,
        page TEXT,
        split INTEGER,
        text TEXT,
        FOREIGN KEY (doc_id) REFERENCES documents(id)
    );
    `

    this.db.exec(createTables)
  }
  public close() {
    this.db.close()
  }
}
