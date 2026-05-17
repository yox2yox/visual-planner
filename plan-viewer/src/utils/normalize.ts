import type { Concern, Example, Plan } from '../types'

export interface NormalizedPlan {
  pairs: Concern[]
}

function exampleHasContent(ex: Example): boolean {
  return Boolean(
    ex.currentState !== undefined ||
      ex.proposedState !== undefined ||
      ex.condition ||
      ex.title,
  )
}

function concernHasVisibleContent(c: Concern): boolean {
  return Boolean(
    (c.examples ?? []).some(exampleHasContent) ||
      c.safeguards?.length ||
      c.takeaway,
  )
}

export function normalizePlan(plan: Plan): NormalizedPlan {
  const pairs = Array.isArray(plan.pairs) ? plan.pairs : []
  if (pairs.length === 0) {
    throw new Error('pairs must not be empty')
  }
  return { pairs: pairs.filter(concernHasVisibleContent) }
}
