// zod による Plan スキーマ定義。
// JSON Schema (reference/plan.schema.json) では表現しきれない参照整合性は、
// このファイルの後半に `validateReferences` として実装する（後続ステップで追加）。
//
// この段階では葉ノード相当の型のみを定義する。

import { z } from 'zod'

export const EvidenceRef = z
  .object({
    path: z.string().min(1),
    startLine: z.number().int().min(1).optional(),
    endLine: z.number().int().min(1).optional(),
    label: z.string().optional(),
  })
  .strict()

export const CodeSnippet = z
  .object({
    language: z.string().optional(),
    code: z.union([z.string(), z.array(z.string())]),
    label: z.string().optional(),
    path: z.string().optional(),
    startLine: z.number().int().min(1).optional(),
    endLine: z.number().int().min(1).optional(),
  })
  .strict()

export const ComparisonRow = z
  .object({
    label: z.string(),
    current: z.string(),
    proposed: z.string(),
    note: z.string().optional(),
  })
  .strict()

export const Metaphor = z
  .object({
    title: z.string(),
    description: z.string(),
  })
  .strict()

const Position = z.enum(['top', 'right', 'bottom', 'left'])
const EdgeType = z.enum(['default', 'straight', 'step', 'smoothstep'])
const EdgeStyle = z.enum(['solid', 'dashed', 'dotted', 'bold'])
const GlossaryType = z.enum([
  'term',
  'client',
  'server',
  'cloud-service',
  'class',
  'function',
  'db',
  'table',
])

export const ArchitectureEdge = z
  .object({
    order: z.number().int().min(1),
    source: z.string(),
    target: z.string(),
    label: z.string(),
    data: z.string(),
    sourcePosition: Position.optional(),
    targetPosition: Position.optional(),
    edgeType: EdgeType.optional(),
    edgeStyle: EdgeStyle.optional(),
    animated: z.boolean().optional(),
  })
  .strict()

export const StoryScene = z
  .object({
    title: z.string().min(1),
    actor: z.string().optional(),
    action: z.string().min(1),
    result: z.string().optional(),
    edgeRefs: z.array(z.number().int().min(1)).optional(),
    evidence: z.array(EvidenceRef).optional(),
  })
  .strict()

export const DiagramOptions = z
  .object({
    nodePositions: z
      .record(
        z.string(),
        z.object({ x: z.number(), y: z.number() }).strict(),
      )
      .optional(),
    edges: z
      .record(
        z.string(),
        z
          .object({
            sourcePosition: Position.optional(),
            targetPosition: Position.optional(),
            type: EdgeType.optional(),
            style: EdgeStyle.optional(),
            animated: z.boolean().optional(),
          })
          .strict(),
      )
      .optional(),
  })
  .strict()

export const GlossaryItem = z
  .object({
    id: z.string().min(1),
    type: GlossaryType,
    name: z.string(),
    description: z.string().optional(),
    icon: z.string().optional(),
    parentId: z.string().optional(),
    persona: z.string().optional(),
    analogy: z.string().optional(),
    responsibility: z.string().optional(),
    evidence: z.array(EvidenceRef).optional(),
    codeSnippets: z.array(CodeSnippet).optional(),
  })
  .strict()

export const State = z
  .object({
    description: z.string().optional(),
    architectureEdges: z.array(ArchitectureEdge).optional(),
    diagram: DiagramOptions.optional(),
    storyTitle: z.string().optional(),
    scenes: z.array(StoryScene).optional(),
    takeaway: z.string().optional(),
  })
  .strict()

export const StatePair = z
  .object({
    title: z.string(),
    description: z.string().optional(),
    currentState: State.optional(),
    proposedState: State.optional(),
    comparison: z.array(ComparisonRow).optional(),
    safeguards: z.array(z.string()).optional(),
    takeaway: z.string().optional(),
    evidence: z.array(EvidenceRef).optional(),
  })
  .strict()

export const Plan = z
  .object({
    title: z.string(),
    description: z.string(),
    metaphor: Metaphor.optional(),
    takeaway: z.string().optional(),
    evidence: z.array(EvidenceRef).optional(),
    glossary: z.array(GlossaryItem).min(1),
    pairs: z.array(StatePair).min(1).optional(),
    currentState: State.optional(),
    proposedState: State.optional(),
  })
  .strict()
  .refine(
    (p) => !(p.pairs && (p.currentState !== undefined || p.proposedState !== undefined)),
    {
      message:
        'plan must not define both top-level currentState/proposedState and pairs; use one form only',
      path: ['pairs'],
    },
  )

