---
name: add-special-visit
description: Add a Special Visit (Returning Spirits) — visit entry, per-spirit join entries, spirit trees, nodes and items.
disable-model-invocation: true
---

Task:
Add a new Special Visit (also called "Returning Spirits") to the data files.

A Special Visit is a limited-time return of one or more previously-released spirits to an
area. Each visiting spirit gets its **own new spirit tree** (a fresh node chain re-offering
that spirit's cosmetics), and the visit is joined to each spirit through a
`special-visit-spirit` entry.

The user prompts:
- The visit name/number (e.g. `Special Visit #14`) and the area it takes place in.
- The start `date` and `endDate` of the visit.
- The list of returning spirits (by exact name).
- For each spirit, a spirit-tree payload (tree + `nodes` array + optional `items` array).
- Optionally `_wiki` / `_calendar` links and an `imageUrl`.

Important:
- Modify source assets in `/src/assets/**` only.
- Never modify generated files in `/assets/**`.
- When a guid is needed, run the command `npx nanoid -s 10`.

## Data model

A Special Visit spans five source files:

| File | What it holds |
| --- | --- |
| `src/assets/special-visits/special-visits.jsonc` | The visit itself; its `spirits` array holds **special-visit-spirit** guids (NOT spirit guids). |
| `src/assets/special-visit-spirits/special-visit-spirits.jsonc` | One join entry per visiting spirit: `{ guid, spirit, tree }`. |
| `src/assets/spirit-trees/seasons/seasons.jsonc` | One new tree per visiting spirit: `{ guid, node }` pointing at the root node. |
| `src/assets/nodes/seasons/<season>.jsonc` | The new node chain for each spirit, placed in that spirit's `#region`. |
| `src/assets/items/seasons/<season>.jsonc` | Only the **new** items the nodes introduce (re-offered cosmetics already exist). |

Reference chain (resolved in `src/resolver.ts`):
`special-visit.spirits[]` → `special-visit-spirit` → (`spirit`, `tree`) → `tree.node` → node chain → `node.item`.

Each visiting spirit may belong to a **different season**. Resolve the season file per spirit.

## Step 1: Resolve the area

Find the area by its name in `src/assets/areas/*.jsonc` and read its `guid` for the visit
`area` reference.

## Step 2: Resolve each spirit and its season

For every returning spirit:
1. Find the spirit by exact `name` in `src/assets/spirits/seasons/*.jsonc`.
2. Read its `guid` (used as the `spirit` reference in the join entry).
3. Record the matched season file name (e.g. `revival.jsonc`) — this determines the target
   nodes and items files for that spirit's tree.

## Step 3: Add node data

For each spirit, add the provided node chain to
`src/assets/nodes/seasons/<season>.jsonc`, inside that spirit's `#region`, after the
existing nodes for that spirit. Prefix the block with a `// SV <n>` comment (e.g. `// SV 14`),
matching the convention of existing Special Visit nodes.

Rules:
- Keep provided node guids unchanged.
- Ensure internal node links (`n`, `nw`, `ne`, cost fields `c`/`sc`/`ac`) and `item`
  references remain valid.
- Returning trees re-offer existing cosmetics — those `item` guids already exist. Only
  currency/placeholder nodes (e.g. Heart, Wing Buff) introduce new items (Step 4).
- Watch trailing commas: when inserting after the last node before a `// #endregion`, the
  previously-final node needs a trailing comma added.

## Step 4: Add item data (new items only)

For each new item referenced by the new nodes that does not already exist, add it to
`src/assets/items/seasons/<season>.jsonc`.

Rules:
- Add an `id` property to each new item.
- Use `node scripts/next-item-id.mjs` once to get the starting item id, then increment by 1
  for each additional new item across all spirits in this visit.
- If the script returns nothing, derive the starting id from the highest existing `id` in
  the target file(s) plus 1, then keep incrementing.
- Preserve provided item guids and metadata. Do not duplicate items that already exist.

## Step 5: Add spirit tree data

For each spirit, add a tree entry to `src/assets/spirit-trees/seasons/seasons.jsonc`, inside
that spirit's `#region`, after the existing tree(s). Use the compact one-line form with a
`// SV <n>` comment, matching existing Special Visit trees:

```jsonc
{ "guid": "<new-tree-guid>", "node": "<root-node-guid>" }, // SV 14
```

Rules:
- Generate a new `guid` for each tree (or keep the provided tree guid if the payload supplies
  one — it must match the `tree` reference used in Step 6).
- `node` is the root (first) node of that spirit's chain from Step 3.

## Step 6: Add special-visit-spirit join entries

Add one entry per visiting spirit to
`src/assets/special-visit-spirits/special-visit-spirits.jsonc`, at the bottom:

```jsonc
{ "guid": "<new-svs-guid>", "spirit": "<spirit-guid>", "tree": "<tree-guid>" },
```

Rules:
- `guid`: generate a new unique guid.
- `spirit`: the spirit guid from Step 2.
- `tree`: the tree guid from Step 5.
- Keep the entries in the same order as the spirits will be listed in the visit.

## Step 7: Add the special visit entry

Add a new entry at the bottom of `src/assets/special-visits/special-visits.jsonc`, matching
the format of the previous entry:

```jsonc
{
  "guid": "<new-visit-guid>",
  "name": "Special Visit #<n>",
  "area": "<area-guid>",
  "date": "YYYY-MM-DD",
  "endDate": "YYYY-MM-DD",
  "spirits": [ "<svs-guid-1>", "<svs-guid-2>", ... ],
  "_wiki": { "href": "..." },
  "_calendar": { "href": "..." }
}
```

Rules:
- `guid`: generate a new unique guid.
- `name`: increment from the last numbered visit (`Special Visit #<n>`), unless the user
  gives a custom name (e.g. a single-spirit "… Revisit").
- `area`: the area guid from Step 1.
- `date` / `endDate`: as provided (`YYYY-MM-DD`). Numbered visits typically run two weeks
  (endDate = date + 13 days); confirm with the user rather than assuming.
- `spirits`: the special-visit-spirit guids from Step 6, in visit order.
- `imageUrl`, `_wiki`, `_calendar`: include only if provided.

## Step 8: Validate and build

1. Confirm the reference chain resolves: visit `spirits` → existing special-visit-spirit
   guids → existing `spirit` and new `tree` guids → root nodes → items.
2. Ensure all new guids are unique (the build aborts on duplicate guids).
3. Verify JSONC formatting, commas and comments are consistent with neighboring entries.
4. Run `npm run json-build` to confirm the data compiles, then `npm test` to confirm it
   parses and resolves.
