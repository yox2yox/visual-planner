export type GlossaryType = 'term' | 'feature' | 'data'

export interface GlossaryItem {
  id: string
  type: GlossaryType
  name: string
  description: string
  icon?: string
  parentId?: string
  persona?: string
  analogy?: string
  responsibility?: string
  evidence?: EvidenceRef[]
}

export interface Interaction {
  flow: number
  source: string
  target: string
  label: string
  data: string
}

export interface EvidenceRef {
  path: string
  startLine?: number
  endLine?: number
  label?: string
}

export interface Metaphor {
  title: string
  description: string
}

export interface StoryScene {
  title: string
  actor?: string
  action: string
  result?: string
  interactionFlows?: number[]
  evidence?: EvidenceRef[]
}

export interface ComparisonRow {
  label: string
  current?: string
  proposed?: string
  note?: string
}

export interface FlowState {
  description?: string
  interactions: Interaction[]
  storyTitle?: string
  scenes?: StoryScene[]
  takeaway?: string
}

export interface StatePair {
  title: string
  description?: string
  currentState?: FlowState
  proposedState?: FlowState
  comparison?: ComparisonRow[]
  safeguards?: string[]
  takeaway?: string
  evidence?: EvidenceRef[]
}

export interface Plan {
  title: string
  description: string
  glossary: GlossaryItem[]
  metaphor?: Metaphor
  takeaway?: string
  safeguards?: string[]
  evidence?: EvidenceRef[]
  currentState?: FlowState
  proposedState?: FlowState
  pairs?: StatePair[]
}

export type EdgeDiffStatus = 'added' | 'changed' | 'removed' | 'unchanged'

export interface DiffEdge {
  flow: number
  source: string
  target: string
  label: string
  data: string
  status: EdgeDiffStatus
}