// 参照整合性チェック。zod / JSON Schema では表現できない制約を扱う。
// 戻り値は { path: string, message: string } の配列（空なら問題なし）。
export function validateReferences(plan) {
  const errors = []
  const push = (path, message) => errors.push({ path, message })

  // glossary id 集合・重複検出
  const ids = new Set()
  for (let i = 0; i < plan.glossary.length; i++) {
    const item = plan.glossary[i]
    if (ids.has(item.id)) {
      push(`glossary[${i}].id`, `duplicate glossary id: ${JSON.stringify(item.id)}`)
    }
    ids.add(item.id)
  }

  // parentId は ids に存在
  for (let i = 0; i < plan.glossary.length; i++) {
    const item = plan.glossary[i]
    if (item.parentId !== undefined && !ids.has(item.parentId)) {
      push(
        `glossary[${i}].parentId`,
        `unknown parentId: ${JSON.stringify(item.parentId)}`,
      )
    }
  }

  // parentId のサイクル検出 & 深さ ≤ 3
  const parentOf = new Map(plan.glossary.map((g) => [g.id, g.parentId]))
  for (const item of plan.glossary) {
    let depth = 1
    let cursor = item.parentId
    const seen = new Set([item.id])
    while (cursor !== undefined) {
      if (seen.has(cursor)) {
        push(`glossary[id=${item.id}].parentId`, `cycle in parentId chain via ${cursor}`)
        break
      }
      seen.add(cursor)
      depth++
      if (depth > 3) {
        push(
          `glossary[id=${item.id}]`,
          `nesting depth exceeds 3 (viewer drops depth 4+ nodes)`,
        )
        break
      }
      cursor = parentOf.get(cursor)
    }
  }

  // state 単位の検査
  const checkState = (statePath, state) => {
    if (!state) return
    const edges = state.architectureEdges ?? []
    const orderSet = new Set()

    edges.forEach((edge, i) => {
      const ePath = `${statePath}.architectureEdges[${i}]`
      if (edge.order !== i + 1) {
        push(`${ePath}.order`, `order must be ${i + 1} (consecutive from 1), got ${edge.order}`)
      }
      orderSet.add(edge.order)
      if (!ids.has(edge.source)) {
        push(`${ePath}.source`, `unknown glossary id: ${JSON.stringify(edge.source)}`)
      }
      if (!ids.has(edge.target)) {
        push(`${ePath}.target`, `unknown glossary id: ${JSON.stringify(edge.target)}`)
      }
    })

    // scenes
    const scenes = state.scenes ?? []
    scenes.forEach((scene, i) => {
      const sPath = `${statePath}.scenes[${i}]`
      if (scene.actor !== undefined && !ids.has(scene.actor)) {
        push(`${sPath}.actor`, `unknown glossary id: ${JSON.stringify(scene.actor)}`)
      }
      ;(scene.edgeRefs ?? []).forEach((ord, j) => {
        if (!orderSet.has(ord)) {
          push(
            `${sPath}.edgeRefs[${j}]`,
            `unknown architecture edge order in this state: ${ord}`,
          )
        }
      })
    })

    // diagram
    const diagram = state.diagram
    if (diagram?.nodePositions) {
      for (const key of Object.keys(diagram.nodePositions)) {
        if (!ids.has(key)) {
          push(
            `${statePath}.diagram.nodePositions[${JSON.stringify(key)}]`,
            `unknown glossary id`,
          )
        }
      }
    }
    if (diagram?.edges) {
      for (const key of Object.keys(diagram.edges)) {
        const ePath = `${statePath}.diagram.edges[${JSON.stringify(key)}]`
        if (/^\d+$/.test(key)) {
          if (!orderSet.has(Number(key))) {
            push(ePath, `references unknown architecture edge order in this state: ${key}`)
          }
        } else if (key.includes('->')) {
          const [src, tgt] = key.split('->')
          if (!ids.has(src)) push(ePath, `source id unknown: ${JSON.stringify(src)}`)
          if (!ids.has(tgt)) push(ePath, `target id unknown: ${JSON.stringify(tgt)}`)
        } else {
          push(
            ePath,
            `key must be either "<order>" (e.g. "1") or "source->target"`,
          )
        }
      }
    }
  }

  if (plan.pairs) {
    plan.pairs.forEach((pair, i) => {
      checkState(`pairs[${i}].currentState`, pair.currentState)
      checkState(`pairs[${i}].proposedState`, pair.proposedState)
    })
  } else {
    checkState('currentState', plan.currentState)
    checkState('proposedState', plan.proposedState)
  }

  return errors
}
