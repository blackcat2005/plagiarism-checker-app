import * as PDFJS from 'pdfjs-dist'

import LegacyWorker from 'pdfjs-dist/legacy/build/pdf.worker.min?url'
import { TextItem, TextMarkedContent } from 'pdfjs-dist/types/src/display/api'

PDFJS.GlobalWorkerOptions.workerSrc = LegacyWorker

type Lines = {
  text: string
  y: number
  height: number
}

type DocChunk = {
  text: string
  yTop: number
  page: number
}

type SentenceSplit = {
  position: number
  fromPage: number
  toPage: number
}

type Sentence = {
  id: number
  text: string
  page: number
  pages: number[]
  splits: SentenceSplit[]
}

export class PDFTextProcessor {
  static DEFAULTS = {
    headerRatio: 0.07,
    footerRatio: 0.07,
    yMergeSlack: 0.25,
    eosPattern: /[.!?…。．！？]+$/,
    splitPattern: /(?<!\w\.\w.)(?<![A-Z][a-z]\.)(?<=\.|\?|!:)\s+|\p{Cc}+|\p{Cf}+/gmu,
    minWords: 8,
    skipSections: {
      titlePage: [/^mục\s+lục$/i, /^lời\s+cảm\s+ơn$/i, /^tài\s+liệu\s+tham\s+khảo$/i],
      skipFirstPages: 0,
      skipLastPages: 0,
      contentStart: [/^chương\s+\d+/i, /^phần\s+\d+/i, /^giới\s+thiệu$/i, /^đặt\s+vấn\s+đề$/i]
    }
  }

  static isLowerCaseStart = (txt) => /^[a-zà-ỹ]/u.test(txt.trim())

  static endsWithSentenceBreak = (txt, eosPattern = this.DEFAULTS.eosPattern) =>
    eosPattern.test(txt.trim())

  static countWords = (text) => text.trim().split(/\s+/).length

  static isSkipSectionTitle = (text, patterns) => {
    const normalizedText = text.trim().toLowerCase()
    return patterns.some((pattern) => pattern.test(normalizedText))
  }

  static groupToLines: (items: TextItem[], slack?: number) => Lines[] = (
    items: TextItem[],
    slack = 2
  ) => {
    const linesMap = new Map<number, TextItem[]>()
    items.forEach((it) => {
      const y = (it as TextItem).transform[5]
      const key = Math.round(y / slack) * slack
      const arr = linesMap.get(key) ?? []
      arr.push(it)
      linesMap.set(key, arr)
    })

    return [...linesMap.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([, item]) => {
        item.sort((g1, g2) => g1.transform[4] - g2.transform[4])
        const txt = item.map((g) => g.str).join('')
        const rect = item[0] // Do tat ca items co cung y
        return { text: txt, y: rect.transform[5], height: Math.abs(rect.transform[3]) }
      })
  }

  static groupToChunks = (lines: Lines[], ySlackRatio = this.DEFAULTS.yMergeSlack) => {
    const chunks: Lines[][] = []
    let current: Lines[] = []

    lines.forEach((ln, idx) => {
      if (idx === 0) {
        current.push(ln)
        return
      }

      const prevLn = lines[idx - 1]
      const yDistance = Math.abs(prevLn.y - ln.y)
      const threshold = prevLn.height * (1 + ySlackRatio)

      if (yDistance <= threshold) {
        current.push(ln)
      } else {
        chunks.push(current)
        current = [ln]
      }
    })

    if (current.length) chunks.push(current)

    return chunks.map((linesInChunk) => ({
      text: linesInChunk.map((l) => l.text).join(' '),
      yTop: linesInChunk[0].y
    }))
  }

  static splitIntoSentences = (chunkText, pageInfo, splitter = this.DEFAULTS.splitPattern) => {
    const sentences = chunkText
      .trim()
      .split(splitter)
      .map((s) => s.trim())
      .filter(Boolean)

    return sentences.map((sent) => ({
      text: sent,
      pages: [...pageInfo] // Khởi tạo với page hiện tại
    }))
  }

