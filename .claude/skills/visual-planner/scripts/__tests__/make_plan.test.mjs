import { describe, it, expect } from 'vitest'
import { validate, escapeForScriptTag, embedPlan } from '../make_plan.mjs'

function makePlan(overrides = {}) {
  return {
    title: 't',
    glossary: [
      { id: 'a', type: 'feature', name: 'A' },
      { id: 'b', type: 'feature', name: 'B' },
    ],
    ...overrides,
  }
}

const okEdge = { source: 'a', target: 'b', label: 'calls', data: 'X' }

describe('validate (make_plan.mjs)', () => {
  it('accepts a plan using the legacy currentState/proposedState', () => {
    const plan = makePlan({
      currentState: { interactions: [okEdge] },
      proposedState: { interactions: [okEdge] },
    })
    expect(() => validate(plan)).not.toThrow()
  })

  it('accepts a plan using the new pairs format', () => {
    const plan = makePlan({
      pairs: [
        { title: 'P1', currentState: { interactions: [okEdge] } },
        { title: '', proposedState: { interactions: [okEdge] } },
      ],
    })
    expect(() => validate(plan)).not.toThrow()
  })

  it('accepts a pair with neither currentState nor proposedState (viewer will filter)', () => {
    const plan = makePlan({
      pairs: [{ title: 'empty' }],
    })
    expect(() => validate(plan)).not.toThrow()
  })

  it('rejects when pairs is not an array', () => {
    const plan = makePlan({ pairs: { title: 'P' } })
    expect(() => validate(plan)).toThrow(/pairs.*array/i)
  })

  it('rejects an empty pairs array', () => {
    const plan = makePlan({ pairs: [] })
    expect(() => validate(plan)).toThrow(/empty/i)
  })

  it('rejects when pairs[i].title is not a string', () => {
    const plan = makePlan({
      pairs: [{ title: 123, proposedState: { interactions: [okEdge] } }],
    })
    expect(() => validate(plan)).toThrow(/pairs\[0\]\.title.*string/)
  })

  it('rejects when pairs and top-level currentState are both provided', () => {
    const plan = makePlan({
      currentState: { interactions: [okEdge] },
      pairs: [{ title: 'P', proposedState: { interactions: [okEdge] } }],
    })
    expect(() => validate(plan)).toThrow(/both.*pairs/i)
  })

  it('rejects when pairs[i].currentState.interactions[j].source is unknown (with path in error)', () => {
    const plan = makePlan({
      pairs: [
        {
          title: 'P',
          currentState: {
            interactions: [{ source: 'ghost', target: 'b', label: 'x', data: 'y' }],
          },
        },
      ],
    })
    expect(() => validate(plan)).toThrow(/pairs\[0\]\.currentState\.interactions\[0\]\.source/)
  })

  it('rejects when pairs[i].proposedState.interactions[j].target is unknown (with path in error)', () => {
    const plan = makePlan({
      pairs: [
        {
          title: 'P',
          proposedState: {
            interactions: [{ source: 'a', target: 'ghost', label: 'x', data: 'y' }],
          },
        },
      ],
    })
    expect(() => validate(plan)).toThrow(/pairs\[0\]\.proposedState\.interactions\[0\]\.target/)
  })
})

describe('escapeForScriptTag', () => {
  it('escapes "<" so "</script>" cannot terminate the host script', () => {
    const escaped = escapeForScriptTag('{"x":"</script>"}')
    expect(escaped).not.toMatch(/<\/script/i)
    expect(escaped).toContain('\\u003c/script>')
  })

  it('escapes U+2028 and U+2029', () => {
    const LS = String.fromCharCode(0x2028)
    const PS = String.fromCharCode(0x2029)
    const escaped = escapeForScriptTag(`"${LS}${PS}"`)
    expect(escaped).toContain('\\u2028')
    expect(escaped).toContain('\\u2029')
    expect(escaped).not.toContain(LS)
    expect(escaped).not.toContain(PS)
  })

  it('leaves ordinary content intact', () => {
    const input = '{"title":"Hello","n":42}'
    expect(escapeForScriptTag(input)).toBe(input)
  })
})

describe('embedPlan', () => {
  const viewerHtml =
    '<!doctype html><html><body>' +
    '<script id="plan-data" type="application/json"></script>' +
    '<div id="app"></div></body></html>'

  it('injects the plan JSON into the placeholder script tag', () => {
    const plan = makePlan()
    const out = embedPlan(viewerHtml, plan)
    const m = out.match(
      /<script id="plan-data" type="application\/json">([\s\S]*?)<\/script>/,
    )
    expect(m).not.toBeNull()
    // The injected content must parse back to the original plan (after unescaping
    // < etc. — JSON.parse handles those natively).
    const parsed = JSON.parse(m[1])
    expect(parsed).toEqual(plan)
  })

  it('handles plans containing "</script>" without breaking HTML parsing', () => {
    const plan = makePlan({ description: 'dangerous </script><img>' })
    const out = embedPlan(viewerHtml, plan)
    // Only one closing </script> remains (the placeholder's own closer); the
    // content-bearing occurrence must be escaped.
    const closers = out.match(/<\/script>/gi) ?? []
    expect(closers.length).toBe(1)
    const m = out.match(
      /<script id="plan-data" type="application\/json">([\s\S]*?)<\/script>/,
    )
    const parsed = JSON.parse(m[1])
    expect(parsed.description).toBe('dangerous </script><img>')
  })

  it('throws when the placeholder is missing', () => {
    expect(() => embedPlan('<html><body>no placeholder</body></html>', makePlan())).toThrow(
      /plan-data/,
    )
  })

  it('replaces existing inlined content on re-embed (idempotent output)', () => {
    const plan1 = makePlan({ title: 'first' })
    const plan2 = makePlan({ title: 'second' })
    const once = embedPlan(viewerHtml, plan1)
    const twice = embedPlan(once, plan2)
    const m = twice.match(
      /<script id="plan-data" type="application\/json">([\s\S]*?)<\/script>/,
    )
    expect(JSON.parse(m[1]).title).toBe('second')
  })
})
