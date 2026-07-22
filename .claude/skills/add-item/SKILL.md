---
name: add-item
description: Add or edit a cosmetic/item in the dataset — fields, types, groups, image links, ids and guids.
---

Task:
Add one or more **items** (cosmetics and other unlockables) to the data files, or edit an
existing item. This skill defines the item data model and conventions; other skills
(traveling spirit, special visit, event instance, season) refer here when they add items.

Based on the SkyGame-Planner item contribution guide:
https://github.com/Silverfeelin/SkyGame-Planner/wiki/Contributing-%E2%80%90-Items

## Ground rules

- Modify source assets in `src/assets/items/**` only. Never touch generated files in `/assets/**`.
- Every item needs a globally-unique `guid` (nanoid length 10 — `npx nanoid -s 10`) and, unless
  told otherwise, a unique numeric `id`.
- Read `src/interfaces/item.interface.ts` for the authoritative shape (`IItem`, `ItemType`,
  `ItemSubtype`, `ItemGroup`, `IItemDye`). The summary below is a guide, not a substitute.
- Match the formatting, comment style and grouping (`// #region ...`) of neighbouring entries
  in the target file. Follow the file's local one-line vs. multi-line object style.

## Where items live

Each top-level folder under `src/assets/` → one output file; subfolders are organizational.
Items are grouped by source:

| Source | File |
| --- | --- |
| Season spirits/trees | `src/assets/items/seasons/<season>.jsonc` |
| Events | `src/assets/items/events/<file>.jsonc` (may be a legacy slug — search by region/guid, don't guess) |
| Realms (base-game spirits) | `src/assets/items/realms/<realm>.jsonc` |
| Base game / other | `src/assets/items/base.jsonc`, `other.jsonc`, `store.jsonc`, `friends.jsonc`, `unsorted.jsonc` |

Add each item to the file matching where it is obtained. When a calling skill specifies the
target file, use that.

## Item ids

- Run `node scripts/next-item-id.mjs` **once** to get the starting numeric `id`, then increment
  by 1 for each additional new item in this batch.
- If the script returns nothing/errors, abort.
- Reused/returning items keep their existing `id` and `guid` — never duplicate them.
- When data is provided, preserve provided item ids, guids and metadata. Check for clashes with existing data. For example, if the data uses ids that already exist according to the next-item-id script.

## Fields (`IItem`)

- **`guid`** (required) — new nanoid(10).
- **`id`** (required for new items) — see above.
- **`type`** (required) — an `ItemType` value. Determines the closet category:
  - Accessories/wearables: `HairAccessory`, `HeadAccessory`, `Hair`, `Mask`, `FaceAccessory`,
    `Necklace`, `Outfit`, `Shoes`, `OutfitShoes`, `Cape`.
  - `Held` (held items/instruments), `Furniture`, `Prop` (placeable props).
  - Expression/ability: `Emote`, `Stance`, `Call` (honks), `Spell`, `Music` (music sheets).
  - Special/non-cosmetic: `Quest`, `WingBuff`, `Special` (candle blessings, cutscenes,
    warps, random-trail-spell and other filler tree nodes).
- **`name`** (required) — the cosmetic's exact name. For spirit cosmetics use
  `"<spirit name> <cosmetic type>"` (e.g. `"Pointing Candlemaker Hair"`). Check the
  Sky: Children of the Light Wiki when unsure.
- **`subtype`** — `Instrument` (usable/playable held items) or `FriendEmote` (friend-only emotes).
- **`group`** — availability context: `Elder` (ascended-candle purchases), `SeasonPass`
  (season pass exclusives), `Ultimate` (season hearts/ultimate gifts), `Limited`
  (non-returning collabs/events).
- **`level`** — emote level. Add one item per level when an emote has multiple levels.
- **`sheet`** — music sheet reference (for `Music` items).
- **`order`** — sort order within its category; match the scale used by neighbours.
- **`icon`** — closet icon URL.
- **`previewUrl`** — larger preview image URL.
- **`dye`** (`IItemDye`) — dye slots: `primary` / `secondary` (each `IItemDyeSpec`, optional
  `cost`), plus `previewUrl` and `infoUrl`. See below.
- **`_wiki`** — `{ "href": "<wiki url with #anchor>" }`.
- Do **not** set `season` on items — the resolver assigns it (and it only applies to season
  trees and IAPs). Do not add reference arrays (`nodes`, `iaps`, etc.) — those are resolved
  from the referencing entities.

## Images

- **Icons / previews:** copy the **direct** image link from the Sky Wiki
  (`https://static.wikia.nocookie.net/...`). Match the URL style of neighbouring items.
- **Missing images:** a direct link from a free host (e.g. Imgur) is acceptable as a placeholder.
- **Dye previews:** these images live in the Planner project and are referenced with a
  **root-relative** path, e.g. `https://sky-planner.com/assets/game/dyes/<slot>/<file>.jpg`.
  New dye preview images are added to the Planner's dyes folder via a separate PR.

Example item (multi-line style):

```jsonc
{
  "id": 3195,
  "guid": "2cm-8PvvzE",
  "type": "Prop",
  "name": "Bulb Field Painting Prop",
  "icon": "https://static.wikia.nocookie.net/.../icon.png",
  "previewUrl": "https://static.wikia.nocookie.net/.../preview.png",
  "_wiki": { "href": "https://sky-children-of-the-light.fandom.com/wiki/...#Prop" },
  "order": 13100
}
```

Example dye block:

```jsonc
"dye": {
  "previewUrl": "https://sky-planner.com/assets/game/dyes/cape/Base_green.jpg",
  "primary": {}
}
```

## Steps

1. Determine the target items file(s) from where the item is obtained (table above), or use the
   file the calling skill specified.
2. Gather each item's details (name, type, group/subtype, icon + preview URLs, dye, wiki link).
   Confirm anything ambiguous with the user.
3. Assign ids (`node scripts/next-item-id.mjs`) and mint a guid per new item.
4. Append the items to the target file, matching neighbouring formatting and region comments.
   Reuse existing guids/ids for returning items instead of duplicating.
5. Run `npm run json-build` — it must succeed (enforces array-shaped files and globally unique
   guids). Fix any duplicate-guid or syntax errors.
6. Optionally run `npm test` (needs a build first) to confirm the data parses and resolves.
