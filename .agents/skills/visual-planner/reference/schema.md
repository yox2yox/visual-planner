# Plan JSON Schema

Reference for the JSON payload consumed by the `viewer/` bundle via the `?plan=<base64url>` query parameter.

## Top-level shape

```jsonc
{
  "title": "string — shown as the page heading",
  "description": "string — one-paragraph summary shown below the title",
  "metaphor": { /* Metaphor — optional but strongly recommended */ },
  "takeaway": "string — optional one-sentence 'ひと言で' summary",
  "evidence": [ /* EvidenceRef[] — optional top-level file/line references */ ],
  "glossary": [ /* GlossaryItem[] — required, at least one */ ],

  // Pick ONE of the following state layouts (never both):

  // A) Multi-pair (preferred when the plan is non-trivial — see "Pair vs. top-level" below)
  "pairs": [ /* StatePair[] — non-empty when present */ ],

  // B) Legacy single-pair shortcut (kept for backwards compatibility)
  "currentState":  { /* State — optional. Omit if there is no 'before' */ },
  "proposedState": { /* State — optional. Omit if there is no 'after'  */ }
}
```

Viewer behaviour:
- If `pairs` is present, it is used. Pairs with no visible state, comparison, safeguard, takeaway, evidence, or description are silently dropped.
- Otherwise, if `currentState` and/or `proposedState` are present, they are wrapped into a single untitled pair.
- If neither is present, only the glossary is rendered.
- Each state architecture diagram renders only glossary nodes referenced by that state's `architectureEdges[].source` / `architectureEdges[].target`. Unused glossary items stay in the glossary panel but do not appear as extra diagram nodes.

Defining `pairs` together with top-level `currentState`/`proposedState` is a validation error.

## GlossaryItem

`glossary[]` defines the items needed to explain the architecture diagrams described by `architectureEdges`.
Use only the granularity required by those diagrams: components, layers, functions, storage,
external systems, contracts, and data concepts that appear as sources, targets, or payloads.
Choose the layer required by the change being explained. A class-local change may only need
`function` nodes; a cross-boundary architecture change may need `client`, `server`,
`cloud-service`, `db`, and `table` nodes.

```jsonc
{
  "id":          "string — unique within glossary[]; used by parentId and architectureEdges",
  "type":        "term" | "client" | "server" | "cloud-service" | "class" | "function" | "db" | "table",
  "name":        "string — short label shown on the node",
  "description": "string — shown in the detail panel on click",
  "icon":        "string — emoji or single glyph. Optional. Defaults by type",
  "parentId":    "string — id of another glossary item. Optional. Nests this node under the parent (max 3 levels — deeper is dropped)",
  "persona":     "string — optional role-name as a person, kaisetsu style",
  "analogy":     "string — optional metaphor-world equivalent",
  "responsibility": "string — optional plain-language duty",
  "evidence":    [ /* EvidenceRef[] — optional file/line references */ ]
}
```

### Types

- `client` — a user-facing client such as a Web browser or mobile app
- `server` — a server-side application, service, or process
- `cloud-service` — managed cloud infrastructure such as S3, Lambda, queues, or hosted auth
- `class` — an object-oriented class
- `function` — a function or class method
- `db` — a database
- `table` — a database table
- `term` — a domain concept, standard, payload concept, or external reference

### Nesting rules

- `parentId` must reference an `id` that exists earlier OR later in the array (order-independent).
- Depth 1 (root) → Depth 2 → Depth 3 is rendered. Depth 4+ nodes are dropped from the view.
- Cycles in `parentId` are not allowed.

## StatePair

```jsonc
{
  "title":         "string — shown as the pair's section header. Required field; empty string '' is allowed and hides the header",
  "description":   "string — optional paragraph shown under the title",
  "currentState":  { /* State — optional */ },
  "proposedState": { /* State — optional */ },
  "comparison":    [ /* ComparisonRow[] — optional before/after table */ ],
  "safeguards":    [ "string — optional defensive details or caveats" ],
  "takeaway":      "string — optional pair-level 'ひと言で'",
  "evidence":      [ /* EvidenceRef[] — optional file/line references */ ]
}
```

