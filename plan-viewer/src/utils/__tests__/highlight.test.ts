import { describe, it, expect } from 'vitest'
import { highlight } from '../highlight'

describe('highlight', () => {
  it('returns escaped html and null language when language is omitted', () => {
    const r = highlight('a<b>&c')
    expect(r.language).toBeNull()
    expect(r.html).toBe('a&lt;b&gt;&amp;c')
  })

  it('returns escaped html when language is unknown', () => {
    const r = highlight('a<b>', 'made-up-lang')
    expect(r.language).toBeNull()
    expect(r.html).toBe('a&lt;b&gt;')
  })

  it('resolves ts alias to typescript and highlights', () => {
    const r = highlight('const x: number = 1', 'ts')
    expect(r.language).toBe('typescript')
    expect(r.html).toContain('token')
    expect(r.html).toContain('const')
  })

  it('resolves react alias to jsx', () => {
    const r = highlight('<App/>', 'react')
    expect(r.language).toBe('jsx')
    expect(r.html).toContain('token')
  })

  it('highlights kotlin / php / go / yaml / python / vue (markup)', () => {
    expect(highlight('fun main() {}', 'kotlin').language).toBe('kotlin')
    expect(highlight('<?php echo 1;', 'php').language).toBe('php')
    expect(highlight('package main', 'go').language).toBe('go')
    expect(highlight('key: value', 'yaml').language).toBe('yaml')
    expect(highlight('def f(): pass', 'python').language).toBe('python')
    expect(highlight('<template><div/></template>', 'vue').language).toBe('markup')
  })

  it('does not produce raw < or > outside escaped sequences for plain text', () => {
    const r = highlight('a<b>')
    expect(r.html).not.toMatch(/<b>/)
  })

  it('treats language as case-insensitive', () => {
    expect(highlight('x', 'TS').language).toBe('typescript')
    expect(highlight('x', 'Python').language).toBe('python')
  })
})
