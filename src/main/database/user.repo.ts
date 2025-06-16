import { BaseRepo } from './base.repo'
import { User } from './entity'

export class UserRepo extends BaseRepo<User> {
  constructor() {
    super('users')
  }

  async findByUserId(userId: string): Promise<User | null> {
    const stmt = this.db.prepare('SELECT * FROM users WHERE id = ?')
    return stmt.get(userId) || null
  }

  async findByUsername(username: string): Promise<User | null> {
    const stmt = this.db.prepare('SELECT * FROM users WHERE username = ?')
    return stmt.get(username) || null
  }
}