A pair with both `currentState` and `proposedState` omitted can still render comparison, safeguards, takeaway, evidence, and description. If it has none of those, it is dropped from the rendered output.

### Pair vs. top-level (when to split)

Prefer `pairs` when any of the following apply:

- a single state contains more than ~10 architecture edges, or
- a single state touches more than ~10 glossary nodes, or
- the plan covers multiple independent design concerns (e.g. auth boundary, API boundary, persistence boundary) that make sense on their own diagrams.

Each pair renders its own AS-IS / TO-BE architecture diagrams under its own header when `architectureEdges` are present. Splitting keeps the diagrams readable; cramming everything into one pair (or the legacy top-level form) makes them hard to follow once the plan grows. If a pair does not need architecture explanation, omit the state diagram and keep the explanation in `description`, `comparison`, `safeguards`, `takeaway`, or `evidence`.

## State

```jsonc
{
  "description":  "string — paragraph explaining this snapshot",
  "architectureEdges": [ /* ArchitectureEdge[] — optional architecture-diagram edges; omit or leave empty when no diagram is needed */ ],
  "diagram":      { /* DiagramOptions — optional manual layout/rendering hints */ },
  "storyTitle":   "string — optional title for the chronological explanation",
  "scenes":       [ /* StoryScene[] — optional kaisetsu-style story */ ],
  "takeaway":     "string — optional state-level one-liner"
}
```

## ArchitectureEdge

```jsonc
{
  "order":  "number — edge number within this state's architecture diagram; starts at 1 and increments by 1",
  "source": "string — glossary id where the dependency, call, boundary, or handoff starts",
  "target": "string — glossary id that receives that dependency, call, boundary, or handoff",
  "label":  "string — short architecture relationship or action phrase shown on the edge (e.g. 'validates token')",
  "data":   "string — payload, entity, responsibility, contract, or result carried on this edge (e.g. 'AuthToken')",

  "sourcePosition": "top" | "right" | "bottom" | "left",
  "targetPosition": "top" | "right" | "bottom" | "left",
  "edgeType":       "default" | "straight" | "step" | "smoothstep",
  "edgeStyle":      "solid" | "dashed" | "dotted" | "bold",
  "animated":       "boolean"
}
```

Both `source` and `target` must exist in `glossary[]`.
`architectureEdges` are architecture-diagram edges: read them by `order` to understand which pieces exist, how they connect, and why the boundary or handoff matters. They are not required for every pair and should not be used to force a diagram onto explanation-only material.
Within each `State`, `order` values must be consecutive numbers: `1`, `2`, `3`, ...
If a state has no `architectureEdges`, the viewer renders its text/narrative but skips the graph for that state.

`sourcePosition`, `targetPosition`, `edgeType`, `edgeStyle`, and `animated` are optional rendering hints. Use them only when the automatic layout makes an important connection hard to follow.

## DiagramOptions

`diagram` is optional and exists only for architecture-diagram readability tuning. Omit it when the default diagram is clear enough, and omit the whole `architectureEdges` list when a diagram is not needed.

```jsonc
{
  "nodePositions": {
    "client": { "x": 0, "y": 80 },
    "server": { "x": 280, "y": 80 },
    "db":     { "x": 560, "y": 80 }
  },
  "edges": {
    "1": {
      "sourcePosition": "right",
      "targetPosition": "left",
      "type": "smoothstep",
      "style": "bold",
      "animated": true
    },
    "server->db": {
      "sourcePosition": "right",
      "targetPosition": "left",
      "type": "straight",
      "style": "dashed"
    }
  }
}
```

- `nodePositions` is keyed by glossary id and uses diagram coordinates in pixels. If any manual positions are present, the diagram uses a flat manual layout for that state; nodes without positions fall back to a simple grid.
- `edges` is keyed by either the architecture edge order as a string (`"1"`) or by `"source->target"`. Order keys are preferred when multiple edges connect the same nodes.
- ArchitectureEdge-level rendering hints override `diagram.edges` for that edge.

