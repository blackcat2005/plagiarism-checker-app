import { BaseRepo } from './base.repo'
import { Sentence } from './entity'

export class SentenceRepo extends BaseRepo<Sentence> {
  constructor() {
    super('sentences')
  }

  async findByDocId(docId: number): Promise<Sentence[]> {
    const stmt = this.db.prepare('SELECT * FROM sentences WHERE doc_id = ?')
    return stmt.all(docId)
  }

  async findByPage(docId: number, page: string): Promise<Sentence[]> {
    const stmt = this.db.prepare('SELECT * FROM sentences WHERE doc_id = ? AND page = ?')
    return stmt.all(docId, page)
  }

  async bulkCreate(sentences: Partial<Sentence>[]): Promise<Sentence[]> {
    const stmt = this.db.prepare(
      `INSERT INTO sentences (id_in_doc, doc_id, page, split, text)
       VALUES (@id_in_doc, @doc_id, @page, @split, @text)`
    )

    const insertMany = this.db.transaction((sentences) => {
      return sentences.map((sentence) => stmt.run(sentence))
    })

    return insertMany(sentences)
  }

  async deleteBySubmissionId(submissionId: number): Promise<void> {
    const stmt = this.db.prepare(
      'DELETE FROM sentences WHERE doc_id IN (SELECT id FROM documents WHERE submission_id = ?)'
    )
    stmt.run(submissionId)
  }
}
