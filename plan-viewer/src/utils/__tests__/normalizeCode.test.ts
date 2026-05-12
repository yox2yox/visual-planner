import { describe, it, expect } from 'vitest'
import { normalizeCode } from '../normalizeCode'

describe('normalizeCode', () => {
  it('joins string[] with newlines', () => {
    expect(normalizeCode(['a', 'b', 'c'])).toBe('a\nb\nc')
  })

  it('trims leading and trailing blank lines', () => {
    expect(normalizeCode('\n\nfoo\nbar\n\n')).toBe('foo\nbar')
  })

  it('expands tabs to two spaces', () => {
    expect(normalizeCode('\tfoo')).toBe('foo')
    expect(normalizeCode('a\tb')).toBe('a  b')
  })

  it('dedents common leading whitespace', () => {
    const input = '    function foo() {\n      return 1\n    }'
    expect(normalizeCode(input)).toBe('function foo() {\n  return 1\n}')
  })

  it('ignores blank lines when computing common indent', () => {
    const input = '    a\n\n    b'
    expect(normalizeCode(input)).toBe('a\n\nb')
  })

  it('preserves inner alignment beyond common indent', () => {
    const input = '    foo(\n        a,\n        b,\n    )'
    expect(normalizeCode(input)).toBe('foo(\n    a,\n    b,\n)')
  })

  it('returns empty string for all-blank input', () => {
    expect(normalizeCode('\n\n  \n')).toBe('')
    expect(normalizeCode([])).toBe('')
  })

  it('leaves zero-indent input unchanged', () => {
    expect(normalizeCode('foo\n  bar')).toBe('foo\n  bar')
  })

  it('normalizes CRLF and CR line endings', () => {
    expect(normalizeCode('a\r\nb\r\nc')).toBe('a\nb\nc')
    expect(normalizeCode('a\rb\rc')).toBe('a\nb\nc')
  })

  it('does not leave CR artifacts when dedenting CRLF input', () => {
    expect(normalizeCode('    foo\r\n    bar')).toBe('foo\nbar')
  })
})
