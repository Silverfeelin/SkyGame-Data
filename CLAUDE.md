## What this is

A fan-made **data repository** for *Sky: Children of the Light*. It is the data source for [SkyGame-Planner](https://github.com/Silverfeelin/SkyGame-Planner) and is published to npm as `skygame-data`. The repo is two things at once:

1. A hand-edited dataset of `.jsonc` source files under `src/assets/`.
2. A small TypeScript library (`src/`) that consumers use to parse and resolve that data.

Most contributions are **data edits**, not code. The data is tightly coupled to the Sky Planner (e.g. some fields reference image assets that live in that project).

## Commands

```bash
npm run json-build   # Compile src/assets/**/*.jsonc → minified /assets/*.json + everything.json
npm run build        # json-build, then tsc (compiles src/ → dist/)
npm run serve        # Watch src/assets and re-run json-build on change (chokidar, 300ms debounce)
npm test             # Run tests/try-parse.ts via tsx — parses & resolves the built data
node scripts/next-item-id.mjs   # Print the next free numeric item id
```

There is no lint step. `npm test` requires `/assets` to be built first (run `npm run json-build` or `npm run build`).

## Build pipeline (src/assets → /assets)

`src/scripts/json-build.cjs` is the heart of the build:

- Each **top-level folder** under `src/assets/` becomes one output file, e.g. `src/assets/events/**` → `/assets/events.json`. The folder name is camelCased for the key in `everything.json` (`event-instances` → `eventInstances`).
- Subfolders are read **recursively** and flattened — folder structure inside an asset folder is purely organizational and does not affect output.
- Every source file must be a **JSONC array** (`[ ... ]`); the build wraps it as `{ "items": [ ... ] }`. A non-array file aborts the build.
- The build enforces **globally unique `guid`s** across all files and aborts on duplicates.
- `everything.json` aggregates every asset into `{ realms: {items:[...]}, areas: {items:[...]}, ... }`.

Output (`/assets`) is generated — never hand-edit it. Edit the `.jsonc` sources.

## Data model & GUIDs

Entities reference each other by **`guid`** (a nanoid of length exactly 10), used like a foreign key — a referenced object is stored as its GUID string, not inlined. One-to-many relations are arrays of GUID strings. Absent references omit the key entirely.

The command `npx nanoid -s 10` is used to generate GUIDs suited for the project.

Items additionally have a unique **numeric `id`** (used by the Planner for compact Base36 URL encoding). Use `node scripts/next-item-id.mjs` to get the next id when adding items.

**Dates** are `YYYY-MM-DD` strings. The game resets on `America/Los_Angeles` time — always resolve dates through `SkyDateHelper.fromStringSky` (see `src/helpers/date-helper.ts`), never assume UTC.

## Library code (`src/`)

- `src/index.ts` — public entry; re-exports the resolver, helpers, and interface types. `package.json` `main`/`types` point at `dist/`.
- `src/resolver.ts` — **`SkyDataResolver`**. `resolve(data)` mutates the parsed `everything.json` **in place**, replacing GUID strings with live object references and building reverse/circular links (e.g. `area.spirits` ↔ `spirit.area`). Because of these circular references the resolved object **cannot be `JSON.stringify`'d**. The `resolveX()` methods run in a deliberate order (see `resolve()`); GUID registration happens first so all later passes can look up any entity.
- `src/helpers/` — `SkyDateHelper`, `NodeHelper` (traverse skill-tree nodes via `n`/`nw`/`ne` links), `SpiritTreeHelper`.
- `src/interfaces/` — one `*.interface.ts` per entity. `base.interface.ts` defines `IGuid`. These types describe the **resolved** shape, so reference fields are typed as the target object even though raw JSON holds a GUID string (the resolver casts via `as any`).

### TypeScript notes

- ESM with `"module": "nodenext"` and `verbatimModuleSyntax` — **imports of local files must use the `.js` extension** (e.g. `./resolver.js`), and type-only imports must use `import type`.
- `strict` plus `noUncheckedIndexedAccess` are on; indexed access yields `T | undefined`.
- `tsconfig.json` excludes `tests/` and `src/scripts/**` from compilation. Build scripts are `.cjs` (CommonJS) on purpose.

## Versioning (affects how you change data)

Published under SemVer with a project-specific meaning (see README):

- **Major** — structural change to a *stable* asset (breaks consumers).
- **Minor** — backward-compatible data change, or any change to an *unstable* asset.
- **Patch** — adding/changing data with no structural change.

`candles` is the only **unstable** asset; everything else is stable.

Bumping version and releasing is taken care of manually through GitHub Actions. Agents should ONLY change the version in `package.json` when asked.

## Adding a Traveling Spirit

The `/add-traveling-spirit` skill (`.claude/skills/add-traveling-spirit/`) automates this workflow — prefer it for that task.
