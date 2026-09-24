/** German level teaching copy. Never includes hint/solution/commands. */

import type { LevelCopy } from './types';

export const deLevels: Record<string, LevelCopy> = {
  'basics-1': {
    seriesTitle: 'Grundlagen',
    name: 'DVC initialisieren',
    objective:
      'DVC in einem Git-Repository initialisieren und die DVC-Metadaten committen, damit das Team dasselbe Data-Versioning-Setup teilt.',
    learning: [
      'DVC erweitert Git für Daten; es ersetzt Git nicht',
      'dvc init legt nur .dvc/-Metadaten an — noch sind keine Daten versioniert',
      'Git versioniert diese Metadaten; Teammates klonen denselben Workflow',
    ],
    fieldNotes: [
      'Repo-Bootstrap: git init → dvc init → .dvc sofort committen',
      'Remote-Config in .dvc/config speichern, damit Clones denselben Data Store erben',
      'Ohne .dvc-Commit hat jeder Teammate einen anderen Daten-Workflow',
    ],
    startDialog: [
      {
        title: 'Warum allein Git bei ML-Daten scheitert',
        markdown:
          'Git speichert jede Version einer Datei in `.git`. Das funktioniert für Quellcode.\n\nBei **Datensätzen und Modellen** bricht es:\n\n- 10 GB in History × viele Versionen → unbrauchbare Clones\n- Binäre Diffs sind opak und langsam\n- Reviewer wollen keine Trainingsdaten im Code-Repo\n\n**DVC** teilt das Problem: Git hält *Pointer*; ein Cache/Remote hält *Bytes*.',
      },
      {
        title: 'Was `dvc init` wirklich tut',
        markdown:
          'Legt ein `.dvc/`-Verzeichnis an mit:\n\n- `config` — wo Remotes und Cache für dieses Projekt liegen\n- `.gitignore` — damit DVCs interner Cache nicht aus Versehen committed wird\n\n**Es lädt keine Daten hoch.** Du schaltest Data-Versioning *an* für dieses Projekt.\n\nMental Model: `git init` für Code ≈ `dvc init` für den Daten-Workflow.',
      },
      {
        title: 'Warum du `.dvc/` mit Git committen musst',
        markdown:
          'Der `.dvc/`-Ordner ist winzig und team-facing.\n\n```\ngit add .dvc\ngit commit -m "Initialize DVC"\n```\n\nOhne das hat Clone #2 Code, aber **kein DVC-Projekt** — `dvc pull` kennt dein Cache-Layout nicht.\n\nBeobachte das Board: Workspace kann „initialized“ sein, während der Git-Setup-Commit noch fehlt.',
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
      'Git committet den Pointer (md5), nie die große Datei',
      'Board: Workspace-Datei wird zu Pointer + Cache-Objekt erscheint',
    ],
    fieldNotes: [
      'Datensätze/Modelle/Artefakte tracken, die du nicht günstig neu bauen kannst',
      'PR-Review liest Pointer-Diffs (md5), nicht Megabytes CSV',
      'CI pullt Daten über DVC; Images bleiben schlank',
    ],
    startDialog: [
      {
        title: 'Was `dvc add` macht',
        markdown:
          'Vier Effekte in einem Befehl:\n\n1. Hash (md5) über den Dateiinhalt\n2. Bytes in `.dvc/cache`\n3. Kleine `.dvc`-Pointer-Datei (YAML)\n4. Rohpfad in `.gitignore`\n\nGit sieht danach nur noch den Pointer.',
      },
    ],
  },
  'basics-3': {
    seriesTitle: 'Grundlagen',
    name: 'Dirty Data und Status',
    objective:
      'Daten ändern, `dvc status` lesen und mit `dvc commit` den neuen Stand in Cache und Pointer übernehmen.',
    learning: [
      'dvc status vergleicht Workspace vs. Pointer vs. Cache',
      'modified = Bytes ≠ md5 im .dvc',
      'dvc commit akzeptiert die neue Datenversion',
    ],
    fieldNotes: [
      'Dirty Data ist der Normalfall nach Feature-Engineering',
      'Nie blind committen — status lesen, dann commit oder checkout',
    ],
    startDialog: [
      {
        title: 'Dirty ist kein Fehler',
        markdown:
          'Wie `git status` für Daten: du hast eine uncommittete Änderung.\n\nAkzeptieren: `dvc commit`\nVerwerfen: `dvc checkout`',
      },
    ],
  },
  'remote-1': {
    seriesTitle: 'Remotes',
    name: 'Remote konfigurieren',
    objective:
      'Eine DVC-Remote anlegen und als Default markieren, damit push/pull wissen, wohin die Objekte gehören.',
    learning: [
      'DVC-Remote ≠ Git-Remote',
      '-d setzt die Default-Remote',
      'Config lebt in .dvc/config und wird geteilt',
    ],
    fieldNotes: [
      'S3/GCS/SSH/local — Hauptsache content-adressierter Objektspeicher',
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
      'dvc push lädt nur fehlende Cache-Objekte',
      'Teammates brauchen denselben Git-Commit + pull',
    ],
    fieldNotes: [
      'Push nach jedem Datenstand, den andere brauchen',
      'CI pullt statt Datensätze in Images zu backen',
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
      'Workspace und Pointer stimmen danach überein',
    ],
    fieldNotes: [
      'Onboarding in Minuten: clone + pull',
      'Laptop-Verlust ist kein Datenverlust, wenn die Remote voll ist',
    ],
    startDialog: [
      {
        title: 'Kleine Clone, große Daten',
        markdown: '```\ngit clone …\ndvc pull\n```\n\nFertig. Kein 40-GB-Download aus der Git-History.',
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
      'deps invalidieren den Stage bei Änderung',
      'outs werden nach erfolgreichem Lauf getrackt',
    ],
    fieldNotes: [
      'Jeder Trainingsschritt, der teuer ist, verdient einen Stage',
      'Code in Git; I/O über DVC',
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
    objective: 'Prepare und Train verknüpfen und mit `dvc repro` die Pipeline ausführen.',
    learning: [
      'dvc repro läuft topologisch, nur dirty Stages',
      'dvc.lock ist die Ausführungsquittung',
    ],
    fieldNotes: ['Repro nach jeder relevanten Änderung', 'Lock nie von Hand editieren'],
    startDialog: [
      {
        title: 'Build-System für ML',
        markdown: 'Nur das, was sich geändert hat, läuft neu.\n\n`dvc repro`',
      },
    ],
  },
  'pipe-3': {
    seriesTitle: 'Pipelines',
    name: 'Params ändern → repro',
    objective:
      'Hyperparameter in `params.yaml` ändern, repro ausführen und Metrics vergleichen.',
    learning: [
      'params.yaml ist menschlich reviewbar',
      '-p verlinkt Params an Stages',
      'Metrics zeigen, was der Lauf brachte',
    ],
    fieldNotes: ['Param-Änderungen sind der Normalfall im Experiment', 'Diff vor dem Merge'],
    startDialog: [
      {
        title: 'Params sind First-Class',
        markdown: 'Ändere `lr` in `params.yaml`, dann `dvc repro` und `dvc metrics show`.',
      },
    ],
  },
  'exp-1': {
    seriesTitle: 'Experimente',
    name: 'Experiment ausführen',
    objective: 'Erstes Experiment mit `dvc exp run` auf der bestehenden Pipeline starten.',
    learning: [
      'exp run ohne Branch-Spam',
      'Params/Metrics werden aufgezeichnet',
    ],
    fieldNotes: ['Experimente ersetzen wilde Branches', 'Immer mit exp show vergleichen'],
    startDialog: [
      {
        title: 'Experimente ohne Branch-Explosion',
        markdown: '`dvc exp run` — Pipeline im Experimentkontext.',
      },
    ],
  },
  'exp-2': {
    seriesTitle: 'Experimente',
    name: 'Parameter sweepe',
    objective: 'Mit `-S` Parameter überschreiben und Experimente mit `dvc exp show` vergleichen.',
    learning: [
      '-S setzt Parameter für diesen Lauf',
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
    name: 'Gewinner übernehmen',
    objective: 'Mit `dvc exp apply` die beste Experimentkonfiguration in den Workspace heben.',
    learning: ['exp apply promoted Params/Metrics', 'Dann Artefakte reproen'],
    fieldNotes: ['Gewinner werden zur neuen Baseline — nicht in Notizen kopieren'],
    startDialog: [
      {
        title: 'Vom Lauf zur Baseline',
        markdown: '`dvc exp apply exp-xxxxxx` — ohne Werte neu zu tippen.',
      },
    ],
  },
  'field-1': {
    seriesTitle: 'Field Practice',
    name: 'Ältere Datenversion wiederherstellen',
    objective:
      'Mit `git checkout` und `dvc checkout` eine ältere Datenversion zurückholen — der Produktions-Rollback-Drill.',
    learning: [
      'Pointer wechseln ist billig',
      'dvc checkout materialisiert die Bytes',
    ],
    fieldNotes: ['Rollback üben, bevor du um 2 Uhr dran denkst'],
    startDialog: [
      {
        title: 'Rollback in zwei Befehlen',
        markdown: '```\ngit checkout HEAD~1 data/data.xml.dvc\ndvc checkout\n```',
      },
    ],
  },
  'field-2': {
    seriesTitle: 'Field Practice',
    name: 'Daten geändert → Pipeline stale',
    objective: 'Nach einer Datenänderung die Pipeline mit `dvc repro` aktualisieren.',
    learning: ['Datenänderung invalidiert dep-Stages', 'repro holt auf'],
    fieldNotes: ['Daten-Drift ist Alltag — repro ist die Antwort'],
    startDialog: [
      {
        title: 'Wenn die Welt sich dreht',
        markdown: 'Daten ändern → Stages dirty → `dvc repro`.',
      },
    ],
  },
  'field-3': {
    seriesTitle: 'Field Practice',
    name: 'Gewinner promoten, dann repro',
    objective: 'Experiment gewinner übernehmen und Artefakte neu bauen.',
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
    learning: ['dvc get kopiert', 'dvc import versioniert die Abhängigkeit'],
    fieldNotes: ['Feature Stores und Modell-Registry-Muster'],
    startDialog: [
      {
        title: 'get vs. import',
        markdown: '`dvc get` = Kopie. `dvc import` = versionierte Abhängigkeit (schreibt .dvc).',
      },
    ],
  },
  'field-6': {
    seriesTitle: 'Field Practice',
    name: 'Incident: Welche Daten?',
    objective:
      'Die Incident-Frage beantworten: welcher Datensatz hat dieses Modell erzeugt?',
    learning: [
      'Git-Commit → Pointer-md5 → Cache/Remote',
      'Ohne committete Pointer existiert die Antwort nicht',
    ],
    fieldNotes: ['Postmortems brauchen diese Kette — übe sie vorher'],
    startDialog: [
      {
        title: '3 Uhr nachts im Incident',
        markdown: '„Welche Daten haben dieses Modell erzeugt?“ — die Kette muss stehen.',
      },
    ],
  },
  'meta-1': {
    seriesTitle: 'Meta-Dateien',
    name: 'dvc.yaml & dvc.lock lesen',
    objective: 'dvc.yaml als Vertrag und dvc.lock als Ausführungsquittung unterscheiden.',
    learning: ['yaml = Definition', 'lock = Receipt (md5s/Params)'],
    fieldNotes: ['Lock nie von Hand editieren — immer repro'],
    startDialog: [
      {
        title: 'Vertrag und Quittung',
        markdown: '`cat dvc.yaml` und `cat dvc.lock` — Definition vs. Ausführung.',
      },
    ],
  },
  'meta-2': {
    seriesTitle: 'Meta-Dateien',
    name: '.dvcignore',
    objective: 'Pfade mit `.dvcignore` ausschließen, damit DVC große Bäume schnell durchläuft.',
    learning: ['.dvcignore ≠ .gitignore', 'Nur DVC überspringt diese Pfade'],
    fieldNotes: ['Scratch-Ordner und Temp-Data raushalten'],
    startDialog: [
      {
        title: 'Was DVC ignoriert',
        markdown: '`.dvcignore` mit Pfadmustern — Speed auf großen Trees.',
      },
    ],
  },
  'meta-3': {
    seriesTitle: 'Meta-Dateien',
    name: 'update + CML-Kommentar',
    objective: 'Importe mit `dvc update` frischen und CI-Feedback mit CML an den PR bringen.',
    learning: ['update holt neue Upstream-Version', 'CML postet Metrics/Plots auf PRs'],
    fieldNotes: ['CI-Skelett: clone → pull → repro → cml comment'],
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
    learning: ['diff = Review-Sicht auf ML-Änderungen'],
    fieldNotes: ['Vor dem Merge immer diff lesen'],
    startDialog: [
      {
        title: 'Review, nicht rätseln',
        markdown: '`dvc params diff` · `dvc metrics diff`',
      },
    ],
  },
  'cmp-2': {
    seriesTitle: 'Vergleich',
    name: 'exp diff nach verschachtelten Params',
    objective: 'Experimente nach verschachtelten Param-Läufen mit `dvc exp diff` vergleichen.',
    learning: ['exp diff zeigt Param- und Metric-Drift'],
    fieldNotes: ['Verschachtelte Keys wie train.lr ernst nehmen'],
    startDialog: [
      {
        title: 'Verschachtelte Params',
        markdown: 'Zwei Läufe, ein `train.n_est`-Weg — dann `dvc exp diff`.',
      },
    ],
  },
  'reg-1': {
    seriesTitle: 'Registry',
    name: 'Daten importieren',
    objective: 'Einen Datensatz aus einer Registry/URL importieren und versionieren.',
    learning: ['import-url trackt externe Quellen'],
    fieldNotes: ['Externe Datensätze brauchen dieselbe Pointer-Disziplin'],
    startDialog: [
      {
        title: 'Externe Quellen',
        markdown: '`dvc import-url` — externe URL als getrackte Daten.',
      },
    ],
  },
  'reg-2': {
    seriesTitle: 'Registry',
    name: 'Modell promoten',
    objective: 'Ein Modell als Artefakt behandeln und mit Git-Tag + pull promoten.',
    learning: ['Registry-Muster: Tag + gezogenes Modell'],
    fieldNotes: ['Keine Gewichte per E-Mail — pull den Stand'],
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
      'Skalare → Metrics, Serien → Plots',
    ],
    fieldNotes: ['Brücke von Notebook zu exp show/plots'],
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
    objective: 'Vega-Templates (linear, confusion) für `dvc plots show` nutzen.',
    learning: ['Templates in dvc.yaml unter plots:', 'show --template confusion'],
    fieldNotes: ['Confusion-Matrix für Stakeholder-Reviews'],
    startDialog: [
      {
        title: 'Templates',
        markdown: '`dvc plots show --template linear` · `--template confusion`',
      },
    ],
  },
  'camp-3': {
    seriesTitle: 'Queue & Sweeps',
    name: 'Parameter-Sweep queueen',
    objective: 'Experimente mit `dvc exp run --queue` parken und gemeinsam starten.',
    learning: ['--queue parkt', 'queue start / --run-all führt aus'],
    fieldNotes: ['Nicht für jeden Hyperparameter einen Job babysitten'],
    startDialog: [
      {
        title: 'Queue',
        markdown: '`dvc exp run --queue -S train.n_est=50` … dann `dvc queue start`.',
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
        markdown: '`dvc stage add --foreach a,b …` — ein Stage, viele Läufe.',
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
        markdown: '`.dvcignore` · `dvc update` · `dvc cml "…"` — alles zusammen.',
      },
    ],
  },
  'cache-1': {
    seriesTitle: 'Cache-Disziplin',
    name: 'Ungenutzte Objekte und gc',
    objective:
      'Ein unreferenziertes Cache-Objekt erzeugen (dirty data + neue Version) und mit `dvc gc` Platz freigeben, ohne den aktuellen Pointer zu verlieren.',
    learning: [
      'Content-adressierter Cache hält alte Hashes bis gc',
      'dvc gc entfernt Objekte ohne Referenz aus Workspace/Git-Refs',
      'gc ist nur sicher, wenn Remotes behalten, was das Team braucht',
    ],
    fieldNotes: [
      'CI-Runner: gc nach pull+repro der SHA, die du auslieferst',
      'Laptops füllen sich mit verwaisten md5s — gc planen, nicht improvisieren',
      'Wenn ein Release-Modell nur im lokalen Cache lag, kann gc die letzte Kopie killen',
    ],
    startDialog: [
      {
        title: 'Cache ist ein Lager, kein Mülleimer',
        markdown:
          'Jedes `dvc add`/`commit` schreibt ein **neues** Objekt. Alte bleiben für History-Checkout.\n\n`dvc gc` ist der Besen — behält nur Referenziertes.',
      },
    ],
  },
  'cache-2': {
    seriesTitle: 'Cache-Disziplin',
    name: 'Workspace, Cache, Remote — Wahrheitstabelle',
    objective:
      'Getrackte Datei löschen, `dvc status` lesen, mit `dvc pull` wiederherstellen, sauberes Status-Finish.',
    learning: [
      'Fehlende Workspace-Datei ≠ verloren, wenn Cache/Remote den Hash haben',
      'dvc pull = fetch + checkout',
      'status ist die ehrliche Karte Pointer ↔ Bytes',
    ],
    fieldNotes: ['Runbook: status → pull → status. Erst dann eskalieren'],
    startDialog: [
      {
        title: 'Drei Orte, eine Tabelle',
        markdown: 'Workspace / Cache / Remote — `dvc status` und `dvc pull` lesen die Tabelle.',
      },
    ],
  },
  'remote-4': {
    seriesTitle: 'Remotes',
    name: 'Zweite Remote + Default wechseln',
    objective: 'Backup-Remote anlegen, Liste prüfen, Default umschalten, pushen.',
    learning: [
      'Mehrere Remotes (origin, backup, team, region) sind normal',
      'Default-Remote nutzen push/pull ohne -r',
      'Remote-Config steckt in .dvc/config und wird geteilt',
    ],
    fieldNotes: ['Team-Remote für Daily Work + Cold Backup für DR', 'Credentials nie in .dvc/config'],
    startDialog: [
      {
        title: 'Warum mehr als eine Remote',
        markdown: 'Kollaborationsspeicher ≠ Disaster-Recovery-Speicher.',
      },
    ],
  },
  'remote-5': {
    seriesTitle: 'Remotes',
    name: 'fetch vs pull auf frischer Maschine',
    objective: 'Leerer Cache, volle Remote: `fetch` füllt nur Cache, `pull` materialisiert Workspace.',
    learning: [
      'fetch: remote → cache',
      'pull: fetch + checkout',
      'CI kann prefetchen, ohne den Tree zu zerlegen',
    ],
    fieldNotes: ['CI prefetch vor Build; pull nur wo Bytes gebraucht werden'],
    startDialog: [
      {
        title: 'Zwei Verben, ein Lager',
        markdown: '`fetch` füllt das Lager. `liefert` auch in die Küche (`pull`).',
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
      'cache:false-Outs tracken Identität ohne Cache-Bytes',
    ],
    fieldNotes: ['always-changed für API/Scrapes', 'no-cache für riesige Warehouse-Outs'],
    startDialog: [
      {
        title: 'Stage-Flags aus der Produktion',
        markdown: '`--wdir` · `--always-changed` · `--no-cache` — keine Kosmetik.',
      },
    ],
  },
  'pipe-5': {
    seriesTitle: 'Pipelines',
    name: 'foreach-Matrix + DAG',
    objective: 'Einen Stage mit `--foreach` zur Matrix expandieren, listen und als DAG lesen.',
    learning: ['--foreach macht aus einem Template N Stages', 'Jede Matrixzelle hat eigene Outs', 'DAG ist der Review-Vertrag'],
    fieldNotes: ['Matrix für „diese Modelle müssen zusammen“', 'Suche gehört in `dvc exp`, Produkt in Stages'],
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
        markdown: 'Sweeps (`-S`) + `dvc exp show`. Queue für Übernachtarbeit.',
      },
    ],
  },
  'exp-5': {
    seriesTitle: 'Experimente',
    name: 'Gewinner applyn + Params prüfen',
    objective: 'Sweep, `exp show`, `exp apply`, `params show`, dann repro.',
    learning: ['apply schreibt Config in den Workspace — kein Deploy', 'Danach repro/push für Produktion', 'params show ist der Audit'],
    fieldNotes: ['PR nennt exp-id und Begründung', 'Ohne repro bleiben Modelle stale'],
    startDialog: [
      {
        title: 'Gewinner ist kein Release',
        markdown: '`exp apply` → `dvc repro` → `dvc push`.',
      },
    ],
  },
  'cmp-3': {
    seriesTitle: 'Review & Vergleich',
    name: 'params + metrics diff Drill',
    objective: 'Hyperparameter ändern, `params diff`, repro, `metrics diff` — das ML-Review-Paket.',
    learning: ['params diff = Absicht', 'metrics diff = Wirkung', 'Zusammen das Minimum an ML-Review'],
    fieldNotes: ['Beide Diffs in die PR. Reviewer öffnen kein Notebook'],
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
    objective: 'Repro, Vega-Template rendern, `plots diff` über die Änderung.',
    learning: ['Plots sind Review-Artefakte', 'Templates kodieren die Lesart', 'plots diff ist der Zwilling von metrics diff'],
    fieldNotes: ['CML hängt Plot-Bilder an PRs'],
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
    fieldNotes: ['Gold-Modell freezen, während Research zappelt', 'unfreeze mit Review + repro + push'],
    startDialog: [
      {
        title: 'Ein Pin mit Konsequenzen',
        markdown: 'Freeze schützt. Versteckt aber Staleness, wenn man es vergisst.',
      },
    ],
  },
  'meta-5': {
    seriesTitle: 'Meta & Vertragsdateien',
    name: 'lock ist die Quittung',
    objective: 'Param brechen, repro, yaml vs lock lesen — Definition vs Ausführungsquittung.',
    learning: ['dvc.yaml = Vertrag', 'dvc.lock = Quittung', 'Lock von Hand editieren lügt'],
    fieldNotes: ['yaml braucht Human Review; lock kommt aus CI repro'],
    startDialog: [
      {
        title: 'Vertrag vs Quittung',
        markdown: '`cat dvc.yaml` · `cat dvc.lock`.',
      },
    ],
  },
  'reg-3': {
    seriesTitle: 'Registry & Wiederverwendung',
    name: 'import und sauberer Status',
    objective: 'Upstream-Artefakt als versionierte Abhängigkeit importieren und Status sauber halten.',
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
    objective: 'Kanonische CI-Schleife: pull, repro, metrics lesen, CML-Kommentar, Receipt committen.',
    learning: ['CI: clone → pull → repro → cml comment', 'Schwere Bytes in der DVC-Remote', 'CML macht Metriken reviewbar'],
    fieldNotes: ['Das ist das YAML aus den GitHub Actions Beispielen'],
    startDialog: [
      {
        title: 'CI-Religion in drei Zeilen',
        markdown: '```\ndvc pull\ndvc repro\ndvc cml "…"\n```',
      },
    ],
  },
  'camp-7': {
    seriesTitle: 'Collab & CI',
    name: 'DVCLive-Metriken nach exp show',
    objective: 'Lauf mit DVCLive instrumentieren und in der Experimenttabelle sehen.',
    learning: ['DVCLive verbrückt Trainingscode → metrics/plots', 'Skalare = Metrics, Serien = Plots'],
    fieldNotes: ['Ein Live() in train.py schlägt zehn shell echoes'],
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
    objective: 'Voller Daten-PR-Pfad: dirty → status → add/commit → git commit nur Pointer.',
    learning: ['PR-Review ist Pointer-md5 + lock, nicht Gigabytes', 'Ohne dvc commit lügt der Pointer'],
    fieldNotes: ['CI failt, wenn jemand getrackte Daten staged'],
    startDialog: [
      {
        title: 'Der einzige sichere Daten-PR',
        markdown: 'Status → add → commit → git add nur Pointer-Dateien → commit.',
      },
    ],
  },
  'collab-2': {
    seriesTitle: 'Collab & CI',
    name: 'Incident: Welche Daten, welches Modell?',
    objective: 'Incident-Frage mit Evidenz beantworten: pointer → git → remote → clean checkout.',
    learning: ['Release-Commit → pointer md5 → cache/remote', 'Ohne committete Pointer existiert die Antwort nicht'],
    fieldNotes: ['Das ist die Postmortem-Checkliste für „schlechtes Modell in Prod“'],
    startDialog: [
      {
        title: '2-Uhr-Checkliste',
        markdown: 'Commit → pointer → md5 → remote? → checkout + `dvc checkout`.',
      },
    ],
  },
  'collab-3': {
    seriesTitle: 'Collab & CI',
    name: 'Teammate-Handoff: push + Pointer-Commit',
    objective:
      'Datenänderung so veröffentlichen, dass ein Teammate reproduzieren kann: push, Pointer committen, sauberer Status nach pull.',
    learning: [
      'Handoff = Remote-Objekte + Git-Pointer-Commit, kein Zip',
      'Push ohne Pointer-Commit strandet Bytes',
      'status nach pull ist der Abnahmetest',
    ],
    fieldNotes: ['Done für Datenarbeit: Teammate pull auf sauberer Maschine'],
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
      'PR-Konflikt lösen: Params geändert, Lock stale. Repro, Receipt committen, Status sauber.',
    learning: ['yaml = Absicht, lock = Quittung', 'Lock nie von Hand mergen'],
    fieldNotes: ['Playbook: status → repro → commit → status'],
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
      { title: 'Mit Quittung leihen', markdown: 'get kopiert · import pinnt · update bewegt den Pin.' },
    ],
  },
  'capstone-2': {
    seriesTitle: 'Collab & CI',
    name: 'Abschluss-Checkpoint end-to-end',
    objective: 'Abschlussdrill: dirty → status → add/commit → push → Pointer-only git commit.',
    learning: ['End-to-end ist eine Erzählung', 'Ohne Push/Pointer-Commit bricht der nächste Teammate'],
    fieldNotes: ['Onboarding-Gate für Datenarbeit'],
    startDialog: [
      { title: 'Abschluss', markdown: 'Keine neuen Befehle. **Eine stimmige Geschichte.**' },
    ],
  },
  'api-1': {
    seriesTitle: 'Collab & CI',
    name: 'Daten lesen ohne checkout (dvc.api)',
    objective: 'DVC-API im Simulator nutzen und Workspace-Pointer-Vertrag prüfen.',
    learning: ['dvc.api liest getrackte Daten in Apps/Notebooks', 'API ersetzt checkout nicht für Dateien auf Platte'],
    fieldNotes: ['Dashboards nutzen dvc.api + gepinnten Commit, keine Ad-hoc-Downloads'],
    startDialog: [
      {
        title: 'Bytes im Code leihen',
        markdown: '`dvc.api` für Apps. `dvc checkout` für Workspaces.',
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
        markdown: 'params diff → repro → metrics diff → plots diff.',
      },
    ],
  },
  'mastery-1': {
    seriesTitle: 'Collab & CI',
    name: 'Disaster Recovery: Restore aus der Remote',
    objective: 'Verlorene Maschine simulieren: Workspace leeren, aus Remote fetch+pull, Status prüfen.',
    learning: ['DR = Remote + committete Pointer', 'fetch füllt Cache; pull stellt den Tree her'],
    fieldNotes: ['Quartals-DR-Drill: neue Maschine, clone, pull, metrics'],
    startDialog: [{ title: 'Wenn der Laptop stirbt', markdown: 'Git hat die Pointer-History. Die DVC-Remote die Bytes.' }],
  },
  'mastery-2': {
    seriesTitle: 'Collab & CI',
    name: 'Git-LFS vs DVC Entscheidung',
    objective: 'Richtiges Werkzeug wählen: LFS vs DVC lesen, dann DVC-Tracking für ML-Daten.',
    learning: ['LFS = Blobs in Git-Remotes; DVC = Pointer + Objektspeicher + Pipelines', 'ML will fast immer DVC'],
    fieldNotes: ['Entscheidungstabelle im Wiki statt Slack-Folklore'],
    startDialog: [{ title: 'Langweilig richtig wählen', markdown: 'Repro/exp/cache/pipeline → DVC.' }],
  },
  'mastery-3': {
    seriesTitle: 'Collab & CI',
    name: 'CI Secrets + pull + comment',
    objective: 'Produktions-CI-Körper: pull, repro, metrics, CML, Receipt committen.',
    learning: ['Credentials in CI-Secrets, nie in .dvc/config', 'CI-Körper ist pull → repro → comment'],
    fieldNotes: ['OIDC/Rollen-Auth schlägt langlebige Keys'],
    startDialog: [{ title: 'CI für die Security-Abteilung', markdown: 'Secrets im Vault. Remote-Config in Git. Bytes in der DVC-Remote.' }],
  },
  'mastery-4': {
    seriesTitle: 'Collab & CI',
    name: 'Artifact-Promote: Modell zum Release',
    objective: 'Gewinner-Experiment zum Release: apply, repro, push, Git-Narrativ.',
    learning: ['Release = apply + repro + push + git commit', 'exp apply ist kein Deploy'],
    fieldNotes: ['Checkliste: apply → repro → push → commit → tag'],
    startDialog: [{ title: 'Vom Gewinner zum Release', markdown: 'exp → show → apply → repro → push → git commit.' }],
  },
  'mastery-5': {
    seriesTitle: 'Review & Vergleich',
    name: 'Confusion-Plots-Review',
    objective: 'Confusion-Template rendern und plots diff — Klassifikations-Review ohne Notebook.',
    learning: ['Templates kodieren die Lesart', 'plots diff ist der Zwilling von metrics diff'],
    fieldNotes: ['Klassifikation-Releases hängen immer eine Confusion-Matrix an'],
    startDialog: [{ title: 'Matrix lesen, nicht den Mittelwert', markdown: '`dvc plots show --template confusion`.' }],
  },
  'mastery-6': {
    seriesTitle: 'Meta & Vertragsdateien',
    name: 'External Data + no-cache Vertrag',
    objective: 'Stage mit External/no-cache Out, listen, repro, DAG als Vertrag lesen.',
    learning: ['External/no-cache trackt Identität ohne Warehouse-Bytes', 'DAG ist der Datenvertrag vor dem Merge'],
    fieldNotes: ['Warehouse-Tabellen sind external outs, keine Cache-Objekte'],
    startDialog: [{ title: 'Wenn Bytes woanders liegen', markdown: '`-O` / cache:false trackt den **Namen**, nicht das Lager.' }],
  },
  'mastery-7': {
    seriesTitle: 'Remotes',
    name: 'Remote-Auth ohne Secret-Leaks',
    objective: 'Team-Remote konfigurieren: Nicht-Secrets in Config, Secrets aus env/CI — nie Credentials committen.',
    learning: ['URL und Non-Secrets in .dvc/config', 'Secrets aus env/CI/Rollen', 'remote modify kodiert Auth-Policy'],
    fieldNotes: ['.dvc/config im PR reviewen — keine langlebigen Keys', 'OIDC/Rollen statt access_key_id in CI'],
    startDialog: [{ title: 'Credentials sind keine Projektdateien', markdown: 'URL/Profil teilen. `secret_access_key` niemals.' }],
  },
  'mastery-8': {
    seriesTitle: 'Collab & CI',
    name: 'Transfer: Datenänderung ohne Rezept',
    objective: 'Keine Schrittliste. Daten dirty machen, Pointer committen, Objekte pushen.',
    learning: ['Transfer-Test: Pfad selbst entwerfen', 'Done = sauberer Status + Pointer in Git + Bytes auf Remote'],
    fieldNotes: ['Onboarding-/Hiring-Gate für Data Engineers'],
    startDialog: [{ title: 'Open Lab', markdown: 'Dieses Level **kein Rezept**. Ziel ist ein Zustand.' }],
  },
};
