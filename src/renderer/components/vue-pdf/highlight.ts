import type { TextItem } from 'pdfjs-dist/types/src/display/api'
import type { TextContent } from 'pdfjs-dist/types/src/display/text_layer'
import type { HighlightOptions, Match, HighlightData } from './types'

interface InternalMatch {
  index: number
  length: number
  str: string
  data: HighlightData
}

function searchQuery(textContent: TextContent, data: HighlightData, options: HighlightOptions) {
  if (!data || data.text === undefined || data.text === '') {
    return []
  }
  const query = data.text
  const strs: string[] = []
  for (const textItem of textContent.items as TextItem[]) {
    if (textItem.hasEOL) {
      // Remove the break line hyphen in the middle of the sentence
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

  // Join the text as is presented in textlayer and then replace newlines (/n) with whitespaces
  const textJoined = strs.join('').replace(/\n/g, ' ')

  const regexFlags = ['g']
  if (options.ignoreCase) regexFlags.push('i')

  // Trim the query and escape all regex special characters
  let fquery = query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  if (options.completeWords) fquery = `\\b${fquery}\\b`

  const regex = new RegExp(fquery, regexFlags.join(''))

  const matches: InternalMatch[] = []
  let match

  while ((match = regex.exec(textJoined)) !== null) {
    const matchConvert: InternalMatch = {
      index: match.index,
      length: match[0].length,
      str: match[0],
      data: data
    }
    matches.push(matchConvert)
  }

  return matches
}

function convertMatches(matches: InternalMatch[], textContent: TextContent): Match[] {
  function endOfLineOffset(item: TextItem) {
    // When textitem has a EOL flag and the string has a hyphen at the end
    // the hyphen should be removed (-1 len) so the sentence could be searched as a joined one.
    // In other cases the EOL flag introduce a whitespace (+1 len) between two different sentences
    if (item.hasEOL) {
      if (item.str.endsWith('-')) return -1
      else return 1
    }
    return 0
  }

  let index = 0
  let tindex = 0
  const textItems = textContent.items as TextItem[]
  const end = textItems.length - 1

  const convertedMatches: Match[] = []

  // iterate over all matches
  for (let m = 0; m < matches.length; m++) {
    let mindex = matches[m].index as number

    while (index !== end && mindex >= tindex + textItems[index].str.length) {
      const item = textItems[index]
      tindex += item.str.length + endOfLineOffset(item)
      index++
    }

    const divStart = {
      idx: index,
      offset: mindex - tindex
    }

    mindex += matches[m].length as number

    while (index !== end && mindex > tindex + textItems[index].str.length) {
      const item = textItems[index]
      tindex += item.str.length + endOfLineOffset(item)
      index++
    }

    const divEnd = {
      idx: index,
      offset: mindex - tindex
    }
    convertedMatches.push({
      start: divStart,
      end: divEnd,
      str: matches[m].str as string,
      oindex: matches[m].index as number,
      data: matches[m].data
    })
  }
  return convertedMatches
}

function highlightMatches(
  matches: Match[],
  textContent: TextContent,
  textDivs: HTMLElement[],
  callback?: (...args) => void
) {
  function appendHighlightDiv(idx: number, startOffset = -1, endOffset = -1, data: HighlightData) {
    const textItem = textContent.items[idx] as TextItem
    const nodes: Node[] = []

    let content = ''
    let prevContent = ''
    let nextContent = ''

    let div = textDivs[idx]

    if (!div) return // don't process if div is undefinied

    if (div.nodeType === Node.TEXT_NODE) {
      const span = document.createElement('span')
      div.before(span)
      span.append(div)
      textDivs[idx] = span
      div = span
    }

    if (startOffset >= 0 && endOffset >= 0) content = textItem.str.substring(startOffset, endOffset)
    else if (startOffset < 0 && endOffset < 0) content = textItem.str
    else if (startOffset >= 0) content = textItem.str.substring(startOffset)
    else if (endOffset >= 0) content = textItem.str.substring(0, endOffset)

    const node = document.createTextNode(content)
    const span = document.createElement('span')
    span.className = 'highlight appended'
    span.setAttribute('data-sentence-id', data.sentenceId.toString())
    if (callback) {
      span.addEventListener('click', (e) => {
        e.stopPropagation()
        callback(e, data.sentenceId)
      })
    }
    span.append(node)

    nodes.push(span)

    if (startOffset > 0) {
      if (div.childNodes.length === 1 && div.childNodes[0].nodeType === Node.TEXT_NODE) {
        prevContent = textItem.str.substring(0, startOffset)
        const node = document.createTextNode(prevContent)
        nodes.unshift(node)
      } else {
        let alength = 0
        const prevNodes: Node[] = []
        for (const childNode of Array.from(div.childNodes)) {
          const textValue =
            childNode.nodeType === Node.TEXT_NODE
              ? childNode.nodeValue!
              : childNode.firstChild!.nodeValue!
          alength += textValue.length

          if (alength <= startOffset) prevNodes.push(childNode)
          else if (startOffset >= alength - textValue.length && endOffset <= alength)
            prevNodes.push(
              document.createTextNode(
                textValue.substring(0, startOffset - (alength - textValue.length))
              )
            )
        }
        nodes.unshift(...prevNodes)
      }
    }
    if (endOffset > 0) {
      nextContent = textItem.str.substring(endOffset)
      const node = document.createTextNode(nextContent)
      nodes.push(node)
    }

    div.replaceChildren(...nodes)
  }

  for (const match of matches) {
    if (match.start.idx === match.end.idx) {
      appendHighlightDiv(match.start.idx, match.start.offset, match.end.offset, match.data)
    } else {
      for (let si = match.start.idx, ei = match.end.idx; si <= ei; si++) {
        if (si === match.start.idx) appendHighlightDiv(si, match.start.offset, -1, match.data)
        else if (si === match.end.idx) appendHighlightDiv(si, -1, match.end.offset, match.data)
        else appendHighlightDiv(si, -1, -1, match.data)
      }
    }
  }
}

function resetDivs(textContent: TextContent, textDivs: HTMLElement[]) {
  const textItems = textContent.items.map((val) => (val as TextItem).str)
  for (let idx = 0; idx < textDivs.length; idx++) {
    const div = textDivs[idx]

    if (div && div.nodeType !== Node.TEXT_NODE) {
      const textNode = document.createTextNode(textItems[idx])
      div.replaceChildren(textNode)
    }
  }
}

function findMatches(
  highlightData: HighlightData[],
  textContent: TextContent,
  options: HighlightOptions
) {
  const convertedMatches: Match[] = []

  for (const data of highlightData) {
    const matches = searchQuery(textContent, data, options)
    convertedMatches.push(...convertMatches(matches, textContent))
  }
  return convertedMatches
}

export { findMatches, highlightMatches, resetDivs }
