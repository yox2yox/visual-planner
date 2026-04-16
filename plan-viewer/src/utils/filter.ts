import type { GlossaryItem, GlossaryType } from '../types'

export interface TreeNode {
  item: GlossaryItem
  children: TreeNode[]
  depth: number
}

/** Build a forest (list of root trees) from flat glossary items */
export function buildTree(items: GlossaryItem[]): TreeNode[] {
  const itemMap = new Map<string, GlossaryItem>(items.map((i) => [i.id, i]))
  const childrenMap = new Map<string, GlossaryItem[]>()

  for (const item of items) {
    const pid = item.parentId ?? '__root__'
    const list = childrenMap.get(pid) ?? []
    list.push(item)
    childrenMap.set(pid, list)
  }

  function build(parentId: string, depth: number, visited: Set<string>): TreeNode[] {
    const children = childrenMap.get(parentId) ?? []
    return children
      .filter((item) => !visited.has(item.id))
      .map((item) => {
        const next = new Set(visited)
        next.add(item.id)
        return {
          item,
          children: build(item.id, depth + 1, next),
          depth,
        }
      })
  }

  // Root nodes: parentId is undefined OR parentId references a non-existent item
  const roots: TreeNode[] = []
  for (const item of items) {
    if (!item.parentId || !itemMap.has(item.parentId)) {
      const visited = new Set<string>([item.id])
      roots.push({
        item,
        children: build(item.id, 1, visited),
        depth: 0,
      })
    }
  }

  return roots
}

/** Flatten a tree into a list preserving hierarchy order */
export function flattenTree(nodes: TreeNode[]): TreeNode[] {
  const result: TreeNode[] = []
  function walk(list: TreeNode[]) {
    for (const node of list) {
      result.push(node)
      walk(node.children)
    }
  }
  walk(nodes)
  return result
}

/** Filter tree by glossary type tab — keep parent nodes if any descendant matches */
export function filterTree(nodes: TreeNode[], tab: GlossaryType | 'all'): TreeNode[] {
  if (tab === 'all') return nodes

  function filterNodes(list: TreeNode[]): TreeNode[] {
    const result: TreeNode[] = []
    for (const node of list) {
      const filteredChildren = filterNodes(node.children)
      if (node.item.type === tab || filteredChildren.length > 0) {
        result.push({ ...node, children: filteredChildren })
      }
    }
    return result
  }

  return filterNodes(nodes)
}

/** Legacy flat filter for backward compatibility */
export function filterGlossary(
  items: GlossaryItem[],
  tab: GlossaryType | 'all'
): GlossaryItem[] {
  if (tab === 'all') return items
  return items.filter((item) => item.type === tab)
}
