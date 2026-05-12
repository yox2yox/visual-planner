import type { GlossaryItem } from '../types'

export function isArchitectureTooltipOpenKey(key: string): boolean {
  return key === 'Enter' || key === ' ' || key === 'Spacebar'
}

export function isArchitectureTooltipCloseKey(key: string): boolean {
  return key === 'Escape'
}

export function findArchitectureTooltipItem(
  nodeId: string,
  glossary: GlossaryItem[]
): GlossaryItem | undefined {
  return glossary.find((item) => item.id === nodeId)
}
