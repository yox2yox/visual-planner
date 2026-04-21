---
name: visual-planner
description: Generate a plan-viewer JSON and a self-contained HTML file (with the plan JSON inlined) so the user can open the plan diagram in any browser — no URL, no server, no network. Use this whenever the user asks to visualize an implementation plan, architecture change, before/after design, or data-flow diagram for a feature.
---

# visual-planner

Turn a feature idea or migration plan into **two files**: a `plan.json` and a self-contained `plan.html` (the plan-viewer bundle with the JSON inlined). The user opens the HTML file in any browser — no server, no install, no network, no long URL.

Rendering is done by the pre-built `viewer/` bundle that ships with this skill; the generator script just embeds the plan JSON into a `<script id="plan-data" type="application/json">…</script>` placeholder baked into that HTML.

## When to use

Trigger this skill when the user asks to:

- visualize an implementation plan, proposal, or refactor
- diagram a current-vs-proposed architecture
- show the data flow between components for a feature
- produce a "plan viewer" / "share this plan as a file"

Not for: generating code, writing docs, or anything that doesn't boil down to producing the plan JSON.

## Workflow

1. **Gather the plan**. Identify:
   - `title`, `description` — one-line and paragraph summary
   - `glossary[]` — the nodes (features / data / terms). Give each a stable `id`.
     Use `parentId` to nest (max 3 levels; deeper levels are dropped by the viewer).
   - State layout — choose ONE of:
     - `pairs[]` (recommended for non-trivial plans) — each pair has its own `title`, optional `description`, and its own `currentState` / `proposedState`. Pairs render as separate sections so each diagram stays readable.
     - Top-level `currentState` / `proposedState` (legacy, single-pair shortcut) — use only when the plan is small enough for one diagram.
   If the user only has one state, just produce that one; omit the other.

   **Split into multiple pairs when the plan is complex.** A single diagram crammed with every interaction quickly becomes unreadable. Split into pairs whenever any of these hold:
   - more than ~10 interactions in a single state, OR
   - more than ~10 glossary nodes touched by one state, OR
   - the plan covers multiple independent flows (e.g. "login" vs. "API call" vs. "logout") that users will reason about separately.
   Give each pair a short `title` naming the flow it covers (e.g. "ログイン", "API 呼び出し", "ログアウト"). Titles are shown as section headers; leaving a title empty hides the header.
2. **Construct the JSON** following the schema in `reference/schema.md`. Validate while you build:
   - every `parentId` references an existing `id`
   - every `interactions[].source` / `.target` references an existing `id`
   - `type` is one of `term` | `feature` | `data`
   - `pairs` and top-level `currentState`/`proposedState` are mutually exclusive — pick one form
3. **Generate the files** by piping the JSON (or passing a path) into the helper script, along with an output basename:
   ```bash
   node <skill-dir>/scripts/make_plan.mjs path/to/plan.json /abs/path/to/output-basename
   ```
   or via stdin:
   ```bash
   echo "$PLAN_JSON" | node <skill-dir>/scripts/make_plan.mjs - /abs/path/to/output-basename
   ```
   The script validates the plan (types, unique ids, parentId/interaction references), then writes:
   - `<output-basename>.json` — the validated plan, pretty-printed
   - `<output-basename>.html` — a copy of the viewer bundle with the plan JSON safely escaped and inlined into `<script id="plan-data" type="application/json">…</script>`
   Both absolute paths are printed to stdout (one per line). Requires Node.js — already a dependency of this repo, no install step needed.
4. **Hand the file paths to the user**. They can open the `.html` directly in any browser (`file://` works without `npm install` or any dev server). Mention that the HTML is self-contained — the sibling `.json` is there for re-editing, not for the viewer to load at runtime.

## Output style

- Be brief in prose. The plan is the payload.
- When returning the paths, put each on its own line so terminals can linkify them.
- If the HTML is large (plans over ~1 MB), warn the user and suggest trimming descriptions.

## Editing an existing plan

- If the user provides an existing plan `.json` file, edit it directly and re-run `make_plan.mjs` with the same output basename to regenerate the HTML.
- If the user only has an HTML file from a previous run, extract the JSON from its `<script id="plan-data" type="application/json">…</script>` block (it is plain JSON with `<` escaped as `<`; `JSON.parse` handles that natively), then re-run the generator.

## Failure modes & fixes

- `viewer/index.html not found`: the bundle is missing. Ask the user to run `npm run build` inside `plan-viewer/`. The skill repo should ship with `viewer/` pre-built; this error means it was deleted or the repo is in an unusual state.
- `viewer HTML does not contain <script id="plan-data">…</script>`: the bundled HTML was built from an older source that lacks the placeholder. Rebuild with `npm run build` inside `plan-viewer/` — `plan-viewer/index.html` declares the placeholder and `viteSingleFile` preserves it.
- Invalid plan JSON: the script prints the specific validation error to stderr. Fix the plan and retry.
- HTML file is much larger than expected: the viewer bundle is ~250 KB on its own; plans that push well past that usually mean a descriptions are unnecessarily long. Trim them.

## Schema quick reference

See `reference/schema.md` for the full schema with examples.

Minimum viable plan (single-pair shortcut):

```json
{
  "title": "…",
  "description": "…",
  "glossary": [
    { "id": "a", "type": "feature", "name": "A" },
    { "id": "b", "type": "feature", "name": "B" }
  ],
  "proposedState": {
    "description": "…",
    "interactions": [
      { "source": "a", "target": "b", "label": "calls", "data": "Payload" }
    ]
  }
}
```

Multi-pair plan (use this when any single diagram would get too busy):

```json
{
  "title": "…",
  "description": "…",
  "glossary": [ /* … */ ],
  "pairs": [
    {
      "title": "ログイン",
      "description": "…",
      "currentState": { "interactions": [ /* … */ ] },
      "proposedState": { "interactions": [ /* … */ ] }
    },
    {
      "title": "API 呼び出し",
      "proposedState": { "interactions": [ /* … */ ] }
    }
  ]
}
```

`pairs` and top-level `currentState`/`proposedState` cannot coexist. A pair with neither state set is silently dropped by the viewer.