  static async process(pdfSource, cfg = {}) {
    const opt = { ...this.DEFAULTS, ...cfg }
    const pdf = await PDFJS.getDocument(pdfSource).promise
    const pages = pdf.numPages
    const docChunks: DocChunk[] = []
    let sentenceId = 1

    const skipPages = new Set()

    for (let i = 1; i <= opt.skipSections.skipFirstPages; i++) {
      skipPages.add(i)
    }
    for (let i = 0; i < opt.skipSections.skipLastPages; i++) {
      skipPages.add(pages - i)
    }

    let currentlySkipping = false

    for (let p = 1; p <= pages; p++) {
      if (skipPages.has(p)) continue

      const page = await pdf.getPage(p)
      const viewport = page.getViewport({ scale: 1 })
      const vHeight = viewport.height
      const { items } = await page.getTextContent()
      const filtered: TextItem[] = items.filter((it): it is TextItem => {
        // loc text item bo qua begin marked content
        if ('transform' in it && it.transform !== null) {
          const y = it.transform[5]
          return y < vHeight * (1 - opt.footerRatio) && y > vHeight * opt.headerRatio
        }
        return false
      })

      const lines = this.groupToLines(filtered)
      if (lines.length === 0) continue // Bỏ qua trang không có nội dung
      const chunks = this.groupToChunks(lines, opt.yMergeSlack)
      const firstChunk = chunks[0]

      if (
        opt.skipSections.contentStart.some((pattern) =>
          pattern.test(firstChunk.text.trim().toLowerCase())
        )
      ) {
        currentlySkipping = false
      }

      if (
        currentlySkipping ||
        this.isSkipSectionTitle(firstChunk.text, opt.skipSections.titlePage)
      ) {
        currentlySkipping = true
        skipPages.add(p)
      }

      if (!currentlySkipping) {
        chunks.forEach((c) =>
          docChunks.push({
            ...c,
            page: p
          })
        )
      }
    }

    const sentences: Sentence[] = []
    let currentSentence: Sentence | null = null
    sentenceId = 1

    for (let i = 0; i < docChunks.length; i++) {
      const chunk = docChunks[i]
      const pageInfo = [chunk.page]

      // Sử dụng splitIntoSentences để tách chunk thành các câu
      const chunkSentences = this.splitIntoSentences(chunk.text, pageInfo)

      for (const sent of chunkSentences) {
        if (
          currentSentence &&
          !this.endsWithSentenceBreak(currentSentence.text) &&
          this.isLowerCaseStart(sent.text)
        ) {
          // Câu bị vắt trang
          const splitPosition = currentSentence.text.length
          currentSentence.text += ' ' + sent.text
          currentSentence.splits.push({
            position: splitPosition,
            fromPage: currentSentence.page,
            toPage: chunk.page
          })
          currentSentence.pages = [...currentSentence.pages, ...sent.pages]
        } else {
          // Lưu câu cũ nếu có
          if (currentSentence && this.countWords(currentSentence.text) >= this.DEFAULTS.minWords) {
            sentences.push({
              id: sentenceId++,
              text: currentSentence.text,
              page: currentSentence.page,
              pages: currentSentence.pages,
              splits: currentSentence.splits
            })
          }
          // Bắt đầu câu mới
          currentSentence = {
            text: sent.text,
            page: chunk.page,
            pages: sent.pages,
            splits: []
          }
        }
      }
    }

    // Xử lý câu cuối cùng
    if (currentSentence && this.countWords(currentSentence.text) >= this.DEFAULTS.minWords) {
      sentences.push({
        id: sentenceId++,
        text: currentSentence.text,
        page: currentSentence.page,
        pages: currentSentence.pages,
        splits: currentSentence.splits
      })
    }

    return sentences
  }
}
