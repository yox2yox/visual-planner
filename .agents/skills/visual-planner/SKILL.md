---
name: visual-planner
description: Generate a plan-viewer JSON and a self-contained HTML file (with the plan JSON inlined) so the user can open the plan diagram in any browser — no URL, no server, no network. Use this whenever the user asks to visualize an implementation plan, architecture change, before/after design, or data-flow diagram for a feature.
---

# visual-planner

Turn a feature idea or migration plan into **two files**: a `plan.json` and a self-contained `plan.html` (the plan-viewer bundle with the JSON inlined). The user opens the HTML file in any browser — no server, no install, no network, no long URL.

The viewer is not just a diagram renderer. It should explain the plan in the spirit of `kaisetsu`: one consistent real-world metaphor, components as characters, chronological scenes, evidence links, before/after comparison, and a final one-sentence takeaway. A readable story is more important than a dense all-in-one graph.

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
   - `metaphor` — one physical, everyday metaphor that can carry the whole plan without changing midstream.
   - `takeaway` — the "ひと言で" summary the reader should remember.
   - `glossary[]` — the nodes (architecture elements and terms) that are needed to explain the flows in `interactions`.
     Give each a stable `id`. Use `parentId` to nest (max 3 levels; deeper levels are dropped by the viewer).
     Define glossary items only at the layer needed for the change: a class-local change may only need functions/methods, while a client/server/cloud/DB change should show those layers explicitly.
     Use `client` for user-facing clients such as browsers, `server` for server-side systems, `cloud-service` for S3/Lambda-style managed services, `class` for object-oriented classes, `function` for functions or class methods, `db` for databases, `table` for database tables, and `term` for concepts that do not fit those structural types.
     For every important item, add kaisetsu fields:
     - `persona` — role-name as a person (e.g. "受付係", "記録係", "案内係")
     - `analogy` — what this item is in the metaphor world
     - `responsibility` — what this person is responsible for
     - `evidence[]` — file/line references when the plan is grounded in an existing codebase
   - State layout — choose ONE of:
     - `pairs[]` (recommended for non-trivial plans) — each pair has its own `title`, optional `description`, and optional `currentState` / `proposedState`. Pairs render as separate sections so each diagram stays readable when a diagram is needed.
     - Top-level `currentState` / `proposedState` (legacy, single-pair shortcut) — use only when the plan is small enough for one diagram.
   If the user only has one state, just produce that one; omit the other. If a diagram is not useful, use a pair with prose/comparison/safeguards and omit states or omit `interactions`.

   **Split into multiple pairs when the plan is complex.** A single diagram crammed with every interaction quickly becomes unreadable. Split into pairs whenever any of these hold:
   - more than ~10 interactions in a single state, OR
   - more than ~10 glossary nodes touched by one state, OR
   - the plan covers multiple independent flows (e.g. "login" vs. "API call" vs. "logout") that users will reason about separately.
   Give each pair a short `title` naming the flow it covers (e.g. "ログイン", "API 呼び出し", "ログアウト"). Titles are shown as section headers; leaving a title empty hides the header.
   **Use `interactions` to explain system flows.** Include them only when a diagram helps. Each interaction is one numbered step in a request/input flow:
   - `flow` is the step number within that state, starting at `1` and increasing by `1` in execution order.
   - `source` is where the request, input, process call, or data handoff starts.
   - `target` is the component or data item that receives it.
   - `label` is the processing/action phrase for that step.
   - `data` is the request, input, payload, entity, or result passed at that step.
   Prefer this over vague component-relationship edges: the diagram should answer "where did the request/input come from, what processing happens, and what data is handed off next?"
   The viewer only draws glossary nodes that appear as `source` or `target` in the state being rendered, so keep interactions focused and leave background-only terms in the glossary.
   **Use `diagram` only when it improves comprehension.** Diagrams are optional explanation aids, not required payload. When a default diagram is hard to read, add state-level `diagram.nodePositions` and/or interaction-level rendering hints (`sourcePosition`, `targetPosition`, `edgeType`, `edgeStyle`, `animated`). Prefer splitting into multiple `pairs` before over-tuning one crowded diagram.
   **Use `scenes` to make the flow readable.** Each state can include a `storyTitle`, `scenes[]`, and `takeaway`. A scene is the human explanation of one or more `interactionFlows`; it must say who acts, what they do, and what changes as a result. Keep scene text concrete and metaphor-consistent.
   **Use `comparison` on each pair** when both current/proposed states exist. The comparison table should answer "what changed, why it matters, and why the new shape is easier to reason about."
   **Use `safeguards`** for defensive design, validation, fallback behaviour, or constraints that keep the plan from breaking in edge cases.
2. **Construct the JSON** following the schema in `reference/schema.md`. Validate while you build:
   - every `parentId` references an existing `id`
   - when `interactions` exists, every `interactions[].source` / `.target` references an existing `id`
   - when `interactions` exists, every `interactions[].flow` is a consecutive number starting at `1` within that state
   - optional diagram positions reference existing glossary ids
   - optional edge positions/types/styles use the values listed in `reference/schema.md`
   - `type` is one of `term` | `client` | `server` | `cloud-service` | `class` | `function` | `db` | `table`
   - `pairs` and top-level `currentState`/`proposedState` are mutually exclusive — pick one form
   - every `scenes[].interactionFlows[]` references an existing `interactions[].flow` in the same state
   - every `evidence[]` item has a `path`; include `startLine` / `endLine` when known

## Kaisetsu-style authoring rules

- Pick one metaphor first and keep it to the end. Do not mix "restaurant", "factory", and "post office" in the same plan.
- Make the glossary an actor list, not a dry dictionary. Names can stay technical, but `persona`, `analogy`, and `responsibility` should translate them into human roles.
- Write scenes in time order. Prefer "受付係がチケットを確認する" over "validation occurs".
- Put the story before the graph in the reader's mental model: the viewer renders narrative panels above each diagram, so the graph becomes confirmation rather than the first obstacle.
- When explaining a change, include a `comparison` table and at least one "why the simple alternative is not enough" note in `comparison[].note` or `safeguards[]` when relevant.
- Add evidence references for code-backed plans. Use `{ "path": "src/file.ts", "startLine": 10, "endLine": 25, "label": "..." }`. If exact lines are unavailable, use a file path and mark it as a broad reference.
- End the plan and important pairs with `takeaway`: one or two lines that preserve the metaphor and state the essence.
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
    { "id": "a", "type": "client", "name": "A" },
    { "id": "b", "type": "server", "name": "B" }
  ],
  "proposedState": {
    "description": "…",
    "interactions": [
      { "flow": 1, "source": "a", "target": "b", "label": "calls", "data": "Payload" }
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
