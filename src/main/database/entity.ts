export interface User {
  id?: number
  username: string
}

export interface Submission {
  id?: number
  name: string
  type: number
  status: number
  document_count: number
  result_path?: string
  user_id: number
}

export interface Document {
  id?: number
  name: string
  submission_id: number
  is_doc_check: number
}

export interface Sentence {
  id?: number
  id_in_doc: number
  doc_id: number
  page?: string
  split?: number
  text?: string
}
