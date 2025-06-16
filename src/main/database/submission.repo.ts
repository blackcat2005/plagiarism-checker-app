import { BaseRepo } from './base.repo'
import { Submission } from './entity'
import { app } from 'electron'
import path from 'path'
import fs from 'fs'

export class SubmissionRepo extends BaseRepo<Submission> {
  constructor() {
    super('submissions')
  }

  async saveResult(submissionId: number, result: any): Promise<Submission> {
    // Create results directory if not exists
    const userDataPath = app.getPath('userData')
    const resultsDir = path.join(userDataPath, 'results')
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true })
    }

    // Save result to file
    const resultPath = path.join(resultsDir, `result_${submissionId}.json`)
    fs.writeFileSync(resultPath, JSON.stringify(result))

    // Update submission with result path
    return this.update(submissionId, {
      result_path: resultPath
    })
  }

  async getResult(submissionId: number): Promise<any | null> {
    const submission = await this.findById(submissionId)
    if (!submission || !submission.result_path) {
      return null
    }

    try {
      const resultData = fs.readFileSync(submission.result_path, 'utf-8')
      return JSON.parse(resultData)
    } catch (error) {
      console.error('Error reading result file:', error)
      return null
    }
  }

  async findByUserId(userId: number): Promise<Submission[]> {
    const stmt = this.db.prepare(
      'SELECT * FROM submissions WHERE user_id = ? ORDER BY created_at DESC'
    )
    return stmt.all(userId)
  }

  async getCreatedSubmissions(): Promise<Submission[]> {
    const stmt = this.db.prepare(
      'SELECT * FROM submissions WHERE status = ? ORDER BY created_at DESC'
    )
    return stmt.all(0)
  }
}
