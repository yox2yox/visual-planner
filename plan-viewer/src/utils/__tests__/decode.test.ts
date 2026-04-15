import { describe, it, expect } from 'vitest'
import { decodePlan } from '../decode'

// URL-safe base64: + → -, / → _, = を除去
function encode(obj: unknown): string {
  const json = JSON.stringify(obj)
  return btoa(unescape(encodeURIComponent(json)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

describe('decodePlan', () => {
  it('decodes a valid base64 encoded plan', () => {
    const plan = {
      title: 'Test',
      description: 'desc',
      glossary: [],
    }
    const encoded = encode(plan)
    const result = decodePlan(encoded)
    expect(result.title).toBe('Test')
    expect(result.description).toBe('desc')
  })

  it('handles Japanese characters', () => {
    const plan = {
      title: '日本語タイトル',
      description: '説明文',
      glossary: [],
    }
    const encoded = encode(plan)
    const result = decodePlan(encoded)
    expect(result.title).toBe('日本語タイトル')
  })

  it('throws on invalid base64', () => {
    expect(() => decodePlan('!!!not-base64!!!')).toThrow()
  })

  it('throws on non-object JSON', () => {
    const encoded = btoa('"just a string"')
    expect(() => decodePlan(encoded)).toThrow('Invalid plan JSON')
  })
})
