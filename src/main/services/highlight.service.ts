import { ipcMain, shell, IpcMainEvent, dialog, BrowserWindow } from 'electron'
import { IPC_CHANNELS } from '../../shared/constants/ipc.channels'
import fs from 'fs'
import { PDFDocument, rgb } from 'pdf-lib'
import * as PDFJS from 'pdfjs-dist'
import type { TextItem, TextContent } from 'pdfjs-dist/types/src/display/api'

import LegacyWorker from 'pdfjs-dist/legacy/build/pdf.worker.min?url'

PDFJS.GlobalWorkerOptions.workerSrc = LegacyWorker

export default class HighlightService {
  static initialize(): void {
    // Initialize highlight service
    ipcMain.on(IPC_CHANNELS.MAIN.HIGHLIGHT, async (event, filePath, highlightData) => {
      await highlightPDFWithAdvancedSearch(filePath, highlightData, {
        ignoreCase: true,
        completeWords: false
      })
    })
  }
}

interface HighlightData {
  text: string
  sentenceId: number
  color?: [number, number, number] // RGB values 0-1
}

interface HighlightOptions {
  ignoreCase?: boolean
  completeWords?: boolean
}

interface Match {
  start: { idx: number; offset: number }
  end: { idx: number; offset: number }
  str: string
  data: HighlightData
}

// Sử dụng lại logic search từ thuật toán của bạn
function searchAndConvert(
  textContent: TextContent,
  data: HighlightData,
  options: HighlightOptions
): Match[] {
  if (!data?.text) return []

  const strs: string[] = []
  const textItems = textContent.items as TextItem[]

  // Build joined text (giống thuật toán gốc)
  for (const textItem of textItems) {
    if (textItem.hasEOL) {
      if (textItem.str.endsWith('-')) {
        const lastHyphen = textItem.str.lastIndexOf('-')
        strs.push(textItem.str.substring(0, lastHyphen))
      } else {
        strs.push(textItem.str, '\n')
      }
    } else {
      strs.push(textItem.str)
    }
  }

  const textJoined = strs.join('').replace(/\n/g, ' ')

  // Regex search
  const regexFlags = ['g']
  if (options.ignoreCase) regexFlags.push('i')

  let fquery = data.text.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  if (options.completeWords) fquery = `\\b${fquery}\\b`

  const regex = new RegExp(fquery, regexFlags.join(''))
  const matches: Match[] = []
  let match

  while ((match = regex.exec(textJoined)) !== null) {
    // Convert match positions back to text items (logic từ convertMatches)
    const convertedMatch = convertMatchToTextItems(match, textItems)
    if (convertedMatch) {
      matches.push({ ...convertedMatch, data })
    }
  }

  return matches
}

function convertMatchToTextItems(regexMatch: RegExpExecArray, textItems: TextItem[]) {
  function endOfLineOffset(item: TextItem) {
    if (item.hasEOL) {
      return item.str.endsWith('-') ? -1 : 1
    }
    return 0
  }

  let index = 0
  let tindex = 0
  const end = textItems.length - 1
  let mindex = regexMatch.index

  // Find start position
  while (index !== end && mindex >= tindex + textItems[index].str.length) {
    const item = textItems[index]
    tindex += item.str.length + endOfLineOffset(item)
    index++
  }

  const divStart = { idx: index, offset: mindex - tindex }
  mindex += regexMatch[0].length

  // Find end position
  while (index !== end && mindex > tindex + textItems[index].str.length) {
    const item = textItems[index]
    tindex += item.str.length + endOfLineOffset(item)
    index++
  }

  const divEnd = { idx: index, offset: mindex - tindex }

  return {
    start: divStart,
    end: divEnd,
    str: regexMatch[0]
  }
}

// Main highlight function
export async function highlightPDFWithAdvancedSearch(
  inputPath: string,
  highlightData: HighlightData[],
  options: HighlightOptions = { ignoreCase: true }
) {
  const pdfBytes = fs.readFileSync(inputPath, 'base64')
  const raw = atob(pdfBytes)
  const rawLength = raw.length
  const pdfBase64 = new Uint8Array(new ArrayBuffer(rawLength))

  for (let i = 0; i < rawLength; i++) {
    pdfBase64[i] = raw.charCodeAt(i)
  }
  const pdfjs = await PDFJS.getDocument({ data: pdfBase64 }).promise
  const pdfDoc = await PDFDocument.load(pdfBytes)

  console.log('total', pdfjs.numPages)
  for (let pageNum = 1; pageNum <= pdfjs.numPages; pageNum++) {
    const page = await pdfjs.getPage(pageNum)
    const viewport = page.getViewport({ scale: 1 })
    const textContent = await page.getTextContent()
    const pdfPage = pdfDoc.getPages()[pageNum - 1]

    // Find all matches for this page
    const allMatches: Match[] = []
    for (const data of highlightData) {
      const matches = searchAndConvert(textContent, data, options)
      allMatches.push(...matches)
    }

    // Draw highlights
    for (const match of allMatches) {
      const boxes = calculateBoundingBoxes(match, textContent.items as TextItem[], viewport.height)

      for (const box of boxes) {
        pdfPage.drawRectangle({
          x: box.x,
          y: box.y,
          width: box.width,
          height: box.height,
          color: rgb(1, 1, 0),
          opacity: 0.3
        })
      }
    }
  }
}

function calculateBoundingBoxes(match: Match, textItems: TextItem[], pageHeight: number) {
  const boxes: Array<{ x: number; y: number; width: number; height: number }> = []

  if (match.start.idx === match.end.idx) {
    // Single text item
    const item = textItems[match.start.idx]
    const transform = item.transform

    let charWidth = item.width / item.str.length

    if (isNaN(charWidth)) {
      charWidth = 0
    }

    boxes.push({
      x: transform[4] + match.start.offset * charWidth,
      y: transform[5],
      width: (match.end.offset - match.start.offset) * charWidth,
      height: item.height
    })
  } else {
    // Multiple text items
    for (let i = match.start.idx; i <= match.end.idx; i++) {
      const item = textItems[i]
      const transform = item.transform
      let startOffset = 0
      let endOffset = item.str.length

      if (i === match.start.idx) startOffset = match.start.offset
      if (i === match.end.idx) endOffset = match.end.offset

      let charWidth = item.width / item.str.length

      if (isNaN(charWidth)) {
        charWidth = 0
      }

      boxes.push({
        x: transform[4] + startOffset * charWidth,
        y: transform[5],
        width: (endOffset - startOffset) * charWidth,
        height: item.height
      })
    }
  }

  return boxes
}
