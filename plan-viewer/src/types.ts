export type GlossaryType = 'term' | 'feature' | 'data'

export interface GlossaryItem {
  id: string
  type: GlossaryType
  name: string
  description: string
  icon?: string
  parentId?: string
}

export interface Interaction {
  source: string
  target: string
  label: string
  data: string
}

export interface FlowState {
  description?: string
  interactions: Interaction[]
}

export interface StatePair {
  title: string
  description?: string
  currentState?: FlowState
  proposedState?: FlowState
}

export interface Plan {
  title: string
  description: string
  glossary: GlossaryItem[]
  currentState?: FlowState
  proposedState?: FlowState
  pairs?: StatePair[]
}

export type EdgeDiffStatus = 'added' | 'changed' | 'removed' | 'unchanged'

export interface DiffEdge {
  source: string
  target: string
  label: string
  data: string
  status: EdgeDiffStatus
}
