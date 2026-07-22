---
name: add-event-instance
description: Add a new instance of an existing (recurring) event — instance, spirit, tree, nodes, items, IAPs and shops.
disable-model-invocation: true
---

Task:
Add a new **event instance** (e.g. "Days of Color 2026") to the data files, wiring up every related entity:
event instance → event, event instance spirit + spirit tree + nodes, items, IAPs, and shops.

The user provides:
- The **event name** (e.g. `Days of Color`).
- The instance **date range** (`date`, `endDate` as `YYYY-MM-DD`).
- Either the **item/price data directly**, or a **wiki link** to open and read with the Playwright MCP.

## Ground rules

- Modify source assets in `src/assets/**` only. Never touch generated files in `/assets/**`.
- Generate every new `guid` with `npx nanoid -s 10` (length 10). `guid`s must be globally unique — the build aborts on duplicates.
- Dates are `YYYY-MM-DD` strings resolved on `America/Los_Angeles`. Don't convert to UTC.
- **Reuse existing guids** for entities that already exist (the event, the recurring spirit/guide, recurring items, recurring IAPs). Only mint new guids for genuinely new entities.
- Read the relevant `src/interfaces/*.interface.ts` before writing each entity and match the actual field names. The shapes below are a guide, not a substitute for checking.
- Match the formatting, comment style, and `// #region <Event> (<year>)` grouping of the neighbouring entries in each file. Some files use one-line objects (see Days of Color 2025), some multi-line — follow the file's local style.

## Step 0: Locate the event's existing files

A "top-level folder under `src/assets/`" → one output file; subfolders are organizational only. Each recurring event has a per-event file in several folders, but **file names are not always the event slug**. For example, Days of Color items live in `items/events/days-of-rainbow.jsonc` (legacy name), while its nodes/shops/iaps use `days-of-color.jsonc`, and all event spirit trees share one file.

For the target event, find the existing file in each folder (search by the event's region comment / existing guids, not by guessing the slug):

| Entity | Location |
| --- | --- |
| Event | `src/assets/events/<file>.jsonc` |
| Event instances | `src/assets/event-instances/<file>.jsonc` |
| Event instance spirits | `src/assets/event-instance-spirits/<file>.jsonc` |
| Spirit trees | `src/assets/spirit-trees/events/events.jsonc` (single shared file) |
| Nodes | `src/assets/nodes/events/<file>.jsonc` |
| Items | `src/assets/items/events/<file>.jsonc` (may be a legacy name) |
| IAPs | `src/assets/iaps/events/<file>.jsonc` |
| Shops | `src/assets/shops/events/<file>.jsonc` |
| Event/IAP-guide spirits | `src/assets/spirits/events/events.jsonc` (single shared file) |

If a brand-new event (no existing files), create `<event-slug>.jsonc` in each folder and add the event itself to `src/assets/events/`. Otherwise append to the existing files.

## Step 1: Gather instance data

If the user gave the data directly, use it. Otherwise open the provided wiki link with Playwright MCP (`browser_navigate` then `browser_snapshot`) and read:
- New cosmetics/items for this instance (name, type, icon URL, preview URL, dye info, wiki anchor).
- The spirit tree layout and the **cost of each node** (candles `c`, hearts `h`, event currency `ec`, etc.).
- IAP packs and prices (new packs vs. returning packs).

Confirm anything ambiguous with the user before writing.

**In-game-currency items not sold by the main guide:** the main spirit tree (Step 3) covers items bought with in-game currency from the event's primary guide. If some in-game-currency items are sold *elsewhere* — a different vendor/box/mannequin, an item list, a separate tree, etc. — there is no single right way to model it, so **ask the user how to represent them** before writing (e.g. a `type: "Object"` shop backed by an `item-lists/events/<file>.jsonc` item list whose `IItemListNode`s carry the `ICost`, a second event instance spirit + tree, or something else). IAPs (real-money packs) always follow Steps 5–6 regardless.

## Step 2: Add items

Append the instance's **new** items to the items file (Step 0), following the **`add-item`**
skill for the item data model, ids, image links and conventions. Reuse existing guids for any
returning item — do not duplicate. Event-specific notes:

- Do **not** set `season` on event items (`season` is only for season trees and IAPs).
- "Random Trail Spell", "Cutscene", warps etc. are `type: "Special"` filler nodes — include them if the tree has them.

## Step 3: Build the spirit tree + nodes

Create the tree for this instance's spirit.

1. **Nodes** → append a new `// #region <Event> (<year>)` block to the nodes file. Each node is an `INode`: `guid`, optional `item` (item guid), cost fields from `ICost` (`c`/`h`/`sc`/`ec`/…), and links `n`/`nw`/`ne` to child node guids. The root node is the one no other node points to; build the layout from the wiki, applying the costs from Step 1 and `item` references from Step 2.
2. **Tree** → append one entry to `spirit-trees/events/events.jsonc` under the event's region: `{ "guid": "<new-tree-guid>", "node": "<root-node-guid>" }`.

## Step 4: Add the event instance spirit

Append to the event-instance-spirits file an `IEventInstanceSpirit`:
- `guid`: new.
- `tree`: the new tree guid from Step 3.
- `spirit`: **reuse the previous instance's spirit guid by default** (recurring events keep the same guide spirit across years — verify by looking at the prior instance's spirit). If the user indicates a different/new spirit, ask which, and create it in `spirits/events/events.jsonc` (`type: "Event"`) if it doesn't exist.

