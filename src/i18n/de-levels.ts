/** German level teaching copy. Never includes hint/solution/commands. */

import type { LevelCopy } from './types';

export const deLevels: Record<string, LevelCopy> = {
  'basics-1': {
    seriesTitle: 'Grundlagen',
    name: 'DVC initialisieren',
    objective:
      'DVC in einem Git-Repository initialisieren und die DVC-Metadaten committen, damit das Team dasselbe Data-Versioning-Setup teilt.',
    learning: [
      'DVC erweitert Git fÃ¼r Daten; es ersetzt Git nicht',
      'dvc init legt nur .dvc/-Metadaten an â€” noch sind keine Daten versioniert',
      'Git versioniert diese Metadaten; Teammates klonen denselben Workflow',
    ],
    fieldNotes: [
      'Repo-Bootstrap: git init â†’ dvc init â†’ .dvc sofort committen',
      'Remote-Config in .dvc/config speichern, damit Clones denselben Data Store erben',
      'Ohne .dvc-Commit hat jeder Teammate einen anderen Daten-Workflow',
    ],
    startDialog: [
      {
        title: 'Warum allein Git bei ML-Daten scheitert',
        markdown:
          'Git speichert jede Version einer Datei in `.git`. Das funktioniert fÃ¼r Quellcode.\n\nBei **DatensÃ¤tzen und Modellen** bricht es:\n\n- 10 GB in History Ã— viele Versionen â†’ unbrauchbare Clones\n- BinÃ¤re Diffs sind opak und langsam\n- Reviewer wollen keine Trainingsdaten im Code-Repo\n\n**DVC** teilt das Problem: Git hÃ¤lt *Pointer*; ein Cache/Remote hÃ¤lt *Bytes*.',
      },
      {
        title: 'Was `dvc init` wirklich tut',
        markdown:
          'Legt ein `.dvc/`-Verzeichnis an mit:\n\n- `config` â€” wo Remotes und Cache fÃ¼r dieses Projekt liegen\n- `.gitignore` â€” damit DVCs interner Cache nicht aus Versehen committed wird\n\n**Es lÃ¤dt keine Daten hoch.** Du schaltest Data-Versioning *an* fÃ¼r dieses Projekt.\n\nMental Model: `git init` fÃ¼r Code â‰ˆ `dvc init` fÃ¼r den Daten-Workflow.',
      },
      {
        title: 'Warum du `.dvc/` mit Git committen musst',
        markdown:
          'Der `.dvc/`-Ordner ist winzig und team-facing.\n\n```\ngit add .dvc\ngit commit -m "Initialize DVC"\n```\n\nOhne das hat Clone #2 Code, aber **kein DVC-Projekt** â€” `dvc pull` kennt dein Cache-Layout nicht.\n\nBeobachte das Board: Workspace kann â€žinitializedâ€œ sein, wÃ¤hrend der Git-Setup-Commit noch fehlt.',
      },
    ],
  },
  'basics-2': {
    seriesTitle: 'Grundlagen',
    name: 'Datensatz tracken',
    objective:
      '`data/data.xml` tracken, damit die Inhalte im Cache liegen, Git nur eine Pointer-Datei trackt und der Rohpfad gitignored ist.',
    learning: [
      'dvc add = Hash + Cache-Objekt + .dvc-Pointer + gitignore',
      'Git committet den Pointer (md5), nie die groÃŸe Datei',
      'Board: Workspace-Datei wird zu Pointer + Cache-Objekt erscheint',
    ],
    fieldNotes: [
      'DatensÃ¤tze/Modelle/Artefakte tracken, die du nicht gÃ¼nstig neu bauen kannst',
      'PR-Review liest Pointer-Diffs (md5), nicht Megabytes CSV',
      'CI pullt Daten Ã¼ber DVC; Images bleiben schlank',
    ],
    startDialog: [
      {
        title: 'Was `dvc add` macht',
        markdown:
          'Vier Effekte in einem Befehl:\n\n1. Hash (md5) Ã¼ber den Dateiinhalt\n2. Bytes in `.dvc/cache`\n3. Kleine `.dvc`-Pointer-Datei (YAML)\n4. Rohpfad in `.gitignore`\n\nGit sieht danach nur noch den Pointer.',
      },
    ],
  },
  'basics-3': {
    seriesTitle: 'Grundlagen',
    name: 'Dirty Data und Status',
    objective:
      'Daten Ã¤ndern, `dvc status` lesen und mit `dvc commit` den neuen Stand in Cache und Pointer Ã¼bernehmen.',
    learning: [
      'dvc status vergleicht Workspace vs. Pointer vs. Cache',
      'modified = Bytes â‰  md5 im .dvc',
      'dvc commit akzeptiert die neue Datenversion',
    ],
    fieldNotes: [
      'Dirty Data ist der Normalfall nach Feature-Engineering',
      'Nie blind committen â€” status lesen, dann commit oder checkout',
    ],
    startDialog: [
      {
        title: 'Dirty ist kein Fehler',
        markdown:
          'Wie `git status` fÃ¼r Daten: du hast eine uncommittete Ã„nderung.\n\nAkzeptieren: `dvc commit`\nVerwerfen: `dvc checkout`',
      },
    ],
  },
  'remote-1': {
    seriesTitle: 'Remotes',
    name: 'Remote konfigurieren',
    objective:
      'Eine DVC-Remote anlegen und als Default markieren, damit push/pull wissen, wohin die Objekte gehÃ¶ren.',
    learning: [
      'DVC-Remote â‰  Git-Remote',
      '-d setzt die Default-Remote',
      'Config lebt in .dvc/config und wird geteilt',
    ],
    fieldNotes: [
      'S3/GCS/SSH/local â€” Hauptsache content-adressierter Objektspeicher',
      'Remote-URL ins Repo, Credentials niemals',
    ],
    startDialog: [
      {
        title: 'Zwei Remotes, zwei Jobs',
        markdown:
          '**Git remote** = Code + Pointer.\n**DVC remote** = schwere Datenobjekte.\n\n`dvc remote add -d myremote /tmp/dvcstore`',
      },
    ],
  },
  'remote-2': {
    seriesTitle: 'Remotes',
    name: 'Daten zur Remote pushen',
    objective: 'Getrackte Daten mit `dvc push` hochladen, damit das Team sie abrufen kann.',
    learning: [
      'dvc push lÃ¤dt nur fehlende Cache-Objekte',
      'Teammates brauchen denselben Git-Commit + pull',
    ],
    fieldNotes: [
      'Push nach jedem Datenstand, den andere brauchen',
      'CI pullt statt DatensÃ¤tze in Images zu backen',
    ],
    startDialog: [
      {
        title: 'Push sendet Bytes, nicht Git',
        markdown: 'Git push = Pointer.\nDVC push = Objekte in den Data Store.',
      },
    ],
  },
  'remote-3': {
    seriesTitle: 'Remotes',
    name: 'Frische Maschine: Daten pullen',
    objective:
      'Auf einer frischen Maschine Daten mit `dvc pull` materialisieren, ohne die Bytes im Git-History zu haben.',
    learning: [
      'Git clone bringt Pointer',
      'dvc pull bringt die Daten',
      'Workspace und Pointer stimmen danach Ã¼berein',
    ],
    fieldNotes: [
      'Onboarding in Minuten: clone + pull',
      'Laptop-Verlust ist kein Datenverlust, wenn die Remote voll ist',
    ],
    startDialog: [
      {
        title: 'Kleine Clone, groÃŸe Daten',
        markdown: '```\ngit clone â€¦\ndvc pull\n```\n\nFertig. Kein 40-GB-Download aus der Git-History.',
      },
    ],
  },
  'pipe-1': {
    seriesTitle: 'Pipelines',
    name: 'Stage definieren',
    objective:
      'Einen Pipeline-Stage mit `dvc stage add` anlegen (deps, outs, cmd), damit Reproduzierbarkeit vertraglich wird.',
    learning: [
      'Stages leben in dvc.yaml',
      'deps invalidieren den Stage bei Ã„nderung',
      'outs werden nach erfolgreichem Lauf getrackt',
    ],
    fieldNotes: [
      'Jeder Trainingsschritt, der teuer ist, verdient einen Stage',
      'Code in Git; I/O Ã¼ber DVC',
    ],
    startDialog: [
      {
        title: 'dvc.yaml ist ein Vertrag',
        markdown:
          '```\ndvc stage add -n prepare \\\n  -d data/data.xml -o data/prepared.csv \\\n  python src/prepare.py\n```',
      },
    ],
  },
  'pipe-2': {
    seriesTitle: 'Pipelines',
    name: 'Train-Stage + repro',
    objective: 'Prepare und Train verknÃ¼pfen und mit `dvc repro` die Pipeline ausfÃ¼hren.',
    learning: [
      'dvc repro lÃ¤uft topologisch, nur dirty Stages',
      'dvc.lock ist die AusfÃ¼hrungsquittung',
    ],
    fieldNotes: ['Repro nach jeder relevanten Ã„nderung', 'Lock nie von Hand editieren'],
    startDialog: [
      {
        title: 'Build-System fÃ¼r ML',
        markdown: 'Nur das, was sich geÃ¤ndert hat, lÃ¤uft neu.\n\n`dvc repro`',
      },
    ],
  },
  'pipe-3': {
    seriesTitle: 'Pipelines',
    name: 'Params Ã¤ndern â†’ repro',
    objective:
      'Hyperparameter in `params.yaml` Ã¤ndern, repro ausfÃ¼hren und Metrics vergleichen.',
    learning: [
      'params.yaml ist menschlich reviewbar',
      '-p verlinkt Params an Stages',
      'Metrics zeigen, was der Lauf brachte',
    ],
    fieldNotes: ['Param-Ã„nderungen sind der Normalfall im Experiment', 'Diff vor dem Merge'],
    startDialog: [
      {
        title: 'Params sind First-Class',
        markdown: 'Ã„ndere `lr` in `params.yaml`, dann `dvc repro` und `dvc metrics show`.',
      },
    ],
  },
  'exp-1': {
    seriesTitle: 'Experimente',
    name: 'Experiment ausfÃ¼hren',
    objective: 'Erstes Experiment mit `dvc exp run` auf der bestehenden Pipeline starten.',
    learning: [
      'exp run ohne Branch-Spam',
      'Params/Metrics werden aufgezeichnet',
    ],
    fieldNotes: ['Experimente ersetzen wilde Branches', 'Immer mit exp show vergleichen'],
    startDialog: [
      {
        title: 'Experimente ohne Branch-Explosion',
        markdown: '`dvc exp run` â€” Pipeline im Experimentkontext.',
      },
    ],
  },
  'exp-2': {
    seriesTitle: 'Experimente',
    name: 'Parameter sweepe',
    objective: 'Mit `-S` Parameter Ã¼berschreiben und Experimente mit `dvc exp show` vergleichen.',
    learning: [
      '-S setzt Parameter fÃ¼r diesen Lauf',
      'exp show tabelliert Params vs. Metrics',
    ],
    fieldNotes: ['Sweeps sind der Standardkurs in Kursen und in Produktion'],
    startDialog: [
      {
        title: 'Sweep, nicht raten',
        markdown: '`dvc exp run -S lr=0.05` und Freunde, dann `dvc exp show`.',
      },
    ],
  },
  'exp-3': {
    seriesTitle: 'Experimente',
    name: 'Gewinner Ã¼bernehmen',
    objective: 'Mit `dvc exp apply` die beste Experimentkonfiguration in den Workspace heben.',
    learning: ['exp apply promoted Params/Metrics', 'Dann Artefakte reproen'],
    fieldNotes: ['Gewinner werden zur neuen Baseline â€” nicht in Notizen kopieren'],
    startDialog: [
      {
        title: 'Vom Lauf zur Baseline',
        markdown: '`dvc exp apply exp-xxxxxx` â€” ohne Werte neu zu tippen.',
      },
    ],
  },
  'field-1': {
    seriesTitle: 'Field Practice',
    name: 'Ã„ltere Datenversion wiederherstellen',
    objective:
      'Mit `git checkout` und `dvc checkout` eine Ã¤ltere Datenversion zurÃ¼ckholen â€” der Produktions-Rollback-Drill.',
    learning: [
      'Pointer wechseln ist billig',
      'dvc checkout materialisiert die Bytes',
    ],
    fieldNotes: ['Rollback Ã¼ben, bevor du um 2 Uhr dran denkst'],
    startDialog: [
      {
        title: 'Rollback in zwei Befehlen',
        markdown: '```\ngit checkout HEAD~1 data/data.xml.dvc\ndvc checkout\n```',
      },
    ],
  },
  'field-2': {
    seriesTitle: 'Field Practice',
    name: 'Daten geÃ¤ndert â†’ Pipeline stale',
    objective: 'Nach einer DatenÃ¤nderung die Pipeline mit `dvc repro` aktualisieren.',
    learning: ['DatenÃ¤nderung invalidiert dep-Stages', 'repro holt auf'],
    fieldNotes: ['Daten-Drift ist Alltag â€” repro ist die Antwort'],
    startDialog: [
      {
        title: 'Wenn die Welt sich dreht',
        markdown: 'Daten Ã¤ndern â†’ Stages dirty â†’ `dvc repro`.',
      },
    ],
  },
  'field-3': {
    seriesTitle: 'Field Practice',
    name: 'Gewinner promoten, dann repro',
    objective: 'Experiment-Gewinner Ã¼bernehmen und Artefakte neu bauen.',
    learning: ['apply + repro = neue Baseline'],
    fieldNotes: ['Produktionspfad nach einem guten Sweep'],
    startDialog: [
      {
        title: 'Promote und bau neu',
        markdown: 'Erst `dvc exp apply`, dann `dvc repro`.',
      },
    ],
  },
  'capstone-1': {
    seriesTitle: 'Capstone',
    name: 'End-to-End-Drill',
    objective:
      'Von dirty Daten bis geteiltem Stand: den vollen DVC-Workflow in einem Szenario durchziehen.',
    learning: ['add/commit/push/pull als eine Geschichte', 'Pipelines und Exp im Kontext'],
    fieldNotes: ['Das ist der Alltagstag im ML-Team'],
    startDialog: [
      {
        title: 'Alles zusammen',
        markdown: 'Zeit, die Teile zu einer Produktionsschicht zu machen.',
      },
    ],
  },
  'field-5': {
    seriesTitle: 'Field Practice',
    name: 'Registry / Import',
    objective: 'Dateien aus einem anderen DVC-Projekt holen bzw. importieren und versionieren.',
    learning: ['dvc get kopiert', 'dvc import versioniert die AbhÃ¤ngigkeit'],
    fieldNotes: ['Feature Stores und Modell-Registry-Muster'],
    startDialog: [
      {
        title: 'get vs. import',
        markdown: '`dvc get` = Kopie. `dvc import` = versionierte AbhÃ¤ngigkeit (schreibt .dvc).',
      },
    ],
  },
  'field-6': {
    seriesTitle: 'Field Practice',
    name: 'Incident: Welche Daten?',
    objective:
      'Die Incident-Frage beantworten: welcher Datensatz hat dieses Modell erzeugt?',
    learning: [
      'Git-Commit â†’ Pointer-md5 â†’ Cache/Remote',
      'Ohne committete Pointer existiert die Antwort nicht',
    ],
    fieldNotes: ['Postmortems brauchen diese Kette â€” Ã¼be sie vorher'],
    startDialog: [
      {
        title: '3 Uhr nachts im Incident',
        markdown: 'â€žWelche Daten haben dieses Modell erzeugt?â€œ â€” die Kette muss stehen.',
      },
    ],
  },
  'meta-1': {
    seriesTitle: 'Meta-Dateien',
    name: 'dvc.yaml & dvc.lock lesen',
    objective: 'dvc.yaml als Vertrag und dvc.lock als AusfÃ¼hrungsquittung unterscheiden.',
    learning: ['yaml = Definition', 'lock = Quittung (md5s/Params)'],
    fieldNotes: ['Lock nie von Hand editieren â€” immer repro'],
    startDialog: [
      {
        title: 'Vertrag und Quittung',
        markdown: '`cat dvc.yaml` und `cat dvc.lock` â€” Definition vs. AusfÃ¼hrung.',
      },
    ],
  },
  'meta-2': {
    seriesTitle: 'Meta-Dateien',
    name: '.dvcignore',
    objective: 'Pfade mit `.dvcignore` ausschlieÃŸen, damit DVC groÃŸe BÃ¤ume schnell durchlÃ¤uft.',
    learning: ['.dvcignore â‰  .gitignore', 'Nur DVC Ã¼berspringt diese Pfade'],
    fieldNotes: ['Scratch-Ordner und Temp-Data raushalten'],
    startDialog: [
      {
        title: 'Was DVC ignoriert',
        markdown: '`.dvcignore` mit Pfadmustern â€” Speed auf groÃŸen Trees.',
      },
    ],
  },
  'meta-3': {
    seriesTitle: 'Meta-Dateien',
    name: 'update + CML-Kommentar',
    objective: 'Importe mit `dvc update` frischen und CI-Feedback mit CML an den PR bringen.',
    learning: ['update holt neue Upstream-Version', 'CML postet Metrics/Plots auf PRs'],
    fieldNotes: ['CI-Skelett: clone â†’ pull â†’ repro â†’ cml comment'],
    startDialog: [
      {
        title: 'Frisch halten, sichtbar machen',
        markdown: '`dvc update` und CML-Kommentare im PR.',
      },
    ],
  },
  'cmp-1': {
    seriesTitle: 'Vergleich',
    name: 'params / metrics diff',
    objective: 'Workspace vs. HEAD mit params/metrics diff vergleichen.',
    learning: ['diff = Review-Sicht auf ML-Ã„nderungen'],
    fieldNotes: ['Vor dem Merge immer diff lesen'],
    startDialog: [
      {
        title: 'Review, nicht rÃ¤tseln',
        markdown: '`dvc params diff` Â· `dvc metrics diff`',
      },
    ],
  },
  'cmp-2': {
    seriesTitle: 'Vergleich',
    name: 'exp diff nach verschachtelten Params',
    objective: 'Experimente nach verschachtelten Param-LÃ¤ufen mit `dvc exp diff` vergleichen.',
    learning: ['exp diff zeigt Param- und Metric-Drift'],
    fieldNotes: ['Verschachtelte Keys wie train.lr ernst nehmen'],
    startDialog: [
      {
        title: 'Verschachtelte Params',
        markdown: 'Zwei LÃ¤ufe, ein `train.n_est`-Weg â€” dann `dvc exp diff`.',
      },
    ],
  },
  'reg-1': {
    seriesTitle: 'Registry',
    name: 'Daten importieren',
    objective: 'Einen Datensatz aus einer Registry/URL importieren und versionieren.',
    learning: ['import-url trackt externe Quellen'],
    fieldNotes: ['Externe DatensÃ¤tze brauchen dieselbe Pointer-Disziplin'],
    startDialog: [
      {
        title: 'Externe Quellen',
        markdown: '`dvc import-url` â€” externe URL als getrackte Daten.',
      },
    ],
  },
  'reg-2': {
    seriesTitle: 'Registry',
    name: 'Modell promoten',
    objective: 'Ein Modell als Artefakt behandeln und mit Git-Tag + pull promoten.',
    learning: ['Registry-Muster: Tag + gezogenes Modell'],
    fieldNotes: ['Keine Gewichte per E-Mail â€” pull den Stand'],
    startDialog: [
      {
        title: 'Promote statt mailen',
        markdown: 'Git-Tag + `dvc pull` statt WeTransfer.',
      },
    ],
  },
  'camp-1': {
    seriesTitle: 'DVCLive',
    name: 'Mit DVCLive instrumentieren',
    objective:
      'Training mit DVCLive instrumentieren: Params, Metrics, Plots und Report automatisch speisen.',
    learning: [
      'Live / log_metric / log_plot / make_report',
      'Skalare â†’ Metrics, Serien â†’ Plots',
    ],
    fieldNotes: ['BrÃ¼cke von Notebook zu exp show/plots'],
    startDialog: [
      {
        title: 'DVCLive',
        markdown: '```python\nfrom dvclive import Live\nwith Live() as live:\n    live.log_metric("acc", 0.92)\n```',
      },
    ],
  },
  'camp-2': {
    seriesTitle: 'DVCLive',
    name: 'Plots-Templates',
    objective: 'Vega-Templates (linear, confusion) fÃ¼r `dvc plots show` nutzen.',
    learning: ['Templates in dvc.yaml unter plots:', 'show --template confusion'],
    fieldNotes: ['Confusion-Matrix fÃ¼r Stakeholder-Reviews'],
    startDialog: [
      {
        title: 'Templates',
        markdown: '`dvc plots show --template linear` Â· `--template confusion`',
      },
    ],
  },
  'camp-3': {
    seriesTitle: 'Queue & Sweeps',
    name: 'Parameter-Sweep queueen',
    objective: 'Experimente mit `dvc exp run --queue` parken und gemeinsam starten.',
    learning: ['--queue parkt', 'queue start / --run-all fÃ¼hrt aus'],
    fieldNotes: ['Nicht fÃ¼r jeden Hyperparameter einen Job babysitten'],
    startDialog: [
      {
        title: 'Queue',
        markdown: '`dvc exp run --queue -S train.n_est=50` â€¦ dann `dvc queue start`.',
      },
    ],
  },
  'camp-4': {
    seriesTitle: 'Pipeline-Tiefe',
    name: 'foreach Stage + Advanced Flags',
    objective: 'Mit `--foreach` Matrix-Stages anlegen und Advanced-Flags verstehen.',
    learning: ['--foreach expandiert einen Stage', 'no-cache / always-changed / freeze'],
    fieldNotes: ['Per-Modell-Matrix ohne Copy-Paste'],
    startDialog: [
      {
        title: 'foreach',
        markdown: '`dvc stage add --foreach a,b â€¦` â€” ein Stage, viele LÃ¤ufe.',
      },
    ],
  },
  'camp-5': {
    seriesTitle: 'Collab & CI',
    name: '.dvcignore + update + CML',
    objective: 'Ignore-Regeln, Import-Update und CML-Kommentar im Teamkontext kombinieren.',
    learning: ['Kollaboration braucht Ignore + frische Imports + sichtbare CI'],
    fieldNotes: ['Der letzte Kilometer bis zum Team-Workflow'],
    startDialog: [
      {
        title: 'Team-Endgame',
        markdown: '`.dvcignore` Â· `dvc update` Â· `dvc cml "â€¦"` â€” alles zusammen.',
      },
    ],
  },
  'cache-1': {
    seriesTitle: 'Cache-Disziplin',
    name: 'Ungenutzte Objekte und gc',
    objective:
      'Ein unreferenziertes Cache-Objekt erzeugen (dirty data + neue Version) und mit `dvc gc` Platz freigeben, ohne den aktuellen Pointer zu verlieren.',
    learning: [
      'Content-adressierter Cache hÃ¤lt alte Hashes bis gc',
      'dvc gc entfernt Objekte ohne Referenz aus Workspace/Git-Refs',
      'gc ist nur sicher, wenn Remotes behalten, was das Team braucht',
    ],
    fieldNotes: [
      'CI-Runner: gc nach pull+repro der SHA, die du auslieferst',
      'Laptops fÃ¼llen sich mit verwaisten md5s â€” gc planen, nicht improvisieren',
      'Wenn ein Release-Modell nur im lokalen Cache lag, kann gc die letzte Kopie killen',
    ],
    startDialog: [
      {
        title: 'Cache ist ein Lager, kein MÃ¼lleimer',
        markdown:
          'Jedes `dvc add`/`commit` schreibt ein **neues** Objekt. Alte bleiben fÃ¼r History-Checkout.\n\n`dvc gc` ist der Besen â€” behÃ¤lt nur Referenziertes.',
      },
    ],
  },
  'cache-2': {
    seriesTitle: 'Cache-Disziplin',
    name: 'Workspace, Cache, Remote â€” Wahrheitstabelle',
    objective:
      'Getrackte Datei lÃ¶schen, `dvc status` lesen, mit `dvc pull` wiederherstellen, sauberes Status-Finish.',
    learning: [
      'Fehlende Workspace-Datei â‰  verloren, wenn Cache/Remote den Hash haben',
      'dvc pull = fetch + checkout',
      'status ist die ehrliche Karte Pointer â†” Bytes',
    ],
    fieldNotes: ['Runbook: status â†’ pull â†’ status. Erst dann eskalieren'],
    startDialog: [
      {
        title: 'Drei Orte, eine Tabelle',
        markdown: 'Workspace / Cache / Remote â€” `dvc status` und `dvc pull` lesen die Tabelle.',
      },
    ],
  },
  'remote-4': {
    seriesTitle: 'Remotes',
    name: 'Zweite Remote + Default wechseln',
    objective: 'Backup-Remote anlegen, Liste prÃ¼fen, Default umschalten, pushen.',
    learning: [
      'Mehrere Remotes (origin, backup, team, region) sind normal',
      'Default-Remote nutzen push/pull ohne -r',
      'Remote-Config steckt in .dvc/config und wird geteilt',
    ],
    fieldNotes: ['Team-Remote fÃ¼r Daily Work + Cold Backup fÃ¼r DR', 'Credentials nie in .dvc/config'],
    startDialog: [
      {
        title: 'Warum mehr als eine Remote',
        markdown: 'Kollaborationsspeicher â‰  Disaster-Recovery-Speicher.',
      },
    ],
  },
  'remote-5': {
    seriesTitle: 'Remotes',
    name: 'fetch vs pull auf frischer Maschine',
    objective: 'Leerer Cache, volle Remote: `fetch` fÃ¼llt nur Cache, `pull` materialisiert Workspace.',
    learning: [
      'fetch: remote â†’ cache',
      'pull: fetch + checkout',
      'CI kann prefetchen, ohne den Tree zu zerlegen',
    ],
    fieldNotes: ['CI prefetch vor Build; pull nur wo Bytes gebraucht werden'],
    startDialog: [
      {
        title: 'Zwei Verben, ein Lager',
        markdown: '`fetch` fÃ¼llt das Lager. `liefert` auch in die KÃ¼che (`pull`).',
      },
    ],
  },
  'pipe-4': {
    seriesTitle: 'Pipelines',
    name: 'wdir, always-changed, no-cache',
    objective: 'Stage mit `--wdir` und `--always-changed` deklarieren, no-cache-Outs verstehen, repro + DAG.',
    learning: [
      '--wdir verschiebt das Stage-Arbeitsverzeichnis',
      '--always-changed erzwingt repro',
      'cache:false-Outs tracken IdentitÃ¤t ohne Cache-Bytes',
    ],
    fieldNotes: ['always-changed fÃ¼r API/Scrapes', 'no-cache fÃ¼r riesige Warehouse-Outs'],
    startDialog: [
      {
        title: 'Stage-Flags aus der Produktion',
        markdown: '`--wdir` Â· `--always-changed` Â· `--no-cache` â€” keine Kosmetik.',
      },
    ],
  },
  'pipe-5': {
    seriesTitle: 'Pipelines',
    name: 'foreach-Matrix + DAG',
    objective: 'Einen Stage mit `--foreach` zur Matrix expandieren, listen und als DAG lesen.',
    learning: ['--foreach macht aus einem Template N Stages', 'Jede Matrixzelle hat eigene Outs', 'DAG ist der Review-Vertrag'],
    fieldNotes: ['Matrix fÃ¼r â€ždiese Modelle mÃ¼ssen zusammenâ€œ', 'Suche gehÃ¶rt in `dvc exp`, Produkt in Stages'],
    startDialog: [
      {
        title: 'foreach vs Experimente',
        markdown: '**foreach stages** = Produkt-Matrix. **dvc exp** = Suche.',
      },
    ],
  },
  'exp-4': {
    seriesTitle: 'Experimente',
    name: 'Zweimal sweepe + exp show',
    objective: 'Zwei Parametersets laufen lassen und mit `dvc exp show` vergleichen.',
    learning: ['-S protokolliert jedes Set als Experiment', 'exp show ist die Evidenztabelle', '--queue parkt Arbeit'],
    fieldNotes: ['Freitagssweep: queueen, am Montag show lesen'],
    startDialog: [
      {
        title: 'Suche ohne Babysitting',
        markdown: 'Sweeps (`-S`) + `dvc exp show`. Queue fÃ¼r Ãœbernachtarbeit.',
      },
    ],
  },
  'exp-5': {
    seriesTitle: 'Experimente',
    name: 'Gewinner applyn + Params prÃ¼fen',
    objective: 'Sweep, `exp show`, `exp apply`, `params show`, dann repro.',
    learning: ['apply schreibt Config in den Workspace â€” kein Deploy', 'Danach repro/push fÃ¼r Produktion', 'params show ist der Audit'],
    fieldNotes: ['PR nennt exp-id und BegrÃ¼ndung', 'Ohne repro bleiben Modelle stale'],
    startDialog: [
      {
        title: 'Gewinner ist kein Release',
        markdown: '`exp apply` â†’ `dvc repro` â†’ `dvc push`.',
      },
    ],
  },
  'cmp-3': {
    seriesTitle: 'Review & Vergleich',
    name: 'params + metrics diff Drill',
    objective: 'Hyperparameter Ã¤ndern, `params diff`, repro, `metrics diff` â€” das ML-Review-Paket.',
    learning: ['params diff = Absicht', 'metrics diff = Wirkung', 'Zusammen das Minimum an ML-Review'],
    fieldNotes: ['Beide Diffs in die PR. Reviewer Ã¶ffnen kein Notebook'],
    startDialog: [
      {
        title: 'Review wie Erwachsene',
        markdown: '`dvc params diff` + `dvc metrics diff`.',
      },
    ],
  },
  'cmp-4': {
    seriesTitle: 'Review & Vergleich',
    name: 'plots show + diff',
    objective: 'Repro, Vega-Template rendern, `plots diff` Ã¼ber die Ã„nderung.',
    learning: ['Plots sind Review-Artefakte', 'Templates kodieren die Lesart', 'plots diff ist der Zwilling von metrics diff'],
    fieldNotes: ['CML hÃ¤ngt Plot-Bilder an PRs'],
    startDialog: [
      {
        title: 'Plots sind keine Deko',
        markdown: '`dvc plots show` / `dvc plots diff`.',
      },
    ],
  },
  'meta-4': {
    seriesTitle: 'Meta & Vertragsdateien',
    name: 'Einen Stage bewusst freezen',
    objective: '`train` freezen, Verhalten beobachten, dann bewusst unfreezen.',
    learning: ['freeze pinnt gegen Invalidierungs-Repro', 'unfreeze ist ein Produktionsereignis', 'Gefrorene Stages bleiben im DAG'],
    fieldNotes: ['Gold-Modell freezen, wÃ¤hrend Research zappelt', 'unfreeze mit Review + repro + push'],
    startDialog: [
      {
        title: 'Ein Pin mit Konsequenzen',
        markdown: 'Freeze schÃ¼tzt. Versteckt aber Staleness, wenn man es vergisst.',
      },
    ],
  },
  'meta-5': {
    seriesTitle: 'Meta & Vertragsdateien',
    name: 'lock ist die Quittung',
    objective: 'Param brechen, repro, yaml vs lock lesen â€” Definition vs AusfÃ¼hrungsquittung.',
    learning: ['dvc.yaml = Vertrag', 'dvc.lock = Quittung', 'Lock von Hand editieren lÃ¼gt'],
    fieldNotes: ['yaml braucht Human Review; lock kommt aus CI repro'],
    startDialog: [
      {
        title: 'Vertrag vs Quittung',
        markdown: '`cat dvc.yaml` Â· `cat dvc.lock`.',
      },
    ],
  },
  'reg-3': {
    seriesTitle: 'Registry & Wiederverwendung',
    name: 'import und sauberer Status',
    objective: 'Upstream-Artefakt als versionierte AbhÃ¤ngigkeit importieren und Status sauber halten.',
    learning: ['import pinnt die Upstream-Version', 'update ist ein bewusstes Bump', 'Kein Zip in Slack'],
    fieldNotes: ['Feature-Store-Exporte werden imports, nicht Kopien'],
    startDialog: [
      {
        title: 'Leihen, nicht horten',
        markdown: '`dvc get` = Kopie. `dvc import` = Pin + Update-Pfad.',
      },
    ],
  },
  'camp-6': {
    seriesTitle: 'Collab & CI',
    name: 'CI-Skelett: pull, repro, comment',
    objective: 'Kanonische CI-Schleife: pull, repro, metrics lesen, CML-Kommentar, Quittung committen.',
    learning: ['CI: clone â†’ pull â†’ repro â†’ cml comment', 'Schwere Bytes in der DVC-Remote', 'CML macht Metriken reviewbar'],
    fieldNotes: ['Das ist das YAML aus den GitHub Actions Beispielen'],
    startDialog: [
      {
        title: 'CI-Religion in drei Zeilen',
        markdown: '```\ndvc pull\ndvc repro\ndvc cml "â€¦"\n```',
      },
    ],
  },
  'camp-7': {
    seriesTitle: 'Collab & CI',
    name: 'DVCLive-Metriken nach exp show',
    objective: 'Lauf mit DVCLive instrumentieren und in der Experimenttabelle sehen.',
    learning: ['DVCLive verbrÃ¼ckt Trainingscode â†’ metrics/plots', 'Skalare = Metrics, Serien = Plots'],
    fieldNotes: ['Ein Live() in train.py schlÃ¤gt zehn shell echoes'],
    startDialog: [
      {
        title: 'Keine Copy-Paste-Loss-Kurven',
        markdown: 'DVCLive schreibt in der Form, die DVC schon versteht.',
      },
    ],
  },
  'collab-1': {
    seriesTitle: 'Collab & CI',
    name: 'Pointer-PR-Disziplin',
    objective: 'Voller Daten-PR-Pfad: dirty â†’ status â†’ add/commit â†’ git commit nur Pointer.',
    learning: ['PR-Review ist Pointer-md5 + lock, nicht Gigabytes', 'Ohne dvc commit lÃ¼gt der Pointer'],
    fieldNotes: ['CI failt, wenn jemand getrackte Daten staged'],
    startDialog: [
      {
        title: 'Der einzige sichere Daten-PR',
        markdown: 'Status â†’ add â†’ commit â†’ git add nur Pointer-Dateien â†’ commit.',
      },
    ],
  },
  'collab-2': {
    seriesTitle: 'Collab & CI',
    name: 'Incident: Welche Daten, welches Modell?',
    objective: 'Incident-Frage mit Evidenz beantworten: pointer â†’ git â†’ remote â†’ sauberer Checkout.',
    learning: ['Release-Commit â†’ pointer md5 â†’ cache/remote', 'Ohne committete Pointer existiert die Antwort nicht'],
    fieldNotes: ['Das ist die Postmortem-Checkliste fÃ¼r â€žschlechtes Modell in Prodâ€œ'],
    startDialog: [
      {
        title: '2-Uhr-Checkliste',
        markdown: 'Commit â†’ pointer â†’ md5 â†’ remote? â†’ checkout + `dvc checkout`.',
      },
    ],
  },
  'collab-3': {
    seriesTitle: 'Collab & CI',
    name: 'Teammate-Handoff: push + Pointer-Commit',
    objective:
      'DatenÃ¤nderung so verÃ¶ffentlichen, dass ein Teammate reproduzieren kann: push, Pointer committen, sauberer Status nach pull.',
    learning: [
      'Handoff = Remote-Objekte + Git-Pointer-Commit, kein Zip',
      'Push ohne Pointer-Commit strandet Bytes',
      'status nach pull ist der Abnahmetest',
    ],
    fieldNotes: ['Done fÃ¼r Datenarbeit: Teammate pull auf sauberer Maschine'],
    startDialog: [
      {
        title: 'Der Handoff-Vertrag',
        markdown: 'Geteilt erst wenn: Bytes auf Remote + Pointer in Git + `dvc pull` funktioniert.',
      },
    ],
  },
  'collab-4': {
    seriesTitle: 'Collab & CI',
    name: 'Lock/Pointer-Konflikt im Daten-PR',
    objective:
      'PR-Konflikt lÃ¶sen: Params geÃ¤ndert, Lock veraltet. Repro, Quittung committen, Status sauber.',
    learning: ['yaml = Absicht, lock = Quittung', 'Lock nie von Hand mergen'],
    fieldNotes: ['Playbook: status â†’ repro â†’ commit â†’ status'],
    startDialog: [
      { title: 'Zwei Personen, ein Vertrag', markdown: 'Repro, dann neue Quittung committen.' },
    ],
  },
  'reg-4': {
    seriesTitle: 'Registry & Wiederverwendung',
    name: 'Upstream pinnen und updaten',
    objective: 'Import mit Pin lesen, dann bewusst `dvc update`.',
    learning: ['import pinnt path + md5', 'update ist ein Review-Ereignis'],
    fieldNotes: ['Update-Bump im PR mit Changelog-Link'],
    startDialog: [
      { title: 'Mit Quittung leihen', markdown: 'get kopiert Â· import pinnt Â· update bewegt den Pin.' },
    ],
  },
  'capstone-2': {
    seriesTitle: 'Collab & CI',
    name: 'Abschluss-Checkpoint end-to-end',
    objective: 'Abschlussdrill: dirty â†’ status â†’ add/commit â†’ push â†’ Pointer-only git commit.',
    learning: ['End-to-end ist eine ErzÃ¤hlung', 'Ohne Push/Pointer-Commit bricht der nÃ¤chste Teammate'],
    fieldNotes: ['Onboarding-Gate fÃ¼r Datenarbeit'],
    startDialog: [
      { title: 'Abschluss', markdown: 'Keine neuen Befehle. **Eine stimmige Geschichte.**' },
    ],
  },
  'api-1': {
    seriesTitle: 'Collab & CI',
    name: 'Daten lesen ohne checkout (dvc.api)',
    objective: 'DVC-API im Simulator nutzen und Workspace-Pointer-Vertrag prÃ¼fen.',
    learning: ['dvc.api liest getrackte Daten in Apps/Notebooks', 'API ersetzt checkout nicht fÃ¼r Dateien auf Platte'],
    fieldNotes: ['Dashboards nutzen dvc.api + gepinnten Commit, keine Ad-hoc-Downloads'],
    startDialog: [
      {
        title: 'Bytes im Code leihen',
        markdown: '`dvc.api` fÃ¼r Apps. `dvc checkout` fÃ¼r Workspaces.',
      },
    ],
  },
  'cmp-5': {
    seriesTitle: 'Review & Vergleich',
    name: 'Komplettes ML-Review-Paket',
    objective: 'Ein Change, das ganze Paket: params diff, metrics diff, plots diff nach repro.',
    learning: ['Ernsthafter ML-PR liefert Absicht + Wirkung + Kurven', 'Ohne metrics/plots stempeln Reviewer ab'],
    fieldNotes: ['PR-Body mit drei Slots: params / metrics / plots'],
    startDialog: [
      {
        title: 'Minimum eines ernsthaften PR',
        markdown: 'params diff â†’ repro â†’ metrics diff â†’ plots diff.',
      },
    ],
  },
  'mastery-1': {
    seriesTitle: 'Collab & CI',
    name: 'Disaster Recovery: Restore aus der Remote',
    objective: 'Verlorene Maschine simulieren: Workspace leeren, aus Remote fetch+pull, Status prÃ¼fen.',
    learning: ['DR = Remote + committete Pointer', 'fetch fÃ¼llt Cache; pull stellt den Tree her'],
    fieldNotes: ['Quartals-DR-Drill: neue Maschine, clone, pull, metrics'],
    startDialog: [{ title: 'Wenn der Laptop stirbt', markdown: 'Git hat die Pointer-History. Die DVC-Remote die Bytes.' }],
  },
  'mastery-2': {
    seriesTitle: 'Collab & CI',
    name: 'Git-LFS vs DVC Entscheidung',
    objective: 'Richtiges Werkzeug wÃ¤hlen: LFS vs DVC lesen, dann DVC-Tracking fÃ¼r ML-Daten.',
    learning: ['LFS = Blobs in Git-Remotes; DVC = Pointer + Objektspeicher + Pipelines', 'ML will fast immer DVC'],
    fieldNotes: ['Entscheidungstabelle im Wiki statt Slack-Folklore'],
    startDialog: [{ title: 'Langweilig richtig wÃ¤hlen', markdown: 'Repro/exp/cache/pipeline â†’ DVC.' }],
  },
  'mastery-3': {
    seriesTitle: 'Collab & CI',
    name: 'CI Secrets + pull + comment',
    objective: 'Produktions-CI-KÃ¶rper: pull, repro, metrics, CML, Quittung committen.',
    learning: ['Credentials in CI-Secrets, nie in .dvc/config', 'CI-KÃ¶rper ist pull â†’ repro â†’ comment'],
    fieldNotes: ['OIDC/Rollen-Auth schlÃ¤gt langlebige Keys'],
    startDialog: [{ title: 'CI fÃ¼r die Security-Abteilung', markdown: 'Secrets im Vault. Remote-Config in Git. Bytes in der DVC-Remote.' }],
  },
  'mastery-4': {
    seriesTitle: 'Collab & CI',
    name: 'Artifact-Promote: Modell zum Release',
    objective: 'Gewinner-Experiment zum Release: apply, repro, push, Git-Narrativ.',
    learning: ['Release = apply + repro + push + git commit', 'exp apply ist kein Deploy'],
    fieldNotes: ['Checkliste: apply â†’ repro â†’ push â†’ commit â†’ tag'],
    startDialog: [{ title: 'Vom Gewinner zum Release', markdown: 'exp â†’ show â†’ apply â†’ repro â†’ push â†’ git commit.' }],
  },
  'mastery-5': {
    seriesTitle: 'Review & Vergleich',
    name: 'Confusion-Plots-Review',
    objective: 'Confusion-Template rendern und plots diff â€” Klassifikations-Review ohne Notebook.',
    learning: ['Templates kodieren die Lesart', 'plots diff ist der Zwilling von metrics diff'],
    fieldNotes: ['Klassifikation-Releases hÃ¤ngen immer eine Confusion-Matrix an'],
    startDialog: [{ title: 'Matrix lesen, nicht den Mittelwert', markdown: '`dvc plots show --template confusion`.' }],
  },
  'mastery-6': {
    seriesTitle: 'Meta & Vertragsdateien',
    name: 'External Data + no-cache Vertrag',
    objective: 'Stage mit External/no-cache Out, listen, repro, DAG als Vertrag lesen.',
    learning: ['External/no-cache trackt IdentitÃ¤t ohne Warehouse-Bytes', 'DAG ist der Datenvertrag vor dem Merge'],
    fieldNotes: ['Warehouse-Tabellen sind external outs, keine Cache-Objekte'],
    startDialog: [{ title: 'Wenn Bytes woanders liegen', markdown: '`-O` / cache:false trackt den **Namen**, nicht das Lager.' }],
  },
  'mastery-7': {
    seriesTitle: 'Remotes',
    name: 'Remote-Auth ohne Secret-Leaks',
    objective: 'Team-Remote konfigurieren: Nicht-Secrets in Config, Secrets aus env/CI â€” nie Credentials committen.',
    learning: ['URL und Non-Secrets in .dvc/config', 'Secrets aus env/CI/Rollen', 'remote modify kodiert Auth-Policy'],
    fieldNotes: ['.dvc/config im PR reviewen â€” keine langlebigen Keys', 'OIDC/Rollen statt access_key_id in CI'],
    startDialog: [{ title: 'Credentials sind keine Projektdateien', markdown: 'URL/Profil teilen. `secret_access_key` niemals.' }],
  },
  'mastery-8': {
    seriesTitle: 'Collab & CI',
    name: 'Transfer: DatenÃ¤nderung ohne Rezept',
    objective: 'Keine Schrittliste. Daten dirty machen, Pointer committen, Objekte pushen.',
    learning: ['Transfer-Test: Pfad selbst entwerfen', 'Done = sauberer Status + Pointer in Git + Bytes auf Remote'],
    fieldNotes: ['Onboarding-/Hiring-Gate fÃ¼r Data Engineers'],
    startDialog: [{ title: 'Open Lab', markdown: 'Dieses Level **kein Rezept**. Ziel ist ein Zustand.' }],
  },
};

