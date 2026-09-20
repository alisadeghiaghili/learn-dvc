# LearnDVC — Design Spec

Interactive DVC visualizer + tutorial, modeled after learnGitBranching’s product shape
(sandbox + terminal + goal levels + undo/reset/hint/solution), with a DVC-native
visualization instead of a git commit tree.

## Style anchor

- **Product genre**: terminal-native learning game (LGB, but for data versioning).
- **Real-world feel**: ML lab “material board” — whiteboard magnets for files, cache
  bins, and a remote warehouse — not a SaaS marketing page and not a git DAG clone.
- **Mode**: expressive educational UI (game chrome + technical density). Not admin CRUD.

## Palette

| Token       | Hex       | Role                                      |
|-------------|-----------|-------------------------------------------|
| `--ink`     | `#0E1318` | App chrome / terminal background          |
| `--panel`   | `#182029` | Raised panels, toolbar, cards             |
| `--panel-2` | `#22303C` | Nested chips, hover fills                 |
| `--line`    | `#2E3D4D` | Hairline borders                          |
| `--haze`    | `#8FA0B2` | Secondary text                            |
| `--text`    | `#E8EEF4` | Primary text                              |
| `--dvc`     | `#8B5CF6` | Tracked data / `.dvc` pointers            |
| `--cache`   | `#2DD4BF` | Local cache objects                       |
| `--remote`  | `#F59E0B` | Remote storage                            |
| `--code`    | `#60A5FA` | Code / params / metrics files             |
| `--ok`      | `#34D399` | Success, solved, clean status             |
| `--warn`    | `#FBBF24` | Dirty / outdated                          |
| `--err`     | `#F87171` | Errors                                    |

## Typography

| Role     | Stack                                                          | Usage                          |
|----------|----------------------------------------------------------------|--------------------------------|
| UI       | `Segoe UI, system-ui, -apple-system, sans-serif`               | Dialogs, toolbar, labels       |
| Mono     | `Cascadia Code, Consolas, ui-monospace, monospace`             | Terminal, paths, md5, commands |

- Title scale: 20–22px / 600 for level names; body 14–15px; mono 13–14px.
- Display personality comes from **density + mono data**, not a decorative webfont.

## Layout system

```
┌──────────────────────────────────────────────────────────────┐
│ toolbar: brand · level name · levels · goal · undo · reset   │
├──────────────────────────────────────────────────────────────┤
│ MATERIAL FLOW BOARD                                          │
│  [ Workspace ]  ──►  [ Cache ]  ──►  [ Remote ]              │
│  optional pipeline DAG strip below                           │
├──────────────────────────────────────────────────────────────┤
│ terminal (command history, output log)                       │
└──────────────────────────────────────────────────────────────┘
```

- Max density without clutter: three equal-ish zones, 12–16px gaps, 24px page gutter.
- Level goal opens as a right dock (not a second full canvas), LGB-inspired but tighter.
- Responsive: stack zones vertically under ~900px; terminal always last.

## Signature moment

**`dvc add` material transfer.** When a workspace data file is added:
1. The workspace card collapses into a purple `.dvc` pointer chip.
2. A teal cache object card slides in with a truncated md5.
3. The raw data card is gitignored (dimmed + struck label `gitignored`).
4. If a remote exists, a ghost target slot appears in the Remote zone (empty until push).

That single animation teaches DVC’s core idea better than any paragraph.

## What this is NOT

- Not a canvas commit-tree clone. Git history is present but secondary (pointer files
  are what Git versions in real DVC).
- No purple AI gradient hero, no stock photos, no marketing landing page as home.
- Home = sandbox (or intro dialog → first level), like LGB.

## Product surface

1. **Sandbox** — free-form DVC/Git simulation with seed data.
2. **Levels** — series packs with start state, goal checks, hint, solution, par.
3. **Terminal commands** — `dvc *`, simplified `git *`, meta: `levels`, `hint`,
   `show goal`, `show solution`, `reset`, `undo`, `sandbox`, `help`.
4. **Simulators** (not real shell): `edit <path>`, `rm <path>`, `cat <path>` so learners
   can dirty/clean data without a real filesystem.
5. **Persistence** — solved levels + best command counts in `localStorage`.

## Level packs (v1)

| Series        | ID prefix   | Teaches                                      |
|---------------|-------------|----------------------------------------------|
| Basics        | `basics-`   | init, add, status, gitignore + `.dvc`        |
| Remotes       | `remote-`   | remote add, push, pull, missing cache        |
| Pipelines     | `pipe-`     | stage add, dvc.yaml, repro, dag              |
| Experiments   | `exp-`      | params, metrics, exp run/show/apply          |

Each level: intro dialog (markdown), `hint`, declarative goal, solution commands, par.

## Engine model (simplified but honest)

- `files`: path → `{ kind, contentId, pointerMd5?, tracked }`
- `cache`: set of md5
- `remoteObjects`: set of md5
- `remotes`: name/url/default
- `pipeline`: stages with deps/outs/cmd/params
- `params` / `metrics` / `experiments`
- `gitLog`: commits that snapshot `.dvc` pointers + dvc.yaml + code files
- Content ids are stable fake md5s derived from path+version (deterministic, not crypto)

Goal checks compare a **projection** of state (pointers present, remote objects, stages,
metric values, commit messages) — not raw object identity.

## Engineering conventions

- TypeScript strict, English identifiers, PEP-like clarity in structure.
- Vitest for engine/compare/level goal tests.
- No AI footprint in git history when committing.
- Files/docs in English; product voice is direct and technical.

## Future (out of v1)

- Level builder / import JSON
- Import remote registry levels
- Persian locale pack
- Full exp queue / DVCLive
