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

const okEdge = { flow: 1, source: 'a', target: 'b', label: 'calls', data: 'X' }

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
            interactions: [{ flow: 1, source: 'ghost', target: 'b', label: 'x', data: 'y' }],
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
            interactions: [{ flow: 1, source: 'a', target: 'ghost', label: 'x', data: 'y' }],
          },
        },
      ],
    })
    expect(() => validate(plan)).toThrow(/pairs\[0\]\.proposedState\.interactions\[0\]\.target/)
  })

  it('rejects when interactions are not numbered consecutively from 1', () => {
    const plan = makePlan({
      proposedState: {
        interactions: [
          { flow: 2, source: 'a', target: 'b', label: 'calls', data: 'X' },
        ],
      },
    })
    expect(() => validate(plan)).toThrow(/proposedState\.interactions\[0\]\.flow must be 1/)
  })

  it('accepts kaisetsu narrative fields with evidence and scene flow links', () => {
    const plan = makePlan({
      metaphor: { title: '受付カウンター', description: '係員の受け渡しとして読む' },
      takeaway: '受付係が確認して案内係へ渡すだけ。',
      evidence: [{ path: 'src/app.ts', startLine: 10, endLine: 20 }],
      glossary: [
        {
          id: 'a',
          type: 'feature',
          name: 'A',
          persona: '受付係',
          analogy: '入口のカウンター',
          responsibility: '依頼を受け付ける',
          evidence: [{ path: 'src/a.ts', startLine: 1 }],
        },
        { id: 'b', type: 'feature', name: 'B', persona: '案内係' },
      ],
      pairs: [
        {
          title: '受付',
          comparison: [{ label: '渡し方', current: '手渡し', proposed: '番号札', note: '追跡しやすい' }],
          safeguards: ['番号札がない依頼は受け付けない'],
          evidence: [{ path: 'src/flow.ts' }],
          proposedState: {
            interactions: [okEdge],
            storyTitle: '受付の流れ',
            scenes: [
              {
                title: '場面1: 受付係が依頼を受ける',
                actor: 'a',
                action: '受付係が依頼内容を確認して、案内係へ番号札を渡す。',
                result: '案内係は次に何をすればよいか分かる。',
                interactionFlows: [1],
                evidence: [{ path: 'src/flow.ts', startLine: 3, endLine: 8 }],
              },
            ],
            takeaway: '番号札で迷子を防ぐ。',
          },
        },
      ],
    })
    expect(() => validate(plan)).not.toThrow()
  })

  it('rejects scenes that reference unknown flow numbers', () => {
    const plan = makePlan({
      proposedState: {
        interactions: [okEdge],
        scenes: [
          {
            title: '場面1',
            action: '受付係が存在しない手順を説明してしまう。',
            interactionFlows: [2],
          },
        ],
      },
    })
    expect(() => validate(plan)).toThrow(/scenes\[0\]\.interactionFlows\[0\]/)
  })

  it('rejects scenes whose actor is not in the glossary', () => {
    const plan = makePlan({
      proposedState: {
        interactions: [okEdge],
        scenes: [
          {
            title: '場面1',
            actor: 'ghost',
            action: '知らない係が急に登場してしまう。',
          },
        ],
      },
    })
    expect(() => validate(plan)).toThrow(/scenes\[0\]\.actor/)
  })

  it('rejects evidence without a path', () => {
    const plan = makePlan({
      evidence: [{ label: 'missing path' }],
    })
    expect(() => validate(plan)).toThrow(/plan\.evidence\[0\]\.path/)
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
