---
name: add-season
description: Add a new Season (tier-format spirit trees) — season entry, guide + season spirits, tier-based spirit trees, tiers, nodes, items, IAPs and shops.
disable-model-invocation: true
---

Task:
Add a new **Season** (e.g. "Season of Carnival") to the data files, wiring up every related
entity: season → spirits (guide + season spirits) → spirit trees → spirit tree tiers → nodes → items,
plus the season's real-money **IAPs** (premium packs) and the **shops** that sell them.

New season spirit trees use the **tier format** (the layout is described by `spirit-tree-tiers`
rows, not by `n`/`nw`/`ne` node links). This is the format used by all recent seasons
(Migration, Lightmending, Carnival) — prefer it unless the user says otherwise.

The user provides:
- The **season name** (e.g. `Season of Carnival`) and its **short name** (e.g. `Carnival`).
- The season **date range** (`date`, `endDate` as `YYYY-MM-DD`) and **year**.
- A **wiki link** to the season page. The season page links to each **season spirit** page,
  and each spirit page holds that spirit's individual spirit tree (nodes, costs, cosmetics).
- Optionally icon/image URLs, a calendar link, and per-node/tree cost data directly.

## Ground rules

- Modify source assets in `src/assets/**` only. Never touch generated files in `/assets/**`.
- Generate every new `guid` with `npx nanoid -s 10` (length 10). `guid`s must be globally
  unique — the build aborts on duplicates.
- Dates are `YYYY-MM-DD` strings resolved on `America/Los_Angeles`. Don't convert to UTC.
- **Do not set `number`** on the season — although `ISeason.number` is required, the resolver
  assigns it automatically (season order). `year` **is** set in the data.
- **Do not set `season`** on spirits or items — the resolver links `spirit.season` /
  `item` back to the season via `season.spirits[]` and the tree chain.
- Read the relevant `src/interfaces/*.interface.ts` before writing each entity and match the
  actual field names. The shapes below are a guide, not a substitute for checking.
- Match the formatting, comment style, and `// #region <Year>` / `// #region <Season>` /
  `// <Spirit Name>` grouping of the neighbouring entries in each file. Follow the file's
  local one-line vs. multi-line style.

## Data model

A tier-format season spans up to eight source files. The season is one output folder → file;
subfolders are organizational only.

| File | What it holds |
| --- | --- |
| `src/assets/seasons/seasons.jsonc` | The season itself; its `spirits` array holds **spirit** guids (guide first, then season spirits in tree order), and its `shops` array holds **shop** guids (IAP shops). |
| `src/assets/spirits/seasons/<season>.jsonc` | One entry per spirit (guide + season spirits); each has `tree` = spirit-tree guid. **New file per season.** |
| `src/assets/spirit-trees/seasons/seasons.jsonc` | One tree per spirit under a new `// #region <Season>`: `{ "guid": "<tree>", "tier": "<root-tier-guid>" }`. |
| `src/assets/spirit-tree-tiers/seasons/<season>.jsonc` | The tier chain for every spirit's tree. **New file per season.** |
| `src/assets/nodes/seasons/<season>.jsonc` | The node entries referenced by the tier rows. **New file per season.** |
| `src/assets/items/seasons/<season>.jsonc` | The new cosmetics/items the nodes **and IAPs** unlock. **New file per season.** |
| `src/assets/iaps/seasons/<season>.jsonc` | The season's real-money premium packs (`IIAP`). **New file per season** (only if the season has IAPs). |
| `src/assets/shops/seasons/<season>.jsonc` | The shops (`IShop`) that sell those IAPs, referenced by the season's `shops`. **New file per season** (only if the season has IAPs). |

Reference chains (resolved in `src/resolver.ts`):
- Trees: `season.spirits[]` → `spirit` → `spirit.tree` → `tree.tier` → tier chain (via `next`) →
  `tier.rows[][]` → `node` → `node.item`.
- IAPs: `season.shops[]` → `shop` → `shop.iaps[]` → `iap.items[]` → `item`.

