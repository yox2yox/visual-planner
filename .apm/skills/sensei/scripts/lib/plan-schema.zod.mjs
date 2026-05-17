// zod による Plan スキーマ定義。
// JSON Schema (reference/plan.schema.json) では表現しきれない参照整合性は、
// このファイル後半の `validateReferences` として実装する。

import { z } from 'zod'

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

export const Evidence = z
  .object({
    path: z.string().min(1).optional(),
    startLine: z.number().int().min(1).optional(),
    endLine: z.number().int().min(1).optional(),
    label: z.string().optional(),
    codeSnippets: CodeSnippet.optional(),
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
    evidence: z.array(Evidence).optional(),
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
    icon: z.string(),
    description: z.string().optional(),
    parentId: z.string().optional(),
    analogy: z.string().optional(),
    responsibility: z.string().optional(),
    evidence: z.array(Evidence).optional(),
  })
  .strict()

export const State = z
  .object({
    architectureDiagram: z.array(ArchitectureEdge).optional(),
    diagramOptions: DiagramOptions.optional(),
    storyTitle: z.string().optional(),
    scenes: z.array(StoryScene).optional(),
    takeaway: z.string().optional(),
  })
  .strict()

export const Example = z
  .object({
    title: z.string(),
    condition: z.string().optional(),
    currentState: State.optional(),
    proposedState: State.optional(),
  })
  .strict()

export const Concern = z
  .object({
    title: z.string(),
    examples: z.array(Example).optional(),
    safeguards: z.array(z.string()).optional(),
    takeaway: z.string().optional(),
  })
  .strict()

export const Plan = z
  .object({
    title: z.string(),
    description: z.string(),
    metaphor: Metaphor.optional(),
    takeaway: z.string().optional(),
    glossary: z.array(GlossaryItem).min(1),
    pairs: z.array(Concern).min(1),
  })
  .strict()

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
    const edges = state.architectureDiagram ?? []
    const orderSet = new Set()

    edges.forEach((edge, i) => {
      const ePath = `${statePath}.architectureDiagram[${i}]`
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

    // diagramOptions
    const diagram = state.diagramOptions
    if (diagram?.nodePositions) {
      for (const key of Object.keys(diagram.nodePositions)) {
        if (!ids.has(key)) {
          push(
            `${statePath}.diagramOptions.nodePositions[${JSON.stringify(key)}]`,
            `unknown glossary id`,
          )
        }
      }
    }
    if (diagram?.edges) {
      for (const key of Object.keys(diagram.edges)) {
        const ePath = `${statePath}.diagramOptions.edges[${JSON.stringify(key)}]`
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

  ;(plan.pairs ?? []).forEach((concern, i) => {
    ;(concern.examples ?? []).forEach((example, j) => {
      const base = `pairs[${i}].examples[${j}]`
      checkState(`${base}.currentState`, example.currentState)
      checkState(`${base}.proposedState`, example.proposedState)
    })
  })

  return errors
}
