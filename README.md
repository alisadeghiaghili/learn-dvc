# LearnDVC

An interactive **DVC** visualizer, sandbox, and tutorial — the learnGitBranching product shape applied to Data Version Control.

**Live:** https://alisadeghiaghili.github.io/learn-dvc/

Git versions code well; datasets and models break that model. DVC stores data content in a cache/remote and versions small pointer files with Git. LearnDVC makes that material flow visible: **Workspace → Cache → Remote**.

## Features

- **Sandbox** with a seeded DVC project
- **Levels** across four packs: Basics, Remotes, Pipelines, Experiments
- **Terminal** simulating core `dvc` and simplified `git` commands
- **Goal panel** with live checks, hint, solution, undo/reset
- **Command golf** (par per level) + progress in `localStorage`
- Workspace simulators: `edit <path>`, `rm <path>`, `cat <path>`, `ls`

## Quick start

```bash
npm install
npm run dev
```

GitHub Pages deploys automatically from `main` via `.github/workflows/deploy-pages.yml` (build `dist/`, publish with Pages artifact).

Production build:

```bash
npm run build
npm test
```

Then serve `dist/` from any static host.

## Useful commands inside the app

```
help
levels
hint
show goal
dvc init
dvc add data/data.xml
dvc remote add -d myremote /tmp/dvcstore
dvc push
dvc pull
dvc stage add -n train -d data/data.xml -p lr -o model.pkl -m metrics.json python src/train.py
dvc repro
dvc exp run -S lr=0.05
dvc exp show
```

Share links: open with `?NODEMO` to skip the intro dialog.

## Project layout

```
src/engine/   # repo simulation, command interpreter, goal compare
src/levels/   # level definitions (start state, goal, solution)
src/ui/       # board, terminal, dialogs, app shell
tests/        # vitest coverage for engine + level solutions
```

## Notes

- This is a **teaching simulator**, not a real DVC binary. Hashes are deterministic fakes; remotes are abstract object stores.
- Real-world DVC docs: [dvc.org/doc](https://dvc.org/doc)
- Inspired by [learnGitBranching](https://github.com/pcottle/learnGitBranching)

## License

Apache License 2.0. See [LICENSE](LICENSE) and [NOTICE](NOTICE).

This project is an independent teaching simulator. It is not affiliated with iterative/dvc or pcottle/learnGitBranching.