Use the **season slug** (kebab-case short name, e.g. `carnival`) for the per-season file names
(nodes, items, tiers, spirits, iaps, shops).

## Step 1: Gather season and spirit data

**Fetch every wiki page with Playwright MCP** — `browser_navigate` to the URL, then
`browser_snapshot` to read the rendered page. This is the tried-and-tested approach; the
fandom wiki renders spirit trees and infoboxes client-side, so plain HTTP fetches miss data.
Do **not** fall back to `WebFetch`, `curl`, or the fandom `api.php` — they are unreliable for
this wiki and are not permitted here. If Playwright MCP is not available in the session, stop
and ask the user to enable it rather than substituting another fetch method.

1. `browser_navigate` to the season wiki link, then `browser_snapshot`. Read: season dates,
   icon/image URLs, and the list of **season spirits** (including the **season guide**), in
   order, each linking to its own spirit page.
2. For each spirit page, `browser_navigate` + `browser_snapshot` and read the **spirit tree**: the cosmetics/items it unlocks, the tree
   **layout** (which nodes sit in which rows / spurs), and the **cost of each node**
   (candles `c`, hearts `h`, seasonal candles `sc`, seasonal hearts `sh`, ascended candles
   `ac`, etc. — see `ICost` in `src/interfaces/`).
3. Read the season's **IAP / premium-pack data**. On the wiki this is a section titled
   **"Premium Packs (In-App Purchases)"** — each pack has a **name**, a **USD price**, one or more
   **cosmetic items**, and is sold from a named vendor (typically one or more **mannequins**, e.g.
   "left mannequin"/"right mannequin" at a themed location, or a store). Seasonal IAPs are usually
   available permanently. Note which items belong to which pack and which mannequin/store sells it.
   Model **only** these real-money cosmetic packs as IAPs — do **not** model the Season Pass /
   Adventure Pass / Season Gift Pass itself as an IAP (those are the in-tree `sh`/Season-Pass reward
   nodes handled by the trees).
4. Confirm anything ambiguous with the user before writing (spirit order, guide identity,
   currency types, IAP pack contents, and how IAP items group into shops).

### Reading the season guide's tree (two-table layout)

The **season guide** page frequently renders its tree as **two separate wiki tables** that
must be read as **one combined tree**:

- A **multi-column table** (2 columns) — typically the *Quest Tree*: seasonal quests running
  down one column and their unlocked cosmetics/props down the other.
- A **single-column table** (1 column) — typically the *Friendship Tree* Ultimate Gifts: the
  free starter **pendant/necklace**, the seasonal-heart (`sh`) Ultimate Gifts, and the
  **Season Pass** reward. This table usually ends in a `Total: N + SP` summary row (drop that
  row — it is a total, not a node).

Combine them into the single tier chain like this:

- The single-column table is the **rightmost column** of the combined tree.
- Fill it **bottom-up**: the table's *first* node (the free pendant) sits at the **bottom**
  (the tree root / first tier), with the remaining Ultimate Gifts and the Season Pass reward
  stacking upward above it. The wiki lists this column top-down, so reverse it when mapping to
  tiers (tier chains are built root-first via `next`).
- The multi-column table supplies the other columns (left / center) of the same tiers, aligned
  by tree row.

Model the whole guide as **one** spirit with **one** tier chain (not two trees). If a page's
layout is unclear or the two tables don't align cleanly, confirm the combined layout with the
user before writing.

## Step 2: Add items

Create `src/assets/items/seasons/<season>.jsonc` (a JSONC array) and add every new cosmetic
unlocked across all the season's trees **and its IAP packs** (Step 7), following the
**`add-item`** skill for the item data model, ids, image links and conventions. IAP cosmetics
are items too — add them here, then reference their guids from the IAPs. Season-specific notes:

- Set `group` (`ItemGroup`) only by **availability**, not by "it's an IAP": use `"Limited"`
  **only** for items not planned to return (collab / limited-time). IAP cosmetics that the wiki
  says are **available permanently** get **no `group`**. Match neighbouring items.
