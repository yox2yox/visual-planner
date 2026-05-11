import type { GlossaryItem } from '../types'

export type GlossaryTextSegment =
  | { type: 'text'; text: string }
  | { type: 'glossary-link'; id: string; label: string }

const OPEN_PREFIX = '<a href="#glossary:'
const OPEN_SUFFIX = '">'
const CLOSE_TAG = '</a>'

export function parseGlossaryLinks(text: string, validIds: ReadonlySet<string>): GlossaryTextSegment[] {
  const segments: GlossaryTextSegment[] = []
  let cursor = 0

  while (cursor < text.length) {
    const openStart = text.indexOf(OPEN_PREFIX, cursor)
    if (openStart === -1) {
      appendText(segments, text.slice(cursor))
      break
    }

    appendText(segments, text.slice(cursor, openStart))

    const idStart = openStart + OPEN_PREFIX.length
    const idEnd = text.indexOf(OPEN_SUFFIX, idStart)
    if (idEnd === -1) {
      appendText(segments, text.slice(openStart))
      break
    }

    const labelStart = idEnd + OPEN_SUFFIX.length
    const closeStart = text.indexOf(CLOSE_TAG, labelStart)
    if (closeStart === -1) {
      appendText(segments, text.slice(openStart))
      break
    }

    const id = text.slice(idStart, idEnd)
    const label = text.slice(labelStart, closeStart)
    if (id && validIds.has(id)) {
      segments.push({ type: 'glossary-link', id, label })
    } else {
      appendText(segments, label)
    }

    cursor = closeStart + CLOSE_TAG.length
  }

  return segments
}

export function glossaryLinksToPlainText(text: string, validIds: ReadonlySet<string>): string {
  return parseGlossaryLinks(text, validIds)
    .map((segment) => (segment.type === 'glossary-link' ? segment.label : segment.text))
    .join('')
}

export function getGlossaryAncestorIds(id: string, items: GlossaryItem[]): string[] {
  const itemMap = new Map(items.map((item) => [item.id, item]))
  const ancestors: string[] = []
  const seen = new Set<string>([id])
  let current = itemMap.get(id)?.parentId

  while (current && itemMap.has(current) && !seen.has(current)) {
    ancestors.push(current)
    seen.add(current)
    current = itemMap.get(current)?.parentId
  }

  return ancestors
}

function appendText(segments: GlossaryTextSegment[], text: string) {
  if (!text) return
  const last = segments[segments.length - 1]
  if (last?.type === 'text') {
    last.text += text
  } else {
    segments.push({ type: 'text', text })
  }
}
