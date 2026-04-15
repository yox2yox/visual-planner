import type { Interaction, DiffEdge } from '../types'

function edgeKey(i: Interaction): string {
  return `${i.source}--${i.target}`
}

export function computeDiffEdges(
  current: Interaction[],
  proposed: Interaction[]
): DiffEdge[] {
  const currentMap = new Map<string, Interaction>(current.map((i) => [edgeKey(i), i]))
  const proposedMap = new Map<string, Interaction>(proposed.map((i) => [edgeKey(i), i]))
  const result: DiffEdge[] = []

  for (const [key, pi] of proposedMap) {
    const ci = currentMap.get(key)
    if (!ci) {
      result.push({ ...pi, status: 'added' })
    } else if (ci.label !== pi.label || ci.data !== pi.data) {
      result.push({ ...pi, status: 'changed' })
    } else {
      result.push({ ...pi, status: 'unchanged' })
    }
  }

  for (const [key, ci] of currentMap) {
    if (!proposedMap.has(key)) {
      result.push({ ...ci, status: 'removed' })
    }
  }

  return result
}