- Do **not** set `season` on the item (this holds for tree items **and** IAP items).
- "Random Trail Spell", "Cutscene", warps, Heart/Wing Buff placeholder nodes etc. are
  `type: "Special"` filler nodes — include them if the trees have them.

## Step 3: Add nodes

Create `src/assets/nodes/seasons/<season>.jsonc` (a JSONC array). Add one `INode` per tree
position, grouped by a `// <Spirit Name>` comment per spirit (guide first).

- In tier format nodes carry **no `n`/`nw`/`ne` links** — the tier `rows` (Step 4) define the
  layout. Each node is `{ "guid": "<new>", "item": "<item-guid>", <cost fields> }`.
- Apply the per-node costs from Step 1 (`c`/`h`/`sc`/`sh`/`ac`/…). Free nodes omit cost fields.
- `item` references the item guid from Step 2 (omit for pure-currency/special nodes without a
  cosmetic, if any).

## Step 4: Add spirit tree tiers

Create `src/assets/spirit-tree-tiers/seasons/<season>.jsonc` (a JSONC array). Build the tier
chain for every spirit, grouped by a `// <Spirit Name>` comment (guide first).

Each `ISpiritTreeTier` is:
```jsonc
{
  "guid": "<new-tier-guid>",
  "next": "<next-tier-guid>",   // omit on the last tier of a spirit's chain
  "rows": [
    ["<node>", "<node>", "<node>"],   // up to 3 columns; use null for empty cells
    [null, null, "<node>"]
  ]
}
```

Rules:
- Only `guid`, `next`, and `rows` appear in the source — the resolver derives `prev`/`root`/
  `tree` from `next` and the tree reference.
- A tier's `rows` hold the node guids from Step 3. Each row is a `[INode?, INode?, INode?]`
  triple (left / center / right); use `null` for empty positions. Match the tree's visual
  layout from the wiki.
- The **first tier** of each spirit's chain is the one referenced by that spirit's tree in
  Step 5. Chain the remaining tiers with `next`; the deepest tier omits `next`.
- Keep each spirit's tiers contiguous and in order.

## Step 5: Add spirit trees

Append a new `// #region <Season>` block to the **end** of
`src/assets/spirit-trees/seasons/seasons.jsonc`, with one entry per spirit (guide first, same
order as the season `spirits` array):

```jsonc
// #region <Season>
{ "guid": "<tree-guid>", "tier": "<root-tier-guid>" },
...
// #endregion
```

Rules:
- New `guid` per tree. `tier` = the **first** tier guid of that spirit's chain from Step 4.
- These tree guids are what the spirits reference in Step 6.
- (Revised trees, e.g. an after-season rework, add a second entry with
  `"revisionType": "AfterSeason"` and go in `spirit.treeRevisions` — out of scope for the
  initial add unless the user provides one.)

## Step 6: Add spirits

Create `src/assets/spirits/seasons/<season>.jsonc` (a JSONC array). Add one `ISpirit` per
spirit, guide first, then season spirits in tree order:

```jsonc
{
  "guid": "<new-spirit-guid>",
  "type": "Guide",        // the season guide; season spirits use "Season"
  "name": "<Spirit Name>",
  "imageUrl": "...",      // if known
  "tree": "<tree-guid>",  // from Step 5
  "_wiki": { "href": "https://sky-children-of-the-light.fandom.com/wiki/<Spirit_Page>" }
}
```

Rules:
- Exactly one `type: "Guide"` (the season guide); every other season spirit is `type: "Season"`.
- `tree` = the matching tree guid from Step 5.
- Do not set `season` (the resolver links it back from the season).

## Step 7: Add IAPs

If the season has premium packs (Step 1), create `src/assets/iaps/seasons/<season>.jsonc` (a
JSONC array). Add one `IIAP` per pack:

```jsonc
{
  "guid": "<new-iap-guid>",
  "name": "<Pack Name>",   // the pack's display name (e.g. "Wheatfield Cape")
  "price": 14.99,           // USD
  "items": ["<item-guid>", ...]   // the cosmetic item guids from Step 2 (one or more)
}
```

