import { DatabaseManager } from './database.manager'
import { DatabaseService } from './repo.interface'

export abstract class BaseRepo<T> implements DatabaseService<T> {
  protected db
  protected tableName: string

  constructor(tableName: string) {
    this.tableName = tableName
    this.db = DatabaseManager.getInstance().getDatabase()
  }

  async create(data: Partial<T>): Promise<T> {
    const keys = Object.keys(data)
    const values = Object.values(data)
    const placeholders = keys.map(() => '?').join(', ')
    const columns = keys.join(', ')

    const stmt = this.db.prepare(
      `INSERT INTO ${this.tableName} (${columns}) VALUES (${placeholders}) RETURNING *`
    )
    return stmt.get(...values)
  }

  async findById(id: number): Promise<T | null> {
    const stmt = this.db.prepare(`SELECT * FROM ${this.tableName} WHERE id = ?`)
    return stmt.get(id) || null
  }

  async findAll(): Promise<T[]> {
    const stmt = this.db.prepare(`SELECT * FROM ${this.tableName}`)
    return stmt.all()
  }

  async update(id: number, data: Partial<T>): Promise<T> {
    const keys = Object.keys(data)
    const values = Object.values(data)
    const setClause = keys.map((key) => `${key} = ?`).join(', ')

    const stmt = this.db.prepare(
      `UPDATE ${this.tableName} SET ${setClause} WHERE id = ? RETURNING *`
    )
    return stmt.get(...values, id)
  }

  async delete(id: number): Promise<boolean> {
    const stmt = this.db.prepare(`DELETE FROM ${this.tableName} WHERE id = ?`)
    const result = stmt.run(id)
    return result.changes > 0
  }
}
