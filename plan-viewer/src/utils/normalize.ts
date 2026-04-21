import type { Plan, StatePair } from '../types'

export interface NormalizedPlan {
  pairs: StatePair[]
}

function hasAnyState(pair: StatePair): boolean {
  return pair.currentState !== undefined || pair.proposedState !== undefined
}

export function normalizePlan(plan: Plan): NormalizedPlan {
  const hasPairs = Array.isArray(plan.pairs)
  const hasLegacy = plan.currentState !== undefined || plan.proposedState !== undefined

  if (hasPairs && hasLegacy) {
    throw new Error(
      'Plan cannot define both top-level currentState/proposedState and pairs. Use one form only.',
    )
  }

  if (hasPairs) {
    if (plan.pairs!.length === 0) {
      throw new Error('pairs must not be an empty array')
    }
    return { pairs: plan.pairs!.filter(hasAnyState) }
  }

  if (hasLegacy) {
    return {
      pairs: [
        {
          title: '',
          currentState: plan.currentState,
          proposedState: plan.proposedState,
        },
      ],
    }
  }

  return { pairs: [] }
}