## Step 5: Add IAPs

Append IAPs to the iaps file under a new region. For each pack (`IIAP`): `guid` (new), `name`, `price` (USD), optional bundled currency `c`/`sc`/`sp`, and `items` (array of item guids).

- **New IAPs** (debuting this instance): no `returning` flag.
- **Recurring IAPs** (packs sold in a previous instance): set `"returning": true`. Reuse the item guids from the original pack.

## Step 6: Add shops and link them

Append shops to the shops file under a new region. Each `IShop` has `type` (`Store` | `Spirit` | `Object`), optional `name`, and `iaps` (array of IAP guids). Group IAPs into shops by these rules:

- **New IAPs → a `Store` shop** (`{ "type": "Store", "iaps": [...] }`).
- **Recurring IAPs →** check whether the event has an **event-specific spirit IAP guide** — a spirit in `spirits/events/events.jsonc` named like `"<Event> IAP Guide"`, and/or the prior instance's recurring shop was `type: "Spirit"` with a `spirit` reference.
  - If yes → a `Spirit` shop referencing that guide: `{ "type": "Spirit", "spirit": "<guide-guid>", "iaps": [...] }`.
  - If no → default to an **`Object` shop named `"IAP Prop Box"`**: `{ "type": "Object", "name": "IAP Prop Box", "iaps": [...] }`.

Collect the new shop guids for Step 7.

## Step 7: Add the event instance and wire references

1. Append a new `IEventInstance` to the **end** of the instances array in the event-instances file:
   - `guid`: new.
   - `date`, `endDate`: from the user.
   - `spirits`: `["<event-instance-spirit-guid from Step 4>"]`.
   - `shops`: array of the shop guids from Step 6.
   - `name`/`shortName`: only if this instance's name differs from earlier ones (older Color instances set `"Days of Rainbow"`; recent ones omit it). Omit when it matches the event.
   - `_calendar`: add if the user provides a calendar link (see existing instances for shape).
   - `calculatorData` (`ICalculatorData`): **ask the user**, proposing this default — `dailyCurrencyAmount: 5` plus one `timedCurrency` entry of `amount: 15` (a new `guid`, `description: "Bonus event currency"`) whose `date`/`endDate` match this instance's `date`/`endDate`. Apply the user's answer; only add the key if there is event currency to model. Shape:
     ```jsonc
     "calculatorData": {
       "dailyCurrencyAmount": 5,
       "timedCurrency": [
         { "guid": "<new>", "date": "<instance date>", "endDate": "<instance endDate>", "amount": 15, "description": "Bonus event currency" }
       ]
     }
     ```
   - **Do not add a `number` field** — although `IEventInstance.number` is typed as required, the resolver already handles setting this value.
2. Append the new instance guid to the **end** of the event's `instances` array in `src/assets/events/<file>.jsonc`.

## Step 8: Validate

1. Run `npm run json-build` — it must succeed (it enforces globally unique guids and array-shaped files). Fix any duplicate-guid or syntax errors.
2. Verify references resolve:
   - Event `instances` includes the new instance guid; instance `spirits`/`shops` point to the new entities.
   - Event instance spirit `tree` → the new tree; tree `node` → an existing root node; every node link (`n`/`nw`/`ne`) and `item` guid exists.
   - Every IAP `items` guid and every shop `iaps` guid exists; recurring IAPs have `"returning": true`.
3. Optionally run `npm test` (requires a build first) to parse and resolve the full dataset.
4. Report a summary of every guid added and which files changed.
