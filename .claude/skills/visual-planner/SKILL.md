---
name: visual-planner
description: Generate a plan-viewer JSON (glossary + currentState/proposedState), URL-safe base64 encode it, and produce a file:// URL to the bundled plan-viewer so the user can open it in a browser without running any server. Use this whenever the user asks to visualize an implementation plan, architecture change, before/after design, or data-flow diagram for a feature.
---

# visual-planner

Turn a feature idea or migration plan into a **clickable `file://` URL** that opens in the user's browser and renders an interactive plan diagram — no server, no install, no network.

Rendering is done by the pre-built `viewer/` bundle that ships with this skill.

## When to use

Trigger this skill when the user asks to:

- visualize an implementation plan, proposal, or refactor
- diagram a current-vs-proposed architecture
- show the data flow between components for a feature
- produce a "plan viewer URL" / "share this plan as a URL"

Not for: generating code, writing docs, or anything that doesn't boil down to producing the plan JSON.

## Workflow

1. **Gather the plan**. Identify:
   - `title`, `description` — one-line and paragraph summary
   - `glossary[]` — the nodes (features / data / terms). Give each a stable `id`.
     Use `parentId` to nest (max 3 levels; deeper levels are dropped by the viewer).
   - `currentState` (optional) — existing interactions between glossary items
   - `proposedState` (optional) — target interactions after the change
   If the user only has one state, just produce that one; omit the other.
2. **Construct the JSON** following the schema in `reference/schema.md`. Validate while you build:
   - every `parentId` references an existing `id`
   - every `interactions[].source` / `.target` references an existing `id`
   - `type` is one of `term` | `feature` | `data`
3. **Encode and build the URL** by piping the JSON into the helper script:
   ```bash
   node <skill-dir>/scripts/make_url.mjs path/to/plan.json
   ```
   or via stdin:
   ```bash
   echo "$PLAN_JSON" | node <skill-dir>/scripts/make_url.mjs -
   ```
   The script validates the plan (types, unique ids, parentId/interaction references), URL-safe base64-encodes the JSON, and prints a single `file:///.../viewer/index.html?plan=<...>` URL. Requires Node.js — already a dependency of this repo, no install step needed.
4. **Hand the URL to the user**. They can paste it into any browser; `file://` works without `npm install` or any dev server. Mention that the link embeds the plan itself (no file on disk is required after generation).

## Output style

- Be brief in prose. The plan is the payload.
- When returning the URL, put it on its own line so terminals can linkify it.
- If the URL is very long (plans over ~8 KB of JSON), warn the user and suggest trimming descriptions.

## Editing an existing plan

- If the user provides an existing plan URL, base64-decode the `?plan=` parameter (URL-safe base64, may lack padding — re-add `=` until length is a multiple of 4), modify the JSON, then re-run `make_url.mjs`.

## Failure modes & fixes

- `viewer/index.html not found`: the bundle is missing. Ask the user to run `npm run build` inside `plan-viewer/`. The skill repo should ship with `viewer/` pre-built; this error means it was deleted or the repo is in an unusual state.
- Invalid plan JSON: the script prints the specific validation error to stderr. Fix the plan and retry.
- URL too long for some tools: the browser itself handles long `file://` URLs fine, but copy-paste through chat apps can mangle them. Save the URL to a `.url` file or pass it directly.

## Schema quick reference

See `reference/schema.md` for the full schema with examples. Minimum viable plan:

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
