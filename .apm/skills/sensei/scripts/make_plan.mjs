// Build a self-contained plan-viewer HTML (with the plan JSON inlined) and
// a sibling .json file, from an input plan JSON.
//
// Usage:
//   node make_plan.mjs path/to/plan.json /abs/out/basename
//   cat plan.json | node make_plan.mjs - /abs/out/basename
//
// Writes:
//   <basename>.json  — the validated plan JSON (pretty-printed)
//   <basename>.html  — a copy of viewer/index.html with the plan JSON inlined
//                      into `<script id="plan-data" type="application/json">…</script>`

import { readFileSync, existsSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

import { validatePlan } from './validate_plan.mjs'

// プランを JSON Schema (ajv) と zod / 参照整合性で検証する。
// 互換性のため、エラー時は最初のエラーを Error として投げる従来のインターフェイスを残す。
export function validate(plan) {
  const result = validatePlan(plan)
  if (result.ok) return
  const lines = result.errors.map(
    (e) => `[${e.source}] ${e.path}: ${e.message}`,
  )
  throw new Error(`plan is invalid:\n  ${lines.join('\n  ')}`)
}

// Escape a JSON string for safe inlining inside <script type="application/json">.
// Breaking "</" prevents an HTML parser from terminating the script element early
// if the plan contains the literal "</script>". U+2028/U+2029 are also escaped as
// defense-in-depth for anything that later re-interprets the text as JS.
export function escapeForScriptTag(json) {
  return json
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
}

export function embedPlan(viewerHtml, plan) {
  const inline = escapeForScriptTag(JSON.stringify(plan))
  const re = /(<script id="plan-data" type="application\/json">)([\s\S]*?)(<\/script>)/
  if (!re.test(viewerHtml)) {
    throw new Error(
      'viewer HTML does not contain <script id="plan-data" type="application/json">…</script>. ' +
        'Rebuild plan-viewer (npm run build) after adding the placeholder to plan-viewer/index.html.',
    )
  }
  return viewerHtml.replace(re, `$1${inline}$3`)
}

function viewerIndexPath() {
  const here = dirname(fileURLToPath(import.meta.url))
  return resolve(here, '..', 'viewer', 'index.html')
}

function readViewerHtml() {
  const idx = viewerIndexPath()
  if (!existsSync(idx)) {
    throw new Error(
      `viewer/index.html not found at ${idx}. Run \`npm run build\` in plan-viewer/ to regenerate it.`,
    )
  }
  return readFileSync(idx, 'utf8')
}

async function readStdin() {
  const chunks = []
  for await (const chunk of process.stdin) chunks.push(chunk)
  return Buffer.concat(chunks).toString('utf8')
}

async function loadPlan(src) {
  const text = src === '-' ? await readStdin() : readFileSync(resolve(src), 'utf8')
  return JSON.parse(text)
}

async function main() {
  const args = process.argv.slice(2)
  if (args.length !== 2) {
    process.stderr.write(
      'Usage: node make_plan.mjs <path-to-plan.json> <output-basename>\n' +
        '       node make_plan.mjs -              <output-basename>   # read JSON from stdin\n' +
        'Writes <output-basename>.html and <output-basename>.json.\n',
    )
    process.exit(2)
  }
  const [input, basename] = args
  const plan = await loadPlan(input)
  validate(plan)

  const viewerHtml = readViewerHtml()
  const html = embedPlan(viewerHtml, plan)

  const outBase = resolve(basename)
  const htmlPath = `${outBase}.html`
  const jsonPath = `${outBase}.json`
  writeFileSync(htmlPath, html, 'utf8')
  writeFileSync(jsonPath, JSON.stringify(plan, null, 2) + '\n', 'utf8')
  process.stdout.write(`${htmlPath}\n${jsonPath}\n`)
}

const isCliEntry = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isCliEntry) {
  main().catch((err) => {
    process.stderr.write(`${err.message}\n`)
    process.exit(1)
  })
}
