import type { Plan } from '../types'

// Normalize base64 from URL: handle URL-safe chars and URLSearchParams quirks
// - → +, _ → /, space → + (URLSearchParams decodes + as space), restore = padding
function fromUrlSafeBase64(encoded: string): string {
  let s = encoded.replace(/ /g, '+').replace(/-/g, '+').replace(/_/g, '/')
  const pad = (4 - (s.length % 4)) % 4
  s += '='.repeat(pad)
  return s
}

export function decodePlan(encoded: string): Plan {
  const normalized = fromUrlSafeBase64(encoded)
  const json = decodeURIComponent(escape(atob(normalized)))
  const parsed = JSON.parse(json) as unknown
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('Invalid plan JSON: expected an object')
  }
  return parsed as Plan
}
