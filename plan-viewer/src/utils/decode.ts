import type { Plan } from '../types'

// URL-safe base64 (RFC 4648): - → +, _ → /
function fromUrlSafeBase64(encoded: string): string {
  return encoded.replace(/-/g, '+').replace(/_/g, '/')
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
