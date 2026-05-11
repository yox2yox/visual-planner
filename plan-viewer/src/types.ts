export type GlossaryType =
  | 'term'
  | 'client'
  | 'server'
  | 'cloud-service'
  | 'class'
  | 'function'
  | 'db'
  | 'table'

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

export interface ArchitectureEdge {
  order: number
  source: string
  target: string
  label: string
  data: string
  sourcePosition?: NodePortPosition
  targetPosition?: NodePortPosition
  edgeType?: EdgeRenderType
  edgeStyle?: EdgeRenderStyle
  animated?: boolean
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
  edgeRefs?: number[]
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
  architectureEdges?: ArchitectureEdge[]
  diagram?: DiagramOptions
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

export type NodePortPosition = 'top' | 'right' | 'bottom' | 'left'
export type EdgeRenderType = 'default' | 'straight' | 'step' | 'smoothstep'
export type EdgeRenderStyle = 'solid' | 'dashed' | 'dotted' | 'bold'

export interface DiagramNodePosition {
  x: number
  y: number
}

export interface DiagramEdgeOptions {
  sourcePosition?: NodePortPosition
  targetPosition?: NodePortPosition
  type?: EdgeRenderType
  style?: EdgeRenderStyle
  animated?: boolean
}

export interface DiagramOptions {
  nodePositions?: Record<string, DiagramNodePosition>
  edges?: Record<string, DiagramEdgeOptions>
}

export type EdgeDiffStatus = 'added' | 'changed' | 'removed' | 'unchanged'

export interface DiffEdge {
  order: number
  source: string
  target: string
  label: string
  data: string
  status: EdgeDiffStatus
}
