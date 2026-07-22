---
name: add-traveling-spirit
description: Add a Traveling Spirit
disable-model-invocation: true
---

Task:
Add a new traveling spirit to the data files.
The user prompts the name of the spirit and a spirit-tree json file that contains the spirit tree and spirit tree node data.

Important:
- Modify source assets in `/src/assets/**` only.
- Never modify generated files in `/assets/**`.

When looking up data, use the following information:

- When a guid is needed, run the command `npx nanoid -s 10`.
- Spirits are defined in files contained in `/src/assets/spirits/seasons`. Use the prompted spirit name and fetch the guid from these files. This is needed for the spirit field in the traveling spirit entry.
- Determine the season file by locating the spirit in `/src/assets/spirits/seasons/*.jsonc`. The matched file name (for example `rhythm.jsonc`) is the season file name to use for nodes and items.
- The provided data file contains the traveling spirit tree payload and may include a nodes array and items array.

Step 1: Resolve spirit and season

1. Find the spirit by exact `name` in `/src/assets/spirits/seasons/*.jsonc`.
2. Read its `guid` for the traveling spirit `spirit` reference.
3. Record the matched season file name (example: `rhythm.jsonc`) for later steps.

Step 2: Add a traveling spirit entry

Modify `/src/assets/traveling-spirits/traveling-spirits.jsonc` and add a new entry at the bottom of the file, matching the format of the previous entry including comments.

Rules for the new entry:
- `guid`: generate a new unique guid with `npx nanoid -s 10`.
- `date`: set to previous traveling spirit date + 14 days; this should be a Thursday.
- `spirit`: use the resolved spirit guid from Step 1.
- `tree`: use the spirit-tree guid from the provided data.
- Keep numbering comment format consistent with the existing list (`// <number> - <Spirit Name>`), incremented from the last entry.

Step 3: Add tree data

Add the provided spirit-tree entry to `/src/assets/spirit-trees/seasons/seasons.jsonc`.

Rules:
- Preserve existing style and grouping comments.
- Keep the provided tree `guid` unchanged (this is the guid referenced by the traveling spirit entry).
- Ensure tree references point to node guids that exist after Step 4.

Step 4: Add node data

Add node entries from the provided data to the correct season nodes file:

- Target path: `/src/assets/nodes/seasons/<season-file>.jsonc` where `<season-file>` comes from Step 1.
- Insert in the season/spirit region following local formatting and comment conventions.
- Keep provided node guids unchanged.
- Ensure internal node links (`n`, `nw`, `ne`, etc.) and `item` references remain valid.

Step 5: Add item data (if provided)

If the provided data includes items, add them to
`/src/assets/items/seasons/<season-file>.jsonc` following the **`add-item`** skill for the
item data model, ids and conventions. In addition:

- Do not duplicate items that already exist (returning trees re-offer existing cosmetics, only the nodes are new).

Step 6: Validate references and consistency

Before finishing, verify:

1. New traveling spirit references existing `spirit` and newly added `tree` guids.
2. Tree references node guids present in the target season nodes file.
3. Node `item` guids exist in the target season items file when applicable.
4. JSONC formatting, commas, and comments are valid and consistent with neighboring entries.
