#!/usr/bin/env node
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

const VALID_TYPES = new Set(['term', 'feature', 'data'])
const REQUIRED_TOP_KEYS = ['title', 'glossary']

function validateInteractions(path, state, seen) {
  if (state == null) return
  if (typeof state !== 'object' || !Array.isArray(state.interactions)) {
    throw new Error(`${path}.interactions must be an array`)
  }
  state.interactions.forEach((edge, i) => {
    for (const key of ['source', 'target']) {
      if (!seen.has(edge?.[key])) {
        throw new Error(
          `${path}.interactions[${i}].${key} references unknown id: ${JSON.stringify(edge?.[key])}`,
        )
      }
    }
  })
}

export function validate(plan) {
  if (plan === null || typeof plan !== 'object' || Array.isArray(plan)) {
    throw new Error('top-level JSON must be an object')
  }
  for (const key of REQUIRED_TOP_KEYS) {
    if (!(key in plan)) throw new Error(`plan is missing required key: ${JSON.stringify(key)}`)
  }
  if (!Array.isArray(plan.glossary) || plan.glossary.length === 0) {
    throw new Error("'glossary' must be a non-empty array")
  }
  const seen = new Set()
  plan.glossary.forEach((item, i) => {
    if (!item || typeof item !== 'object') throw new Error(`glossary[${i}] must be an object`)
    for (const key of ['id', 'type', 'name']) {
      if (!(key in item)) throw new Error(`glossary[${i}] missing required key: ${JSON.stringify(key)}`)
    }
    if (!VALID_TYPES.has(item.type)) {
      throw new Error(`glossary[${i}].type must be one of ${[...VALID_TYPES].join(', ')}; got ${JSON.stringify(item.type)}`)
    }
    if (seen.has(item.id)) throw new Error(`duplicate glossary id: ${JSON.stringify(item.id)}`)
    seen.add(item.id)
  })
  for (const item of plan.glossary) {
    if (item.parentId != null && !seen.has(item.parentId)) {
      throw new Error(`glossary item ${JSON.stringify(item.id)} has unknown parentId ${JSON.stringify(item.parentId)}`)
    }
  }

  const hasPairs = 'pairs' in plan && plan.pairs !== undefined
  const hasLegacy = plan.currentState !== undefined || plan.proposedState !== undefined

  if (hasPairs && hasLegacy) {
    throw new Error(
      'plan must not define both top-level currentState/proposedState and pairs; use one form only',
    )
  }

  if (hasPairs) {
    if (!Array.isArray(plan.pairs)) {
      throw new Error("'pairs' must be an array")
    }
    if (plan.pairs.length === 0) {
      throw new Error("'pairs' must not be an empty array")
    }
    plan.pairs.forEach((pair, i) => {
      if (!pair || typeof pair !== 'object' || Array.isArray(pair)) {
        throw new Error(`pairs[${i}] must be an object`)
      }
      if (typeof pair.title !== 'string') {
        throw new Error(`pairs[${i}].title must be a string (got ${typeof pair.title})`)
      }
      validateInteractions(`pairs[${i}].currentState`, pair.currentState, seen)
      validateInteractions(`pairs[${i}].proposedState`, pair.proposedState, seen)
    })
  } else {
    validateInteractions('currentState', plan.currentState, seen)
    validateInteractions('proposedState', plan.proposedState, seen)
  }
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
