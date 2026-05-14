#!/usr/bin/env node
// Plan JSON を JSON Schema (ajv) と zod の参照整合性チェックで検証する CLI。
//
// Usage:
//   node validate_plan.mjs path/to/plan.json
//   cat plan.json | node validate_plan.mjs -
//
// 成功時は exit 0、失敗時は stderr に詳細を出して exit 1。

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

import Ajv2020 from 'ajv/dist/2020.js'

import { Plan, validateReferences } from './lib/plan-schema.zod.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const SCHEMA_PATH = resolve(here, '..', 'reference', 'plan.schema.json')

function loadSchema() {
  return JSON.parse(readFileSync(SCHEMA_PATH, 'utf8'))
}

export function buildJsonSchemaValidator() {
  const ajv = new Ajv2020({ allErrors: true, strict: false })
  return ajv.compile(loadSchema())
}

// プランを検証する。{ ok: true } か { ok: false, errors: [{ source, path, message }] } を返す。
export function validatePlan(plan) {
  const validate = buildJsonSchemaValidator()
  const jsonOk = validate(plan)
  if (!jsonOk) {
    return {
      ok: false,
      errors: (validate.errors ?? []).map((e) => ({
        source: 'json-schema',
        path: e.instancePath || '/',
        message: `${e.message ?? 'invalid'}${
          e.params ? ' ' + JSON.stringify(e.params) : ''
        }`,
      })),
    }
  }

  const zodResult = Plan.safeParse(plan)
  if (!zodResult.success) {
    return {
      ok: false,
      errors: zodResult.error.issues.map((i) => ({
        source: 'zod',
        path: '/' + i.path.join('/'),
        message: i.message,
      })),
    }
  }

  const refErrors = validateReferences(zodResult.data)
  if (refErrors.length > 0) {
    return {
      ok: false,
      errors: refErrors.map((e) => ({
        source: 'references',
        path: e.path,
        message: e.message,
      })),
    }
  }

  return { ok: true }
}

async function readStdin() {
  const chunks = []
  for await (const chunk of process.stdin) chunks.push(chunk)
  return Buffer.concat(chunks).toString('utf8')
}

async function loadPlanFromArg(src) {
  const text = src === '-' ? await readStdin() : readFileSync(resolve(src), 'utf8')
  return JSON.parse(text)
}

async function main() {
  const args = process.argv.slice(2)
  if (args.length !== 1) {
    process.stderr.write(
      'Usage: node validate_plan.mjs <path-to-plan.json>\n' +
        '       node validate_plan.mjs -                  # read JSON from stdin\n',
    )
    process.exit(2)
  }
  const plan = await loadPlanFromArg(args[0])
  const result = validatePlan(plan)
  if (result.ok) {
    process.stdout.write('plan is valid\n')
    return
  }
  process.stderr.write(`plan is INVALID (${result.errors.length} error(s)):\n`)
  for (const err of result.errors) {
    process.stderr.write(`  [${err.source}] ${err.path}: ${err.message}\n`)
  }
  process.exit(1)
}

const isCliEntry = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isCliEntry) {
  main().catch((err) => {
    process.stderr.write(`${err.message}\n`)
    process.exit(1)
  })
}
