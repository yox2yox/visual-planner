import type { GlossaryItem, GlossaryType } from '../types'

export function filterGlossary(
  items: GlossaryItem[],
  tab: GlossaryType | 'all'
): GlossaryItem[] {
  if (tab === 'all') return items
  return items.filter((item) => item.type === tab)
}
