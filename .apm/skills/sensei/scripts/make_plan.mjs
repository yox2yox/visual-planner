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

const VALID_TYPES = new Set([
  'term',
  'client',
  'server',
  'cloud-service',
  'class',
  'function',
  'db',
  'table',
])
const VALID_POSITIONS = new Set(['top', 'right', 'bottom', 'left'])
const VALID_EDGE_TYPES = new Set(['default', 'straight', 'step', 'smoothstep'])
const VALID_EDGE_STYLES = new Set(['solid', 'dashed', 'dotted', 'bold'])
const REQUIRED_TOP_KEYS = ['title', 'glossary']

function validateArchitectureEdges(path, state, seen) {
  if (state == null) return
  if (typeof state !== 'object' || Array.isArray(state)) {
    throw new Error(`${path} must be an object`)
  }
  if (state.architectureEdges != null && !Array.isArray(state.architectureEdges)) {
    throw new Error(`${path}.architectureEdges must be an array when present`)
  }
  const architectureEdges = state.architectureEdges ?? []
  architectureEdges.forEach((edge, i) => {
    if (!Number.isInteger(edge?.order) || edge.order !== i + 1) {
      throw new Error(`${path}.architectureEdges[${i}].order must be ${i + 1}`)
    }
    for (const key of ['source', 'target']) {
      if (!seen.has(edge?.[key])) {
        throw new Error(
          `${path}.architectureEdges[${i}].${key} references unknown id: ${JSON.stringify(edge?.[key])}`,
        )
      }
    }
    for (const key of ['sourcePosition', 'targetPosition']) {
      if (edge?.[key] != null && !VALID_POSITIONS.has(edge[key])) {
        throw new Error(`${path}.architectureEdges[${i}].${key} must be one of ${[...VALID_POSITIONS].join(', ')}`)
      }
    }
    if (edge?.edgeType != null && !VALID_EDGE_TYPES.has(edge.edgeType)) {
      throw new Error(`${path}.architectureEdges[${i}].edgeType must be one of ${[...VALID_EDGE_TYPES].join(', ')}`)
    }
    if (edge?.edgeStyle != null && !VALID_EDGE_STYLES.has(edge.edgeStyle)) {
      throw new Error(`${path}.architectureEdges[${i}].edgeStyle must be one of ${[...VALID_EDGE_STYLES].join(', ')}`)
    }
    if (edge?.animated != null && typeof edge.animated !== 'boolean') {
      throw new Error(`${path}.architectureEdges[${i}].animated must be a boolean`)
    }
  })
  validateDiagram(`${path}.diagram`, state.diagram, seen)
  validateScenes(path, state, architectureEdges, seen)
}

function validateDiagram(path, diagram, seen) {
  if (diagram == null) return
  if (!diagram || typeof diagram !== 'object' || Array.isArray(diagram)) {
    throw new Error(`${path} must be an object`)
  }
  if (diagram.nodePositions != null) {
    if (!diagram.nodePositions || typeof diagram.nodePositions !== 'object' || Array.isArray(diagram.nodePositions)) {
      throw new Error(`${path}.nodePositions must be an object keyed by glossary id`)
    }
    for (const [id, position] of Object.entries(diagram.nodePositions)) {
      if (!seen.has(id)) throw new Error(`${path}.nodePositions references unknown id: ${JSON.stringify(id)}`)
      if (!position || typeof position !== 'object' || Array.isArray(position)) {
        throw new Error(`${path}.nodePositions[${JSON.stringify(id)}] must be an object`)
      }
      for (const key of ['x', 'y']) {
        if (typeof position[key] !== 'number' || !Number.isFinite(position[key])) {
          throw new Error(`${path}.nodePositions[${JSON.stringify(id)}].${key} must be a finite number`)
        }
      }
    }
  }
  if (diagram.edges != null) {
    if (!diagram.edges || typeof diagram.edges !== 'object' || Array.isArray(diagram.edges)) {
      throw new Error(`${path}.edges must be an object keyed by architecture edge order or source->target`)
    }
    for (const [key, options] of Object.entries(diagram.edges)) {
      if (!options || typeof options !== 'object' || Array.isArray(options)) {
        throw new Error(`${path}.edges[${JSON.stringify(key)}] must be an object`)
      }
      for (const positionKey of ['sourcePosition', 'targetPosition']) {
        if (options[positionKey] != null && !VALID_POSITIONS.has(options[positionKey])) {
          throw new Error(`${path}.edges[${JSON.stringify(key)}].${positionKey} must be one of ${[...VALID_POSITIONS].join(', ')}`)
        }
      }
      if (options.type != null && !VALID_EDGE_TYPES.has(options.type)) {
        throw new Error(`${path}.edges[${JSON.stringify(key)}].type must be one of ${[...VALID_EDGE_TYPES].join(', ')}`)
      }
      if (options.style != null && !VALID_EDGE_STYLES.has(options.style)) {
        throw new Error(`${path}.edges[${JSON.stringify(key)}].style must be one of ${[...VALID_EDGE_STYLES].join(', ')}`)
      }
      if (options.animated != null && typeof options.animated !== 'boolean') {
        throw new Error(`${path}.edges[${JSON.stringify(key)}].animated must be a boolean`)
      }
    }
  }
}

