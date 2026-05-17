import { describe, it, expect } from 'vitest'
import { validate, escapeForScriptTag, embedPlan } from '../make_plan.mjs'

function makePlan(overrides = {}) {
  return {
    title: 't',
    description: 'd',
    glossary: [
      { id: 'a', type: 'client', name: 'A', icon: '💻' },
      { id: 'b', type: 'server', name: 'B', icon: '🖥️' },
    ],
    pairs: [{ title: 'P' }],
    ...overrides,
  }
}

const okEdge = { order: 1, source: 'a', target: 'b', label: 'calls', data: 'X' }

function withProposedDiagram(extra = {}) {
  return makePlan({
    pairs: [
      {
        title: 'P',
        examples: [
          { title: 'E', proposedState: { architectureDiagram: [okEdge] } },
        ],
        ...extra,
      },
    ],
  })
}

describe('validate (make_plan.mjs)', () => {
  it('accepts a plan using the new pairs (Concern[]) format', () => {
    expect(() => validate(withProposedDiagram())).not.toThrow()
  })

  it('accepts a concern with neither examples nor takeaway (viewer will filter)', () => {
    const plan = makePlan({ pairs: [{ title: 'empty' }] })
    expect(() => validate(plan)).not.toThrow()
  })

  it('rejects when pairs is not an array', () => {
    const plan = makePlan({ pairs: { title: 'P' } })
    expect(() => validate(plan)).toThrow(/pairs.*array/i)
  })

  it('rejects an empty pairs array', () => {
    const plan = makePlan({ pairs: [] })
    expect(() => validate(plan)).toThrow(/fewer than 1 items/)
  })

  it('rejects when pairs[i].title is not a string', () => {
    const plan = makePlan({
      pairs: [{ title: 123 }],
    })
    expect(() => validate(plan)).toThrow(/\/pairs\/0\/title.*must be string/)
  })

  it('rejects when top-level currentState is provided (legacy format removed)', () => {
    const plan = makePlan({
      currentState: { architectureDiagram: [okEdge] },
    })
    expect(() => validate(plan)).toThrow(/additional propert|must NOT have/i)
  })

  it('rejects when example.currentState.architectureDiagram[j].source is unknown (path in error)', () => {
    const plan = makePlan({
      pairs: [
        {
          title: 'P',
          examples: [
            {
              title: 'E',
              currentState: {
                architectureDiagram: [
                  { order: 1, source: 'ghost', target: 'b', label: 'x', data: 'y' },
                ],
              },
            },
          ],
        },
      ],
    })
    expect(() => validate(plan)).toThrow(
      /pairs\[0\]\.examples\[0\]\.currentState\.architectureDiagram\[0\]\.source/,
    )
  })

  it('rejects when example.proposedState.architectureDiagram[j].target is unknown', () => {
    const plan = makePlan({
      pairs: [
        {
          title: 'P',
          examples: [
            {
              title: 'E',
              proposedState: {
                architectureDiagram: [
                  { order: 1, source: 'a', target: 'ghost', label: 'x', data: 'y' },
                ],
              },
            },
          ],
        },
      ],
    })
    expect(() => validate(plan)).toThrow(
      /pairs\[0\]\.examples\[0\]\.proposedState\.architectureDiagram\[0\]\.target/,
    )
  })

  it('rejects when architecture edges are not numbered consecutively from 1', () => {
    const plan = makePlan({
      pairs: [
        {
          title: 'P',
          examples: [
            {
              title: 'E',
              proposedState: {
                architectureDiagram: [
                  { order: 2, source: 'a', target: 'b', label: 'calls', data: 'X' },
                ],
              },
            },
          ],
        },
      ],
    })
    expect(() => validate(plan)).toThrow(
      /proposedState\.architectureDiagram\[0\]\.order:.*must be 1/,
    )
  })

  it('accepts kaisetsu narrative fields with evidence and scene edge links', () => {
    const plan = makePlan({
      metaphor: { title: '受付カウンター', description: '係員の受け渡しとして読む' },
      takeaway: '受付係が確認して案内係へ渡すだけ。',
      glossary: [
        {
          id: 'a',
          type: 'client',
          name: 'A',
          icon: '🛎️',
          analogy: '入口のカウンター',
          responsibility: '依頼を受け付ける',
          evidence: [{ path: 'src/a.ts', startLine: 1 }],
        },
        { id: 'b', type: 'server', name: 'B', icon: '🧑‍💼' },
      ],
      pairs: [
        {
          title: '受付',
          safeguards: ['番号札がない依頼は受け付けない'],
          takeaway: '番号札で迷子を防ぐ。',
          examples: [
            {
              title: '通常受付',
              condition: '依頼者がカウンターに来る',
              proposedState: {
                architectureDiagram: [okEdge],
                storyTitle: '受付の流れ',
                scenes: [
                  {
                    title: '場面1: 受付係が依頼を受ける',
                    actor: 'a',
                    action: '受付係が依頼内容を確認して、案内係へ番号札を渡す。',
                    result: '案内係は次に何をすればよいか分かる。',
                    edgeRefs: [1],
                    evidence: [{ path: 'src/flow.ts', startLine: 3, endLine: 8 }],
                  },
                ],
                takeaway: '番号札で迷子を防ぐ。',
              },
            },
          ],
        },
      ],
    })
    expect(() => validate(plan)).not.toThrow()
  })

  it('rejects scenes that reference unknown architecture edge numbers', () => {
    const plan = makePlan({
      pairs: [
        {
          title: 'P',
          examples: [
            {
              title: 'E',
              proposedState: {
                architectureDiagram: [okEdge],
                scenes: [
                  {
                    title: '場面1',
                    action: '受付係が存在しない手順を説明してしまう。',
                    edgeRefs: [2],
                  },
                ],
              },
            },
          ],
        },
      ],
    })
    expect(() => validate(plan)).toThrow(
      /pairs\[0\]\.examples\[0\]\.proposedState\.scenes\[0\]\.edgeRefs\[0\]/,
    )
  })

  it('rejects scenes whose actor is not in the glossary', () => {
    const plan = makePlan({
      pairs: [
        {
          title: 'P',
          examples: [
            {
              title: 'E',
              proposedState: {
                architectureDiagram: [okEdge],
                scenes: [
                  {
                    title: '場面1',
                    actor: 'ghost',
                    action: '知らない係が急に登場してしまう。',
                  },
                ],
              },
            },
          ],
        },
      ],
    })
    expect(() => validate(plan)).toThrow(
      /pairs\[0\]\.examples\[0\]\.proposedState\.scenes\[0\]\.actor/,
    )
  })

  it('accepts evidence with only a label (path is optional in new schema)', () => {
    const plan = makePlan({
      glossary: [
        { id: 'a', type: 'client', name: 'A', icon: '💻', evidence: [{ label: 'planned' }] },
        { id: 'b', type: 'server', name: 'B', icon: '🖥️' },
      ],
    })
    expect(() => validate(plan)).not.toThrow()
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
    const parsed = JSON.parse(m[1])
    expect(parsed).toEqual(plan)
  })

  it('handles plans containing "</script>" without breaking HTML parsing', () => {
    const plan = makePlan({ description: 'dangerous </script><img>' })
    const out = embedPlan(viewerHtml, plan)
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
