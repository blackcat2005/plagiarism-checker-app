import { BaseRepo } from './base.repo'
import { Document } from './entity'
import { SUBMISSION_STATUS } from '../../shared/types'

export class DocumentRepo extends BaseRepo<Document> {
  constructor() {
    super('documents')
  }

  async findBySubmissionId(submissionId: number): Promise<Document[]> {
    const stmt = this.db.prepare('SELECT * FROM documents WHERE submission_id = ?')
    return stmt.all(submissionId)
  }

  async findBySubmissionIdAndIsDocCheck(
    submissionId: number,
    isDocCheck: boolean
  ): Promise<Document[]> {
    let value = 0
    if (isDocCheck) {
      value = 1
    }
    const stmt = this.db.prepare(
      'SELECT * FROM documents WHERE submission_id = ? AND is_doc_check = ? ORDER BY id DESC'
    )
    return stmt.all(submissionId, value)
  }

  async deleteBySubmissionId(submissionId: number): Promise<void> {
    const stmt = this.db.prepare('DELETE FROM documents WHERE submission_id = ?')
    stmt.run(submissionId)
  }
}
