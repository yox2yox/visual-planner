# Plan JSON Schema

Reference for the JSON payload consumed by the `viewer/` bundle via the `?plan=<base64url>` query parameter.

## Top-level shape

```jsonc
{
  "title": "string — shown as the page heading",
  "description": "string — one-paragraph summary shown below the title",
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
- If `pairs` is present, it is used. Pairs with neither `currentState` nor `proposedState` are silently dropped.
- Otherwise, if `currentState` and/or `proposedState` are present, they are wrapped into a single untitled pair.
- If neither is present, only the glossary is rendered.

Defining `pairs` together with top-level `currentState`/`proposedState` is a validation error.

## GlossaryItem

```jsonc
{
  "id":          "string — unique within glossary[]; used by parentId and interactions",
  "type":        "term" | "feature" | "data",
  "name":        "string — short label shown on the node",
  "description": "string — shown in the detail panel on click",
  "icon":        "string — emoji or single glyph. Optional. Defaults by type: term=📖, feature=⚡, data=💾",
  "parentId":    "string — id of another glossary item. Optional. Nests this node under the parent (max 3 levels — deeper is dropped)"
}
```

### Types

- `feature` — an application component / module / service
- `data` — a data store, payload, or persistent artifact
- `term` — a domain concept, standard, or external reference

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
  "proposedState": { /* State — optional */ }
}
```

A pair with both `currentState` and `proposedState` omitted is dropped from the rendered output (the pair contributes nothing visible).

### Pair vs. top-level (when to split)

Prefer `pairs` when any of the following apply:

- a single state contains more than ~10 interactions, or
- a single state touches more than ~10 glossary nodes, or
- the plan covers multiple independent flows (e.g. login, API call, logout) that make sense on their own diagrams.

Each pair renders its own AS-IS / TO-BE diagrams under its own header. Splitting keeps the diagrams readable; cramming everything into one pair (or the legacy top-level form) makes them hard to follow once the plan grows.

## State

```jsonc
{
  "description":  "string — paragraph explaining this snapshot",
  "interactions": [ /* Interaction[] */ ]
}
```

## Interaction

```jsonc
{
  "source": "string — glossary id that initiates the interaction",
  "target": "string — glossary id that receives the interaction",
  "label":  "string — short verb phrase shown on the edge (e.g. 'login request')",
  "data":   "string — name of the payload / entity flowing on this edge (e.g. 'Credentials')"
}
```

Both `source` and `target` must exist in `glossary[]`.

## Minimal example (single pair, legacy form)

```json
{
  "title": "Hello plan",
  "description": "Tiny example.",
  "glossary": [
    { "id": "client", "type": "feature", "name": "Client" },
    { "id": "server", "type": "feature", "name": "Server" }
  ],
  "proposedState": {
    "description": "Client calls server.",
    "interactions": [
      { "source": "client", "target": "server", "label": "HTTP GET", "data": "Request" }
    ]
  }
}
```

## Multi-pair example

```json
{
  "title": "Hello plan",
  "description": "Two independent flows.",
  "glossary": [
    { "id": "client", "type": "feature", "name": "Client" },
    { "id": "server", "type": "feature", "name": "Server" },
    { "id": "db", "type": "data", "name": "DB" }
  ],
  "pairs": [
    {
      "title": "Read",
      "proposedState": {
        "interactions": [
          { "source": "client", "target": "server", "label": "GET /item", "data": "ItemID" },
          { "source": "server", "target": "db", "label": "SELECT", "data": "ItemID" }
        ]
      }
    },
    {
      "title": "Write",
      "currentState": {
        "interactions": [
          { "source": "client", "target": "server", "label": "POST /item", "data": "ItemBody" }
        ]
      },
      "proposedState": {
        "interactions": [
          { "source": "client", "target": "server", "label": "PUT /item", "data": "ItemBody" },
          { "source": "server", "target": "db", "label": "UPSERT", "data": "ItemRow" }
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