Rules:
- New `guid` per IAP. `items` are the item guids added in Step 2 for that pack (a pack may bundle
  several cosmetics, e.g. a cape + neck accessory).
- Seasons usually don't bundle currency into cosmetic IAPs, but `c` (candles), `sc` (season
  candles), and `sp` (Season Gift Passes) are available on `IIAP` if a pack includes them.
- Do **not** create IAPs for the Season Pass / Adventure Pass reward line itself — those are tree
  nodes, not IAPs.
- Skip this step (and Step 8) entirely if the season has no premium packs; leave `shops: []` in
  Step 9.

## Step 8: Add shops and link them

Create `src/assets/shops/seasons/<season>.jsonc` (a JSONC array). Each `IShop` has `type`
(`Store` | `Spirit` | `Object`), optional `name`, and `iaps` (array of IAP guids). Group the
Step 7 IAPs into shops by how the wiki says they're sold:

- **Sold from a named mannequin / prop / vendor** → an `Object` shop named after that vendor:
  `{ "guid": "<new>", "type": "Object", "name": "<Mannequin Name>", "iaps": [...] }`. When the
  wiki lists multiple mannequins (e.g. "left mannequin"/"right mannequin"), make one `Object`
  shop per mannequin and split the IAPs accordingly.
- **Sold from a generic in-game store** (no named vendor) → a `Store` shop:
  `{ "guid": "<new>", "type": "Store", "iaps": [...] }`.

Match how the neighbouring seasons' shop files group things (see `src/assets/shops/seasons/`).
Collect the new shop guids for Step 9.

## Step 9: Add the season entry and wire references

Append a new `ISeason` inside the correct `// #region <Year>` in
`src/assets/seasons/seasons.jsonc` (add the region if the year is new), matching neighbouring
entries:

```jsonc
{
  "guid": "<new-season-guid>",
  "name": "Season of <Name>",
  "shortName": "<Short Name>",
  "iconUrl": "...",
  "imageUrl": "...",
  "imagePosition": "top",     // only if the neighbours use it
  "year": <year>,
  "date": "YYYY-MM-DD",
  "endDate": "YYYY-MM-DD",
  "spirits": [ "<guide-guid>", "<spirit-guid>", ... ],   // from Step 6, guide first, tree order
  "shops": [ "<shop-guid>", ... ],   // from Step 8; [] if the season has no IAPs
  "_wiki": { "href": "..." },
  "_calendar": { "href": "..." }
}
```

Rules:
- New `guid`. **Do not add `number`** (resolver assigns it).
- `spirits`: the spirit guids from Step 6 — **guide first**, then season spirits in tree order.
- `shops`: the shop guids from Step 8 (the IAP shops); `[]` if the season has no premium packs.
- `calculatorData` (`ICalculatorData`): add only if the user provides bonus/compensation
  seasonal-currency events. Shape (per entry): `{ guid, date, endDate, amount, description }`
  under `timedCurrency`. Ask the user rather than assuming.
- `includedTrees`: only for trees introduced during the season that are **not** season spirit
  trees (e.g. a Traveling-Spirit rework debuting in-season). Omit unless the user calls it out.
- `imageUrl`, `iconUrl`, `_calendar`: include only if provided.

## Step 10: Validate and build

1. Run `npm run json-build` — it must succeed (enforces globally unique guids and array-shaped
   files). Fix any duplicate-guid or syntax errors.
2. Verify the reference chains resolve:
   - Season `spirits` → the new spirit guids (guide first); every spirit `tree` → a new tree.
   - Each tree `tier` → the root tier; every tier `next` points to an existing tier; every node
     guid in `tier.rows` exists in the nodes file.
   - Every node `item` guid exists in the items file; every new item has a unique `id`.
   - Season `shops` → the new shop guids; every shop `iaps` guid exists in the iaps file; every
     IAP `items` guid exists in the items file.
3. Run `npm test` (requires a build first) to parse and resolve the full dataset.
4. Report a summary of every guid added and which files were created/changed.