## Metaphor

```jsonc
{
  "title": "string — short label for the real-world metaphor",
  "description": "string — how to read the whole plan through that metaphor"
}
```

Use one metaphor throughout the plan. The viewer shows this near the title so readers know the mental model before they see the graph.

## StoryScene

```jsonc
{
  "title": "string — scene heading, e.g. '場面1: 受付係が注文を受ける'",
  "actor": "string — optional glossary id for the main actor",
  "action": "string — what the actor does in plain language",
  "result": "string — optional result of the scene",
  "edgeRefs": [1, 2],
  "evidence": [ /* EvidenceRef[] */ ]
}
```

`edgeRefs` must reference architecture edge numbers that exist in the same state's `architectureEdges`. Scenes are rendered above the diagram, so the reader gets the design explanation before reading arrows.

## ComparisonRow

```jsonc
{
  "label": "string — viewpoint, e.g. '認証情報の置き場所'",
  "current": "string — current behaviour",
  "proposed": "string — proposed behaviour",
  "note": "string — why this matters, including simple-alternative caveats when useful"
}
```

## EvidenceRef

```jsonc
{
  "path": "string — file path or source name",
  "startLine": 10,
  "endLine": 25,
  "label": "string — optional explanation"
}
```

`path` is required when an evidence item is present. Line numbers are optional but should be included for code-backed plans whenever known.

## Minimal example (single pair, legacy form)

```json
{
  "title": "Hello plan",
  "description": "Tiny example.",
  "glossary": [
    { "id": "client", "type": "client", "name": "Client" },
    { "id": "server", "type": "server", "name": "Server" }
  ],
  "proposedState": {
    "description": "Client calls server.",
    "architectureEdges": [
      { "order": 1, "source": "client", "target": "server", "label": "HTTP GET", "data": "Request" }
    ]
  }
}
```

## Multi-pair example

```json
{
  "title": "Hello plan",
  "description": "Two independent design concerns.",
  "glossary": [
    { "id": "client", "type": "client", "name": "Client" },
    { "id": "server", "type": "server", "name": "Server" },
    { "id": "db", "type": "db", "name": "DB" }
  ],
  "pairs": [
    {
      "title": "Read",
      "proposedState": {
        "architectureEdges": [
          { "order": 1, "source": "client", "target": "server", "label": "GET /item", "data": "ItemID" },
          { "order": 2, "source": "server", "target": "db", "label": "SELECT", "data": "ItemID" }
        ]
      }
    },
    {
      "title": "Write",
      "currentState": {
        "architectureEdges": [
          { "order": 1, "source": "client", "target": "server", "label": "POST /item", "data": "ItemBody" }
        ]
      },
      "proposedState": {
        "architectureEdges": [
          { "order": 1, "source": "client", "target": "server", "label": "PUT /item", "data": "ItemBody" },
          { "order": 2, "source": "server", "target": "db", "label": "UPSERT", "data": "ItemRow" }
        ]
      }
    }
  ]
}
```

## Full example

See `plan-viewer/example.json` in the repo root for a 3-level nested, dual-state example (session-based auth → JWT migration).

## Encoding for the URL

The viewer reads its input from `?plan=<urlsafe-base64>`:

1. `JSON.stringify(plan)` — compact (no trailing whitespace helps keep the URL short).
2. UTF-8 encode.
3. Base64 encode.
4. Make URL-safe: `+` → `-`, `/` → `_`.
5. Strip `=` padding.

`make_url.py` does all of this for you. If you decode by hand, re-add `=` padding until length is a multiple of 4 before calling a standard base64 decoder.

## Size guidance

- Chrome's `file://` URL limit is well into the tens of thousands of characters.
- Base64 inflates bytes by ~33%. A 6 KB JSON produces an ~8 KB URL.
- If the plan approaches 10 KB of JSON, trim `description` fields before sharing.
