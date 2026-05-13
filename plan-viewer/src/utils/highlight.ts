import Prism from 'prismjs'
import 'prismjs/components/prism-markup-templating'
import 'prismjs/components/prism-typescript'
import 'prismjs/components/prism-jsx'
import 'prismjs/components/prism-tsx'
import 'prismjs/components/prism-json'
import 'prismjs/components/prism-css'
import 'prismjs/components/prism-markdown'
import 'prismjs/components/prism-kotlin'
import 'prismjs/components/prism-php'
import 'prismjs/components/prism-go'
import 'prismjs/components/prism-yaml'
import 'prismjs/components/prism-python'

const aliasMap: Record<string, string> = {
  ts: 'typescript',
  typescript: 'typescript',
  js: 'javascript',
  javascript: 'javascript',
  jsx: 'jsx',
  tsx: 'tsx',
  react: 'jsx',
  json: 'json',
  css: 'css',
  html: 'markup',
  xml: 'markup',
  vue: 'markup',
  svelte: 'markup',
  md: 'markdown',
  markdown: 'markdown',
  kt: 'kotlin',
  kotlin: 'kotlin',
  php: 'php',
  go: 'go',
  yml: 'yaml',
  yaml: 'yaml',
  py: 'python',
  python: 'python',
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export interface HighlightResult {
  html: string
  language: string | null
}

export function highlight(code: string, language?: string): HighlightResult {
  if (!language) return { html: escapeHtml(code), language: null }
  const resolved = aliasMap[language.toLowerCase()]
  if (!resolved) return { html: escapeHtml(code), language: null }
  const grammar = Prism.languages[resolved]
  if (!grammar) return { html: escapeHtml(code), language: null }
  return { html: Prism.highlight(code, grammar, resolved), language: resolved }
}

export function supportedLanguages(): string[] {
  return Object.keys(aliasMap)
}