function validateEvidence(path, evidence) {
  if (evidence == null) return
  if (!Array.isArray(evidence)) throw new Error(`${path}.evidence must be an array`)
  evidence.forEach((ref, i) => {
    if (!ref || typeof ref !== 'object' || Array.isArray(ref)) {
      throw new Error(`${path}.evidence[${i}] must be an object`)
    }
    if (typeof ref.path !== 'string' || ref.path.length === 0) {
      throw new Error(`${path}.evidence[${i}].path must be a non-empty string`)
    }
    for (const key of ['startLine', 'endLine']) {
      if (ref[key] != null && (!Number.isInteger(ref[key]) || ref[key] < 1)) {
        throw new Error(`${path}.evidence[${i}].${key} must be a positive integer`)
      }
    }
  })
}

function validateScenes(path, state, architectureEdges, seen) {
  if (state.scenes == null) return
  if (!Array.isArray(state.scenes)) throw new Error(`${path}.scenes must be an array`)
  const edgeOrders = new Set(architectureEdges.map((edge) => edge.order))
  state.scenes.forEach((scene, i) => {
    if (!scene || typeof scene !== 'object' || Array.isArray(scene)) {
      throw new Error(`${path}.scenes[${i}] must be an object`)
    }
    for (const key of ['title', 'action']) {
      if (typeof scene[key] !== 'string' || scene[key].length === 0) {
        throw new Error(`${path}.scenes[${i}].${key} must be a non-empty string`)
      }
    }
    if (scene.actor != null && !seen.has(scene.actor)) {
      throw new Error(`${path}.scenes[${i}].actor references unknown id: ${JSON.stringify(scene.actor)}`)
    }
    if (scene.edgeRefs != null) {
      if (!Array.isArray(scene.edgeRefs)) {
        throw new Error(`${path}.scenes[${i}].edgeRefs must be an array`)
      }
      scene.edgeRefs.forEach((order, j) => {
        if (!edgeOrders.has(order)) {
          throw new Error(`${path}.scenes[${i}].edgeRefs[${j}] references unknown architecture edge order: ${JSON.stringify(order)}`)
        }
      })
    }
    validateEvidence(`${path}.scenes[${i}]`, scene.evidence)
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
  validateEvidence('plan', plan.evidence)
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
    validateEvidence(`glossary[${i}]`, item.evidence)
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
      validateEvidence(`pairs[${i}]`, pair.evidence)
      validateArchitectureEdges(`pairs[${i}].currentState`, pair.currentState, seen)
      validateArchitectureEdges(`pairs[${i}].proposedState`, pair.proposedState, seen)
    })
  } else {
    validateArchitectureEdges('currentState', plan.currentState, seen)
    validateArchitectureEdges('proposedState', plan.proposedState, seen)
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
