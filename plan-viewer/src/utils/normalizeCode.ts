export function normalizeCode(code: string | string[]): string {
  const joined = Array.isArray(code) ? code.join('\n') : code
  const normalizedEol = joined.replace(/\r\n?/g, '\n')
  const tabExpanded = normalizedEol.replace(/\t/g, '  ')
  const lines = tabExpanded.split('\n')

  let start = 0
  let end = lines.length
  while (start < end && lines[start].trim() === '') start++
  while (end > start && lines[end - 1].trim() === '') end--
  const trimmed = lines.slice(start, end)
  if (trimmed.length === 0) return ''

  let commonIndent = Infinity
  for (const line of trimmed) {
    if (line.trim() === '') continue
    const match = line.match(/^ */)
    const indent = match ? match[0].length : 0
    if (indent < commonIndent) commonIndent = indent
    if (commonIndent === 0) break
  }
  if (!Number.isFinite(commonIndent) || commonIndent === 0) {
    return trimmed.join('\n')
  }

  return trimmed.map((line) => (line.length >= commonIndent ? line.slice(commonIndent) : line)).join('\n')
}
