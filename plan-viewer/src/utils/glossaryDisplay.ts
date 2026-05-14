import type { GlossaryItem, GlossaryType } from '../types'

export function glossaryItemIcon(item: Pick<GlossaryItem, 'icon' | 'name'>): string {
  if (item.icon && item.icon.trim()) return item.icon
  return [...(item.name ?? '')][0] ?? '•'
}

export const glossaryTypeColors: Record<GlossaryType, string> = {
  term: 'bg-purple-100 text-purple-800 border-purple-200',
  client: 'bg-sky-100 text-sky-800 border-sky-200',
  server: 'bg-blue-100 text-blue-800 border-blue-200',
  'cloud-service': 'bg-cyan-100 text-cyan-800 border-cyan-200',
  class: 'bg-amber-100 text-amber-800 border-amber-200',
  function: 'bg-orange-100 text-orange-800 border-orange-200',
  db: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  table: 'bg-teal-100 text-teal-800 border-teal-200',
}

export const glossaryTypeBadgeColors: Record<GlossaryType, string> = {
  term: 'bg-purple-100 text-purple-700',
  client: 'bg-sky-100 text-sky-700',
  server: 'bg-blue-100 text-blue-700',
  'cloud-service': 'bg-cyan-100 text-cyan-700',
  class: 'bg-amber-100 text-amber-700',
  function: 'bg-orange-100 text-orange-700',
  db: 'bg-emerald-100 text-emerald-700',
  table: 'bg-teal-100 text-teal-700',
}

export const glossaryTypeLabels: Record<GlossaryType, string> = {
  term: '用語',
  client: 'クライアント',
  server: 'サーバー',
  'cloud-service': 'クラウドサービス',
  class: 'クラス',
  function: '関数',
  db: 'DB',
  table: 'テーブル',
}
