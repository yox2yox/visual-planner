#!/usr/bin/env node
// Build a file:// URL that opens plan-viewer with an embedded plan JSON.
//
// Usage:
//   node make_url.mjs path/to/plan.json
//   node make_url.mjs -                 # read from stdin
//   cat plan.json | node make_url.mjs -
//
// Stdout: a single line `file:///.../viewer/index.html?plan=<base64url>`.

import { readFileSync, existsSync } from 'node:fs'
import { pathToFileURL, fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const VALID_TYPES = new Set(['term', 'feature', 'data'])
const REQUIRED_TOP_KEYS = ['title', 'glossary']

function validate(plan) {
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
  for (const stateKey of ['currentState', 'proposedState']) {
    const state = plan[stateKey]
    if (state == null) continue
    if (typeof state !== 'object' || !Array.isArray(state.interactions)) {
      throw new Error(`${stateKey}.interactions must be an array`)
    }
    state.interactions.forEach((edge, i) => {
      for (const key of ['source', 'target']) {
        if (!seen.has(edge?.[key])) {
          throw new Error(`${stateKey}.interactions[${i}].${key} references unknown id: ${JSON.stringify(edge?.[key])}`)
        }
      }
    })
  }
}

function encodePlan(plan) {
  const json = JSON.stringify(plan)
  return Buffer.from(json, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

function viewerIndexPath() {
  const here = dirname(fileURLToPath(import.meta.url))
  return resolve(here, '..', 'viewer', 'index.html')
}

function buildUrl(encoded) {
  const idx = viewerIndexPath()
  if (!existsSync(idx)) {
    throw new Error(
      `viewer/index.html not found at ${idx}. Run \`npm run build\` in plan-viewer/ to regenerate it.`,
    )
  }
  return `${pathToFileURL(idx).href}?plan=${encoded}`
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
  if (args.length !== 1) {
    process.stderr.write(
      'Usage: node make_url.mjs <path-to-plan.json>\n' +
        '       node make_url.mjs -            # read JSON from stdin\n',
    )
    process.exit(2)
  }
  const plan = await loadPlan(args[0])
  validate(plan)
  process.stdout.write(buildUrl(encodePlan(plan)) + '\n')
}

main().catch((err) => {
  process.stderr.write(`${err.message}\n`)
  process.exit(1)
})
