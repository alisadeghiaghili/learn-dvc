/** German level teaching copy. Never includes hint/solution/commands. */

import type { LevelCopy } from './types';

export const deLevels: Record<string, LevelCopy> = {
  'basics-1': {
    seriesTitle: 'Grundlagen',
    name: 'DVC initialisieren',
    objective:
      'Initialisiere DVC in einem Git-Repository und committe die Dateien, die `dvc init` gestaged hat, damit das ganze Team dasselbe Data-Versioning-Setup nutzt.',
    learning: [
      'DVC erweitert Git für Daten; es ersetzt Git nicht',
      'dvc init braucht ein Git-Repository (oder --no-scm) und legt nur .dvc/-Metadaten an — noch ist nichts versioniert',
      'dvc init staged .dvc/config, .dvc/.gitignore und .dvcignore bereits für dich; du committest sie nur',
    ],
    fieldNotes: [
      'Repo-Bootstrap: git init → dvc init → git commit (dvc init hat git add schon erledigt)',
      'Remote-Config gehört in .dvc/config, damit Clones denselben Datenspeicher erben',
      'Ohne Commit von .dvc hat jede Person einen anderen Daten-Workflow',
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
          'Läuft in einem Git-Repository (außerhalb bricht `dvc init` ab und verweist auf `--no-scm`). Es legt an:\n\n- `.dvc/config` — wo Remotes und Cache für dieses Projekt liegen\n- `.dvc/.gitignore` — damit DVCs interner Cache nicht versehentlich committet wird\n- `.dvcignore` — Muster, die DVC überspringt, wie `.gitignore` für DVC\n\n**Es lädt keine Daten hoch.** Du schaltest Data-Versioning für das Projekt *ein*.\n\nMentales Modell: `git init` für Code ≈ `dvc init` für den Daten-Workflow.',
      },
      {
        title: 'Warum du das Ergebnis mit Git committen musst',
        markdown:
          'Diese Dateien sind winzig und teamweit relevant. `dvc init` hat sie schon mit `git add` gestaged (siehe `git status`), es fehlt nur der Commit:\n\n```\ngit commit -m "Initialize DVC"\n```\n\nOhne ihn hat Clone #2 Code, aber **kein DVC-Projekt** — `dvc pull` kennt dein Cache-Layout nicht.\n\nSchau aufs Board: Der Workspace kann „initialized“ sein, während im Git-Verlauf der Setup-Commit noch fehlt.',
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
      {
        title: 'Was unter der Haube passiert',
        markdown:
          'Nach `dvc add`:\n\n- Der Workspace behält `data/data.xml` — standardmäßig als Kopie (`cache.type` ist `reflink,copy`; Reflinks, Hardlinks oder Symlinks sind optional)\n- `.dvc/cache/.../md5/xx/…` enthält die eigentlichen Bytes, inhaltsadressiert\n- `data/data.xml.dvc` ist YAML mit Pfad + md5 — **das, was Git speichert**\n- `data/.gitignore` ignoriert den Rohpfad\n\n**Git** → Code + Pointer. **DVC Cache/Remote** → Nutzdaten.',
      },
      {
        title: 'Typischer Fehler',
        markdown:
          'Aus Gewohnheit `git add data/data.xml`.\n\nVor `dvc add` akzeptiert Git das (hier mit Warnung) — und bringt das Ursprungsproblem zurück. Nach `dvc add` verweigert Git: *„The following paths are ignored by one of your .gitignore files“*. Ins Git gehören **nur** die `.dvc`-Datei und die Ignore-Regeln.',
      },
    ],
  },
  'basics-3': {
    seriesTitle: 'Grundlagen',
    name: 'Dirty Data und Status',
    objective:
      'Ändern sich Daten auf der Platte, erkenne es mit `dvc status`, übernimm die neue Version mit `dvc add` und halte die Pointer-Änderung dann in Git fest.',
    learning: [
      'Workspace-Änderung ohne Pointer-Update = dirty Data',
      'dvc status ist das Daten-Pendant zu git status',
      'Erneutes dvc add schreibt den neuen md5 in die .dvc-Datei und die neuen Bytes in den Cache; git commit versioniert den Pointer',
      'Die Historie behält alte md5 — später kommst du per checkout zurück',
    ],
    fieldNotes: [
      'Dirty Data ist der Normalfall nach Feature-Engineering',
      'Nie blind committen — status lesen, dann commit oder checkout',
    ],
    startDialog: [
      {
        title: 'Daten ändern sich; Pointer hinken hinterher',
        markdown:
          'In echten Projekten wächst der Datensatz (neuer Scrape, neue Labels).\n\n```\nedit data/data.xml\n```\n\nJetzt gilt: **Workspace-Inhalt ≠ Pointer-md5**. Das ist „dirty“, genau wie uncommitteter Code.\n\nHast du darauf trainiert, ist das Ergebnis **nicht reproduzierbar**, bis die Datenversion festgehalten ist.',
      },
      {
        title: 'Status → add → Git',
        markdown:
          '```\ndvc status\ndvc add data/data.xml\ngit add data/data.xml.dvc\ngit commit -m "Dataset updates"\n```\n\n1. **status** — welche Datendateien abweichen\n2. **dvc add** — erneut auf die geänderte Datei: neuer md5 in die `.dvc`-Datei, neue Bytes in den Cache\n3. **git commit** — den Pointer in die Code-Zeitleiste bringen\n\nOhne Schritt 2 würde Git eine *Lüge* versionieren (alter Hash, neue Datei). (`dvc commit` ist das Gegenstück für Pipeline-Ausgaben und `--no-commit`; bei einer normal getrackten Datei ist erneutes `add` der Alltag.)',
      },
    ],
  },
  'basics-4': {
    seriesTitle: 'Grundlagen',
    name: 'Dataset-Verzeichnis tracken',
    objective:
      'Tracke ein Dataset-Verzeichnis (`data/images`) mit DVC, sodass alle Dateien über ein Verzeichnis-Manifest (.dir) versioniert werden.',
    learning: [
      'DVC trackt Verzeichnisse als Einheit über einen .dir-Manifest-Hash',
      'Die Pointer-Datei heißt <folder>.dvc (data/images.dvc)',
      'Git ignoriert den gesamten Ordner und speichert nur die Pointer-Datei',
    ],
    fieldNotes: [
      'Bild- und Audiodatensätze gehören in getrackte Ordner, nicht in hunderte einzelne .dvc-Dateien',
      'PR-Reviews prüfen ein einzelnes .dir-Diff statt Git-History aufzublähen',
    ],
    startDialog: [
      {
        title: 'Einzeldatei vs. Verzeichnis in DVC',
        markdown:
          'In Computer Vision bestehen Datensätze aus tausenden Bildern.\n\n`dvc add` auf jede Datei würde tausende `.dvc`-Dateien in Git anlegen!\n\nStattdessen trackt man den ganzen Ordner:\n```\ndvc add data/images\n```\n\nDVC erstellt ein Manifest mit `.dir`-Hash und einen kompakten Pointer.',
      },
      {
        title: 'Verzeichnis-Pointer committen',
        markdown:
          '```\ngit add data/images.dvc data/.gitignore\ngit commit -m "Track raw images directory"\n```\n\nGit versioniert nur den schlanken Pointer. Alle Bytes liegen sicher im DVC-Cache.',
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
      {
        title: 'Was ein Lauf hinterlässt',
        markdown:
          'Jedes `dvc exp run -S` führt die Pipeline **sofort** aus und lässt den Workspace mit diesem Lauf zurück: `params.yaml` zeigt den letzten `-S`-Wert, `git status` meldet sie als geändert.\n\nJeder Lauf wird außerdem als Experiment gespeichert (versteckte Git-Refs); beide Sweeps bleiben also in `dvc exp show`, auch wenn der Workspace weiterwandert. Willst du den Workspace nicht anfassen, stelle den Lauf mit `--queue` zurück und starte ihn später.',
      },
    ],
  },
  'exp-3': {
    seriesTitle: 'Experimente',
    name: 'Gewinner übernehmen',
    objective:
      'Führe ein Experiment mit `lr=0.05` aus, liste die Experimente und wende es mit `dvc exp apply <id>` an: Der Workspace bekommt Params, Metrics und Ausgaben dieses Experiments.',
    learning: [
      'Auswahl nach dem Vergleich — apply befördert einen Gewinner',
      'apply stellt Params, Metrics und Ausgabedateien wieder her; Stages sind ohne repro aktuell',
      'Pointer + Params + Metrics bleiben für Audits verknüpft',
    ],
    fieldNotes: ['Gewinner werden zur neuen Baseline — nicht in Notizen kopieren'],
    startDialog: [
      {
        title: 'Vom Lauf zur Baseline',
        markdown: '`dvc exp apply exp-xxxxxx` — ohne Werte neu zu tippen.',
      },
      {
        title: 'apply bringt auch die Ausgaben zurück',
        markdown:
          '`dvc exp apply <id>` stellt `params.yaml`, Metrics **und Ausgabedateien** (etwa `model.pkl`) des Experiments im Workspace wieder her — deine neue **Baseline**. Danach ist kein `dvc repro` nötig.\n\nOffiziell wird die Baseline erst, wenn du sie mit Git committest.',
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
    name: 'Den Gewinner in einen Commit überführen',
    objective:
      'Ein Gewinner-Experiment wird erst durch einen Commit zur Produktions-Baseline: ausführen, anwenden (Params und Ausgaben kommen zurück), dann `params.yaml` und `dvc.lock` committen.',
    learning: [
      'apply stellt Params, Metrics und Ausgaben wieder her — danach kein dvc repro nötig',
      'Offiziell ist die Baseline erst nach einem Git-Commit von params.yaml, dvc.lock (und dvc.yaml, falls geändert)',
      'Alternative: dvc exp branch macht aus dem Experiment einen eigenen Git-Branch für den Review',
    ],
    fieldNotes: [
      'Release-Checkliste: exp show → exp apply → git add params.yaml dvc.lock → git commit → dvc push',
      'CI kann repro auf dem Release-Commit laufen lassen und so belegen, dass das Modell zur committeten Config passt',
    ],
    startDialog: [
      {
        title: 'apply ist nicht das Ende',
        markdown:
          '```\ndvc exp run -S lr=0.05\ndvc exp apply <id>\ngit add params.yaml dvc.lock\ngit commit -m "Promote lr=0.05"\n```\n\n`apply` legt den Gewinner in deinen **Workspace**: Params, Metrics und `model.pkl` sind zurück, Stages sind aktuell. Sehen kann es das Team aber erst nach dem Commit.',
      },
      {
        title: 'Wann etwas fertig ist',
        markdown:
          'Eine Baseline ist fertig, wenn:\n\n1. ein Git-Commit Code + Params + `dvc.lock` festhält\n2. die Pipeline-Ausgaben zu diesem Lock passen (apply hat sie wiederhergestellt)\n3. das Remote die Objekte hat, die das Team braucht (`dvc push`)\n\nLieber ein Review-Branch? `dvc exp branch <id> <branch>` erzeugt einen aus dem Experiment.',
      },
    ],
  },
  'capstone-1': {
    seriesTitle: 'Capstone',
    name: 'End-to-End-Drill',
    objective:
      'Liefere ein datengestütztes Experiment Ende-zu-Ende: Remote, Push, Pipeline, Repro, Experiment, Apply — dann das Ergebnis committen, sodass train aktuell bleibt.',
    learning: ['add/commit/push/pull als eine Geschichte', 'Pipelines und Exp im Kontext'],
    fieldNotes: ['Das ist der Alltagstag im ML-Team'],
    startDialog: [
      {
        title: 'Alles zusammen',
        markdown: 'Zeit, die Teile zu einer Produktionsschicht zu machen.',
      },
      {
        title: 'So sieht Erfolg aus',
        markdown:
          'Board: Daten getrackt, Cache gefüllt, Remote hält die Objekte.\nDAG: prepare → train reproduziert.\nExperimente: mindestens eins mit `lr=0.05`, angewendet und committet (`params.yaml`, `dvc.yaml`, `dvc.lock`).\n\nEine Mini-Produktionspipeline, die du am Whiteboard erklären kannst.',
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
    learning: ['yaml = Definition', 'lock = Quittung (md5s/Params)'],
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
    learning: [
      'Zwei Läufe + diff > ein Lauf und ein Bauchgefühl',
      'Verschachtelte Keys funktionieren mit -S (train.n_est=…)',
      'exp diff ohne Argumente vergleicht Workspace und HEAD; nenne zwei Experimente, um sie zu vergleichen',
    ],
    fieldNotes: ['Verschachtelte Keys wie train.lr ernst nehmen'],
    startDialog: [
      {
        title: 'Sweep, dann diff',
        markdown:
          '```\ndvc exp run -n n50 -S train.n_est=50\ndvc exp run -n n100 -S train.n_est=100\ndvc exp diff n50 n100\n```',
      },
      {
        title: 'Verschachtelte -S-Keys',
        markdown:
          'Beachte `train.n_est=…` — derselbe gepunktete Key wie in `params.yaml` / Stage-`-p`.\n\n`dvc exp diff` ohne Argumente vergleicht den **Workspace mit HEAD**. Gibst du zwei Experimentnamen an, zeigt es die Param- und Metric-Deltas genau zwischen diesen beiden.',
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
    name: 'DVCLive: aus dem Trainingsskript loggen',
    objective:
      'Sieh, wie **DVCLive** arbeitet: lies die Logging-Aufrufe in `src/train.py`, führe das Skript aus und betrachte die geschriebenen Metrics und Plots.',
    learning: [
      'DVCLive ist eine Python-Bibliothek, die das Trainingsskript importiert (`from dvclive import Live`) — kein dvc-Unterbefehl',
      'live.log_metric → Skalare in dvclive/metrics.json; live.next_step() → ein weiterer Punkt in den Plots',
      'log_param, log_plot, log_image und make_report ergänzen Params, eigene Plots, Bilder und einen HTML-Bericht',
    ],
    fieldNotes: [
      'print(loss) durch live.log_metric ersetzen — dann funktionieren plots/exp von selbst',
      'Die dvc.yaml-Einträge für metrics/plots, die auf dvclive/ zeigen, mit committen',
    ],
    startDialog: [
      {
        title: 'Was jeder DVC-Kurs nach den Pipelines ergänzt',
        markdown:
          'Das Kapitel **Metrics/Plots** im offiziellen Get Started läuft über DVCLive im Trainingscode:\n\n```\nfrom dvclive import Live\n\nwith Live() as live:\n    live.log_param("lr", 0.05)\n    for epoch in range(5):\n        ...\n        live.log_metric("acc", acc)\n        live.next_step()\n```\n\nEs gibt kein `dvc live`-Kommando. `cat src/train.py` zeigt hier das instrumentierte Skript, `python src/train.py` führt es aus.',
      },
      {
        title: 'Mentale Karte',
        markdown:
          '- `log_param` → `dvclive/params.yaml`\n- `log_metric` → `dvclive/metrics.json` + `plots/metrics/*.tsv`\n- `log_plot` → eigene Plotdaten\n- `log_image` → Bilder für den Bericht\n- `make_report` → HTML-Dashboard\n\nOhne diese Schicht bleiben `exp show` und `plots diff` in echten Projekten leer.',
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
    name: 'foreach-Stages in dvc.yaml',
    objective:
      'Lies eine `dvc.yaml`, deren **foreach** eine Definition über ein Dictionary expandiert, reproduziere jede erzeugte Stage und lies den DAG.',
    learning: [
      'foreach expandiert eine Definition zu vielen Stages (featurize@a, featurize@b) — geschrieben in dvc.yaml, nicht per dvc stage add',
      '${key} und ${item.field} füllen die Vorlage aus jedem Eintrag',
      'Jede erzeugte Stage hat eigene Outs und Invalidierung; ein DAG zeigt alle',
    ],
    fieldNotes: ['foreach schlägt Copy-Paste-YAML bei Jobs pro Modell / pro Region'],
    startDialog: [
      {
        title: 'Die nächsten 20 % der Pipelines',
        markdown:
          '`foreach` (und `matrix`) gibt es nur in `dvc.yaml`. `cat dvc.yaml` zeigt ein Beispiel:\n\n```\nfeaturize:\n  foreach:\n    a: {max_features: 100}\n    b: {max_features: 500}\n  do:\n    cmd: python src/evaluate.py ${key} ${item.max_features}\n    outs: [data/features/${key}.pkl]\n```\n\nDVC expandiert es zu `featurize@a` und `featurize@b`.',
      },
      {
        title: 'Stage-Optionen, die man kennen sollte',
        markdown:
          '- `foreach` / `matrix` — Stages aus Liste oder Raster erzeugen\n- `wdir` — aus einem anderen Verzeichnis ausführen\n- `always_changed: true` — repro überspringt nie\n- `outs: [x: {cache: false}]` — `-O`, am Cache vorbei\n\nNur die letzten drei haben Flags bei `dvc stage add` (`-w`, `--always-changed`, `-O`).',
      },
    ],
  },
  'camp-5': {
    seriesTitle: 'Collab & CI',
    name: '.dvcignore + import/update + CML-Kommentar',
    objective:
      'Übe das Trio der Team-Kurse: **`.dvcignore`**, **`dvc import` + `dvc update`** und einen **CML-PR-Kommentar** mit dem separaten `cml`-CLI.',
    learning: [
      '.dvcignore beschleunigt DVC auf riesigen, lauten Verzeichnisbäumen',
      'dvc update funktioniert nur bei .dvc-Dateien aus dvc import / import-url',
      'CML postet einen Markdown-Bericht in PRs: clone → pull → repro → cml comment create',
    ],
    fieldNotes: ['Der letzte Kilometer bis zum Team-Workflow'],
    startDialog: [
      {
        title: 'Checkliste für den Team-Tag',
        markdown:
          '```\nedit .dvcignore scratch/*\ndvc import <registry-url> get-started/data.xml -o data/data.xml\ndvc update data/data.xml.dvc\ndvc repro\ndvc metrics show --md > report.md\ncml comment create report.md\n```\n\nDer letzte Schritt nutzt das separate Werkzeug **CML**, nicht `dvc`. Ein Python-Einzeiler mit `dvc.api` zeigt, wie Apps dieselben Daten ohne Checkout lesen.',
      },
      {
        title: 'Git-LFS vs. DVC (Prüfungsklassiker)',
        markdown:
          '- **Git-LFS**: große Blobs über Git-Hosts\n- **DVC**: Git hält Pointer/YAML; Remotes halten Objekte; dazu repro/exp\n- ML will Pipelines + Experimente → DVC; generische große Binärdateien kommen mit LFS vielleicht aus',
      },
    ],
  },
  'cache-1': {
    seriesTitle: 'Cache-Disziplin',
    name: 'Ungenutzte Objekte und gc',
    objective:
      'Erzeuge eine Datensatzversion, die nichts mehr referenziert, und gib sie mit `dvc gc -w` frei — der aktuelle Pointer bleibt gültig.',
    learning: [
      'Der inhaltsadressierte Cache behält alte Hashes bis zu gc',
      'dvc gc braucht ein Bereichs-Flag: -w behält nur, was der Workspace nutzt, -A jeden Git-Commit',
      'gc löscht nur im lokalen Cache; -c/--cloud bereinigt auch das Remote (danach kommt niemand mehr an diese Version)',
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
          'Jedes `dvc add` schreibt ein **neues** Objekt. Alte bleiben, damit `dvc checkout` die Historie wiederherstellen kann.\n\nMit der Zeit werden GBs verwaister Objekte daraus. `dvc gc` ist der Besen — er behält aber nur, was im genannten Bereich liegt.',
      },
      {
        title: 'Was „referenziert“ heißt',
        markdown:
          'Du wählst den Bereich, der **bleibt**:\n\n- `-w` — was der aktuelle Workspace nutzt\n- `-a` / `-T` — Branch-Spitzen / Tags\n- `-A` — jeder Commit\n\nOhne Bereichs-Flag läuft `dvc gc` nicht. Alles außerhalb wird aus dem lokalen Cache gelöscht; das Remote bleibt unberührt, außer mit `-c` (`--cloud`).\n\n**Regel:** erst pushen, was Produktion braucht, *dann* gc.',
      },
      {
        title: 'Übung',
        markdown:
          '1. Datensatz verschmutzen (`edit data/data.xml`)\n2. `dvc add data/data.xml` → neuer Hash im Cache, Pointer aktualisiert\n3. `dvc gc -w` → die alte, vom Workspace nicht mehr referenzierte Version verlässt den lokalen Cache (auf dem Remote bleibt sie)\n4. Prüfen: aktuelle Daten sind weiter getrackt und sauber',
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
      {
        title: 'CI und fetch',
        markdown:
          '`dvc fetch` lädt Objekte nur nach `.dvc/cache`; `dvc checkout` verknüpft sie mit dem Workspace. In CI kannst du früh `dvc fetch` ausführen, um eine Cache-Schicht zu wärmen, und `dvc checkout` erst im Job, der die Dateien braucht. Beide akzeptieren Targets: `dvc fetch data/train.csv.dvc` holt einen Datensatz statt des ganzen Projekts.',
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
        title: 'Stage-Flags, die Produktion nutzt',
        markdown:
          '- `--wdir src` — läuft, als wäre das cwd `src/`\n- `--always-changed` — bei repro immer dirty\n- `-O` / `--outs-no-cache` — Hash wird getrackt, die Bytes bleiben außerhalb des Caches (`cache: false`)\n\nDas ist keine Kosmetik; es legt fest, *wie* die Stage lügt oder ehrlich bleibt.',
      },
      {
        title: 'always_changed in der Praxis',
        markdown:
          '`--always-changed` (`always_changed: true` in `dvc.yaml`) lässt DVC die Stage bei jedem `dvc repro` als geändert behandeln, auch wenn sich keine Abhängigkeit bewegt hat. Nutze es für Stages, die die Außenwelt lesen: einen API-Aufruf, eine Datenbankabfrage, einen Zeitstempel. Nachgelagerte Stages laufen trotzdem nur neu, wenn sich der Hash der Ausgabe wirklich unterscheidet.',
      },
    ],
  },
  'pipe-5': {
    seriesTitle: 'Pipelines',
    name: 'foreach und matrix in dvc.yaml',
    objective:
      'Lies eine `dvc.yaml`, deren `foreach` eine Vorlage zu mehreren Stages expandiert, reproduziere die ganze Matrix und lies den DAG.',
    learning: [
      'foreach / matrix gibt es nur in dvc.yaml — `dvc stage add` hat dafür kein Flag',
      'Jede Matrixzelle wird zur eigenen Stage (train@50, train@100) mit eigenen Outs und eigener Invalidierung',
      'Der DAG ist, wie Leads den Vertrag vor dem Merge prüfen',
    ],
    fieldNotes: [
      'Matrix-Stages für „diese drei Modelle müssen zusammen ausgeliefert werden“',
      'Nicht foreach, was zu `dvc exp` gehört — exp ist Suche, Stages sind Produkt',
    ],
    startDialog: [
      {
        title: 'foreach vs. Experimente',
        markdown:
          '**foreach-Stages** = Produktmatrix (muss ausgeliefert werden, reproduzierbarer Vertrag).\n**dvc exp** = Suche (viele Versuche, einen Gewinner wählen).\n\nWer beides mischt, baut Pipelines, die im Incident niemand erklären kann.',
      },
      {
        title: 'Eine Vorlage, viele Stages',
        markdown:
          '`dvc stage add` kann so etwas nicht anlegen; du schreibst es in `dvc.yaml`. `cat dvc.yaml` zeigt die Vorlage:\n\n```\ntrain:\n  foreach: [50, 100]\n  do:\n    cmd: python src/train.py --n ${item}\n    outs: [models/model-${item}.pkl]\n```\n\nDVC expandiert sie zu `train@50` und `train@100` — `dvc stage list`, `dvc repro` und `dvc dag` sehen die expandierten Stages. `matrix:` macht dasselbe für mehrere Variablen gleichzeitig.',
      },
    ],
  },
  'exp-4': {
    seriesTitle: 'Experimente',
    name: 'Zweimal sweepe + exp show',
    objective: 'Zwei Parametersets laufen lassen und mit `dvc exp show` vergleichen.',
    learning: [
      'Jedes `dvc exp run -S` wird als eigenes Experiment mit Params und Metrics festgehalten',
      'exp show stellt sie nebeneinander: Params und Metrics sind Spalten',
      'Mit der Tabelle entscheiden, dann den Gewinner anwenden',
    ],
    fieldNotes: ['Freitagssweep: queueen, am Montag show lesen'],
    startDialog: [
      {
        title: 'Zwei Läufe, eine Tabelle',
        markdown:
          'Gleicher Code, gleiche Daten, zwei Lernraten:\n\n```\ndvc exp run -S lr=0.05\ndvc exp run -S lr=0.2\ndvc exp show\n```\n\nFür lange Sweeps stellst du Läufe mit `--queue` zurück und arbeitest sie später mit `dvc queue start` ab.',
      },
      {
        title: 'exp show lesen',
        markdown:
          '`dvc exp show` listet Workspace und `HEAD`, Experimente verschachtelt unter dem Commit, von dem sie ausgingen. Params und Metrics sind Spalten; `--sort-by acc --sort-order desc` ordnet Läufe, `--only-changed` blendet Spalten aus, die nie variierten, `--md` / `--csv` exportieren die Tabelle. Zwei Zeilen vergleichst du genauer mit `dvc exp diff`.',
      },
    ],
  },
  'exp-5': {
    seriesTitle: 'Experimente',
    name: 'Gewinner applyn + Params prüfen',
    objective:
      'Führe einen Sweep aus, wähle mit `exp show`, wende den Gewinner mit `exp apply` an und prüfe dann, dass `params.yaml` und `dvc status` übereinstimmen.',
    learning: [
      'apply bringt Params, Metrics und Ausgaben in den Workspace — es „deployt“ nicht',
      'Nach apply params.yaml und dvc.lock committen und Artefakte pushen',
      'params show und status sind das Audit nach apply',
    ],
    fieldNotes: [
      'Die PR-Beschreibung nennt die angewendete Exp-ID und den Grund',
      'Anwenden ist kein Release: geteilt wird erst, wenn params.yaml und dvc.lock committet sind',
    ],
    startDialog: [
      {
        title: 'Gewinner ist kein Release',
        markdown:
          '`exp apply` = Gewinner-Params, Metrics **und Ausgaben** im Workspace wiederherstellen.\n`git commit` von `params.yaml` + `dvc.lock` = zur Baseline machen.\n`dvc push` = die Bytes teilen.',
      },
      {
        title: 'Audit nach apply',
        markdown:
          'Zwei schnelle Checks schließen den Kreis:\n\n- `dvc params show` — die Gewinnerwerte stehen wirklich in `params.yaml`\n- `dvc status` — die Pipeline meldet *up to date*, weil apply die Ausgaben dieses Laufs wiederhergestellt hat\n\nListet `status` die Stage weiter als geändert, weicht etwas anderes (Code oder Daten) vom angewendeten Lauf ab.',
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
      {
        title: 'Die beiden Diffs lesen',
        markdown:
          '`dvc params diff` vergleicht `params.yaml` im Workspace mit `HEAD`; mit zwei Revisionen (`dvc params diff main feature`) vergleichst du Commits. `dvc metrics diff` zeigt pro Metrik alten Wert, neuen Wert und die Änderung. Mit `--md` fügst du die Tabelle in einen PR ein, mit `--all` erscheinen auch unveränderte Werte.',
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
      {
        title: 'Plots sind auch nur Dateien',
        markdown:
          '`dvc plots show` rendert die unter `plots:` in `dvc.yaml` deklarierten Dateien nach `dvc_plots/index.html`; `dvc plots diff` legt denselben Plot zweier Revisionen übereinander (standardmäßig Workspace gegen `HEAD`). Das Vega-Template wählst du mit `-t` / `--template` (`linear`, `simple`, `confusion`, …); `--json` oder `--show-vega` liefern die Spezifikation statt HTML, falls CI sie braucht.',
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
      {
        title: 'Freeze steht in dvc.yaml',
        markdown:
          '`dvc freeze` schreibt `frozen: true` in die Stage in `dvc.yaml`; die Entscheidung wird also wie jede andere Änderung in Git reviewt. Eine eingefrorene Stage überspringt `dvc repro` auch bei geänderten Abhängigkeiten, und `dvc status` meldet sie nicht mehr als geändert. Verbinde jedes Einfrieren mit einem Grund und einem Ticket zum Auftauen.',
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
      {
        title: 'Was in dvc.lock steht',
        markdown:
          'Für jede Stage hält `dvc.lock` das genaue `cmd`, md5 und Größe jeder Abhängigkeit, die Werte der verfolgten Params und den md5 jeder Ausgabe fest. Anhand dieser Einträge entscheidet DVC, ob eine Stage veraltet ist — deshalb behebt man einen Konflikt in `dvc.lock` durch erneutes `dvc repro`, nie durch Hash-Handarbeit.',
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
      {
        title: 'update fasst nur Importe an',
        markdown:
          '`dvc import` hält in der `.dvc`-Datei fest, woher die Daten kamen (`repo` und `rev_lock`). `dvc update data/external.csv.dvc` liest diese Quelle erneut und verschiebt den Pin. Bei einer `.dvc`-Datei aus einfachem `dvc add` hat `dvc update` keine Quelle zum Lesen und scheitert.',
      },
    ],
  },
  'camp-6': {
    seriesTitle: 'Collab & CI',
    name: 'CI-Skelett: pull, repro, comment',
    objective:
      'Führe die klassische CI-Schleife aus: Daten ziehen, Pipeline reproduzieren, Markdown-Metrikbericht schreiben, ihn mit dem separaten `cml`-CLI posten, den Receipt committen.',
    learning: [
      'CI-Gerüst: clone → pull → repro → cml comment',
      'Schwere Bytes bleiben im DVC-Remote; Git bleibt klein',
      'CML ist ein eigenes CLI (cml comment create report.md), das einen Markdown-Bericht zum PR-Kommentar macht',
    ],
    fieldNotes: ['Das ist das YAML aus den GitHub Actions Beispielen'],
    startDialog: [
      {
        title: 'Die Drei-Zeilen-CI-Religion',
        markdown:
          '```\ndvc pull\ndvc repro\ncml comment create report.md\n```\n\nZwischen repro und Kommentar erzeugst du den Bericht: `dvc metrics show --md > report.md`. Der Rest ist Installationsarbeit.',
      },
      {
        title: 'Das GitHub-Actions-Gerüst',
        markdown:
          '```\n- uses: iterative/setup-dvc@v1\n- uses: iterative/setup-cml@v2\n- run: |\n    dvc pull\n    dvc repro\n    dvc metrics show --md > report.md\n    cml comment create report.md\n  env:\n    REPO_TOKEN: ${{ secrets.GITHUB_TOKEN }}\n```\n\n`cml` wird getrennt von `dvc` installiert; es braucht nur die Markdown-Datei und ein Token.',
      },
    ],
  },
  'camp-7': {
    seriesTitle: 'Collab & CI',
    name: 'DVCLive-Metriken nach exp show',
    objective:
      'Führe ein Experiment aus, dessen Trainingsskript schon mit DVCLive loggt, und sieh die Metrics in `dvc exp show` und die Kurven in `dvc plots show`.',
    learning: [
      'DVCLive ist eine Python-Bibliothek, die train.py aufruft — kein dvc-Unterbefehl',
      'Mit live.log_metric geloggte Skalare werden Metrics; Schritte werden Plots',
      'exp show ist die menschenlesbare Tabelle über dieser Brücke',
    ],
    fieldNotes: ['Ein Live() in train.py schlägt zehn shell echoes'],
    startDialog: [
      {
        title: 'Schluss mit Loss-Kurven per Copy-Paste',
        markdown:
          'Das Trainingsskript loggt selbst (`cat src/train.py`):\n\n```\nfrom dvclive import Live\n\nwith Live() as live:\n    for epoch in range(5):\n        ...\n        live.log_metric("acc", acc)\n        live.next_step()\n```\n\nDVC muss nur das Skript ausführen und `dvclive/metrics.json` sowie `dvclive/plots/` lesen.',
      },
      {
        title: 'Vom Skript zur Tabelle',
        markdown:
          '`dvc exp run -S lr=0.05` führt die Pipeline aus, dabei schreibt DVCLive seine Dateien. Danach:\n\n- `dvc exp show` — eine Zeile pro Experiment, die geloggten Metrics als Spalten\n- `dvc plots show` — die Schritt-für-Schritt-Kurven von DVCLive\n\nTrage `dvclive/metrics.json` unter `metrics:` und `dvclive/plots` unter `plots:` in `dvc.yaml` ein, dann findet DVC sie automatisch.',
      },
    ],
  },
  'collab-1': {
    seriesTitle: 'Collab & CI',
    name: 'Pointer-PR-Disziplin',
    objective:
      'Geh den kompletten Daten-PR-Pfad: dirty → status → erneut add → git commit nur des Pointers — nie der Rohbytes.',
    learning: [
      'Review-Fläche ist Pointer-md5 + Lock, nicht Gigabytes',
      'Die Commit-Message ist die menschliche Erzählung; .dvc die maschinelle',
      'Ohne erneutes add landet ein lügender Pointer im PR',
    ],
    fieldNotes: ['CI failt, wenn jemand getrackte Daten staged'],
    startDialog: [
      {
        title: 'Der einzig sichere Daten-PR',
        markdown:
          '1. Daten ändern\n2. `dvc status`\n3. `dvc add` (schreibt neuen md5 und cacht die Bytes)\n4. `git add` **nur Pointer-Dateien**\n5. `git commit`\n\nAlles andere ist ein Datenleck oder eine Lüge.',
      },
      {
        title: 'Die Pointer-only-Regel absichern',
        markdown:
          'Nach `dvc add` scheitert `git add data/data.xml`, weil DVC den Pfad in `.gitignore` eingetragen hat — das ist das Sicherheitsnetz. Ergänze eine CI-Prüfung als zweites: lehne einen PR ab, dessen Diff einen Pfad mit `.dvc`-Datei berührt.',
      },
    ],
  },
  'collab-2': {
    seriesTitle: 'Collab & CI',
    name: 'Incident: Welche Daten, welches Modell?',
    objective: 'Incident-Frage mit Evidenz beantworten: pointer → git → remote → sauberer Checkout.',
    learning: ['Release-Commit → pointer md5 → cache/remote', 'Ohne committete Pointer existiert die Antwort nicht'],
    fieldNotes: ['Das ist die Postmortem-Checkliste für „schlechtes Modell in Prod“'],
    startDialog: [
      {
        title: '2-Uhr-Checkliste',
        markdown: 'Commit → pointer → md5 → remote? → checkout + `dvc checkout`.',
      },
      {
        title: 'Ein Modell bis zu den Bytes zurückverfolgen',
        markdown:
          'Starte beim Release-Commit oder -Tag. `git show <rev>:data/data.xml.dvc` liefert den md5; `dvc.lock` in diesem Commit listet den md5 jeder Abhängigkeit und Ausgabe sowie die verwendeten Params. `dvc diff <alt> <neu>` zeigt, was sich zwischen zwei Releases geändert hat. Liegt das Objekt weder im Cache noch im Remote, endet die Spur — deshalb pusht man vor dem Taggen.',
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
        markdown:
          'Geteilt erst wenn: Bytes auf Remote + Pointer in Git + `dvc pull` funktioniert.',
      },
      {
        title: 'Die Übergabe aus einem frischen Clone prüfen',
        markdown:
          'Eine Übergabe zählt erst, wenn ein frischer `git clone` samt `dvc pull` funktioniert. Die Reihenfolge ist wichtig: zuerst `dvc push` (Bytes), dann den Git-Commit pushen (Pointer). Andersherum holt ein Kollege einen Pointer, dessen Daten noch nicht im Remote liegen. `dvc status --cloud` listet auf, was noch nur lokal existiert.',
      },
    ],
  },
  'collab-4': {
    seriesTitle: 'Collab & CI',
    name: 'Lock/Pointer-Konflikt im Daten-PR',
    objective:
      'PR-Konflikt lösen: Params geändert, Lock veraltet. Repro, Quittung committen, Status sauber.',
    learning: ['yaml = Absicht, lock = Quittung', 'Lock nie von Hand mergen'],
    fieldNotes: ['Playbook: status → repro → commit → status'],
    startDialog: [
      {
        title: 'Zwei Personen, ein Vertrag',
        markdown: 'Repro, dann neue Quittung committen.',
      },
      {
        title: 'Konflikte in dvc.lock auflösen',
        markdown:
          '`dvc.lock` wird generiert, deshalb löst man einen Konflikt dort nicht zeilenweise. Nimm eine der beiden Seiten (`git checkout --ours dvc.lock`), führe `dvc repro` erneut aus — Stages mit unveränderten Eingaben überspringt der Run-Cache —, prüfe den Diff und committe. Konflikte in `dvc.yaml` oder `params.yaml` brauchen zuerst eine menschliche Entscheidung, weil sie ändern, was laufen soll.',
      },
    ],
  },
  'reg-4': {
    seriesTitle: 'Registry & Wiederverwendung',
    name: 'Upstream pinnen und updaten',
    objective:
      'Importiere Upstream-Daten an ein Release gepinnt, lies den Pin und verschiebe ihn dann bewusst mit `dvc update --rev` — Versionssprünge sind Review-Ereignisse.',
    learning: [
      'import schreibt einen Pin (Quell-Repo, Rev und md5), den du in der .dvc-Datei lesen kannst',
      'update --rev ist ein bewusster Sprung, wie ein Bibliotheks-Upgrade',
      'status belegt, dass der Sprung sauber gelandet ist',
    ],
    fieldNotes: ['Update-Bump im PR mit Changelog-Link'],
    startDialog: [
      {
        title: 'Ausleihen mit Quittung',
        markdown:
          '`dvc get` kopiert.\n`dvc import` kopiert **und** pinnt.\n`dvc update` verschiebt den Pin mit Absicht.\n\nLies `cat data/external.csv.dvc`, bevor du updatest — wisse, was du zurücklässt.',
      },
      {
        title: 'An eine Rev pinnen, per PR anheben',
        markdown:
          '`dvc import … --rev v1.0` bindet den Import an einen Tag, Branch oder Commit des Quell-Repos. Ein einfaches `dvc update` löst dieselbe Rev neu auf (nützlich bei Branches); `dvc update --rev v2.0 …` ändert die Rev selbst. In beiden Fällen landet der neue md5 in der `.dvc`-Datei, der Sprung erscheint also im Git-Diff zum Review.',
      },
    ],
  },
  'capstone-2': {
    seriesTitle: 'Collab & CI',
    name: 'Abschluss-Checkpoint end-to-end',
    objective:
      'Abschlussübung: dirty Data → status → erneut add → Push zum Remote → Pointer-only-Git-Commit. Eine saubere Geschichte, die ein Lead prüfen kann.',
    learning: ['End-to-end ist eine Erzählung', 'Ohne Push/Pointer-Commit bricht der nächste Teammate'],
    fieldNotes: ['Onboarding-Gate für Datenarbeit'],
    startDialog: [
      {
        title: 'Abschluss',
        markdown: 'Keine neuen Befehle. **Eine stimmige Geschichte.**',
      },
      {
        title: 'Was „fertig“ heißt, schriftlich',
        markdown:
          'Pack die Checkliste ins PR-Template:\n\n- [ ] `dvc status` sauber\n- [ ] `dvc status --cloud` zeigt Cache und Remote synchron\n- [ ] nur `.dvc`- / `.gitignore`- / `dvc.lock`-Änderungen im Diff\n\nEin Review, das nicht alle drei abhaken kann, sollte nicht gemergt werden.',
      },
    ],
  },
  'api-1': {
    seriesTitle: 'Collab & CI',
    name: 'Daten lesen ohne checkout (dvc.api)',
    objective:
      'Lies getrackte Daten aus Python mit `dvc.api`, während die Datei im Workspace fehlt, prüfe dann, dass der Workspace weiter zu den Pointern passt, und stelle ihn wieder her.',
    learning: [
      'dvc.api ist ein Python-Modul (read, open, get_url, params_show) — es gibt kein `dvc api`-Kommando',
      'API-Lesezugriffe streamen aus Cache/Remote; sie ersetzen checkout nicht, wenn Dateien auf der Platte nötig sind',
      'status bleibt der Ehrlichkeitscheck nach jedem Leser',
    ],
    fieldNotes: ['Dashboards nutzen dvc.api + gepinnten Commit, keine Ad-hoc-Downloads'],
    startDialog: [
      {
        title: 'Bytes im Code ausleihen',
        markdown:
          '`dvc.api` ist für **Apps**, die Daten lesen; `dvc checkout` für **Workspaces**, die Dateien brauchen. Derselbe md5-Vertrag in beiden Fällen.\n\nIn diesem Level fehlt die Datei im Workspace — die API liest sie trotzdem aus Cache oder Remote:\n\n```\npython -c "import dvc.api; print(dvc.api.read(\'data/data.xml\'))"\n```',
      },
      {
        title: 'Die Revision pinnen',
        markdown:
          'Ohne `rev=` liest du, was der aktuelle Checkout sagt. Dienste sollten pinnen: `dvc.api.read(path, rev="v1.2.0")` (Tag, Branch oder Commit) und bei Bedarf `repo=` und `remote=`. Ein falscher oder ungetrackter Pfad löst `PathMissingError` aus; lieber hart scheitern als auf veralteten Bytes weiterarbeiten.',
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
      {
        title: 'CI das Paket erzeugen lassen',
        markdown:
          'Lass CI `dvc params diff --md`, `dvc metrics diff --md` und `dvc plots diff` gegen die PR-Basis (`origin/main`) ausführen und das Ergebnis mit `cml comment create` posten. Reviewer sehen Absicht, Wirkung und Kurven, ohne den Branch auszuchecken. Ein leerer Abschnitt ist ebenfalls eine Aussage: Schreib ihn in den PR, statt ihn wegzulassen.',
      },
    ],
  },
  'mastery-1': {
    seriesTitle: 'Collab & CI',
    name: 'Disaster Recovery: Restore aus der Remote',
    objective: 'Verlorene Maschine simulieren: Workspace leeren, aus Remote fetch+pull, Status prüfen.',
    learning: ['DR = Remote + committete Pointer', 'fetch füllt Cache; pull stellt den Tree her'],
    fieldNotes: ['Quartals-DR-Drill: neue Maschine, clone, pull, metrics'],
    startDialog: [
      {
        title: 'Wenn der Laptop stirbt',
        markdown: 'Git hat die Pointer-History. Die DVC-Remote die Bytes.',
      },
      {
        title: 'Den Wiederherstellungsweg üben',
        markdown:
          'Für die Wiederherstellung braucht es zweierlei: die Git-Historie (Pointer, `dvc.yaml`, `dvc.lock`) und ein intaktes Remote. Nach dem Verlust des Laptops baut `git clone` plus `dvc pull` das Projekt wieder auf und überspringt vorhandene Objekte. Prüfe das Remote *vor* dem Ernstfall: `dvc status --cloud` listet Objekte auf, die lokal existieren, aber nie im Storage ankamen — genau die, die eine defekte Platte mitnehmen würde.',
      },
    ],
  },
  'mastery-2': {
    seriesTitle: 'Collab & CI',
    name: 'Git-LFS vs DVC Entscheidung',
    objective: 'Richtiges Werkzeug wählen: LFS vs DVC lesen, dann DVC-Tracking für ML-Daten.',
    learning: ['LFS = Blobs in Git-Remotes; DVC = Pointer + Objektspeicher + Pipelines', 'ML will fast immer DVC'],
    fieldNotes: ['Entscheidungstabelle im Wiki statt Slack-Folklore'],
    startDialog: [
      {
        title: 'Langweilig richtig wählen',
        markdown: 'Repro/exp/cache/pipeline → DVC.',
      },
      {
        title: 'Was sich beim Abschied von LFS ändert',
        markdown:
          'Git LFS legt Dateiinhalte beim Git-Host ab und versioniert Dateien einzeln. DVC speichert Inhalte in einem Storage deiner Wahl (S3, GCS, Azure, SSH, …) und ergänzt Pipelines (`dvc.yaml`), Experimente und Metriken. Die Migration heißt `git lfs untrack`, dann `dvc add` pro Artefakt und `dvc push`; Kollegen brauchen danach Zugriff auf das DVC-Remote, nicht nur auf den Git-Host.',
      },
    ],
  },
  'mastery-3': {
    seriesTitle: 'Collab & CI',
    name: 'CI Secrets + pull + comment',
    objective:
      'Führe den CI-Körper für Produktion aus, wenn das Secret-gestützte Remote schon konfiguriert ist: pull, repro, Metrikbericht, CML-Kommentar, Receipt committen.',
    learning: ['Credentials in CI-Secrets, nie in .dvc/config', 'CI-Körper ist pull → repro → comment'],
    fieldNotes: ['OIDC/Rollen-Auth schlägt langlebige Keys'],
    startDialog: [
      {
        title: 'CI für die Security-Abteilung',
        markdown: 'Secrets im Vault. Remote-Config in Git. Bytes in der DVC-Remote.',
      },
      {
        title: 'Wie die Secrets zu DVC kommen',
        markdown:
          'Die Remote-URL steht in `.dvc/config`; die Zugangsdaten kommen als Umgebungsvariablen aus dem CI-Secret-Store (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`) oder besser über eine vom Job angenommene OIDC-Rolle. `dvc pull` und `dvc push` lesen sie aus der Umgebung, `cml` bekommt sein eigenes `REPO_TOKEN`. Ins Repo wird nichts geschrieben.',
      },
    ],
  },
  'mastery-4': {
    seriesTitle: 'Collab & CI',
    name: 'Artifact-Promote: Modell zum Release',
    objective:
      'Befördere ein Gewinner-Experiment in eine Release-Geschichte: anwenden (Params und Ausgaben kehren zurück), Bytes pushen, Params und Lock in Git committen.',
    learning: [
      'Release = angewendete Params + wiederhergestellte Artefakte + gepushte Bytes + Git-Commit',
      'exp apply ist kein Deploy; Push ist ohne Historie kein Release',
      'Der Release-Commit ist das, wonach das Incident-Team fragt',
    ],
    fieldNotes: [
      'Release-Checkliste: apply → push → commit → tag',
      'Gewichte nie per Mail schicken; der Release-Commit ist der Vertrag',
    ],
    startDialog: [
      {
        title: 'Vom Gewinner zum Release',
        markdown:
          'Suchen (`exp`) → wählen (`show`) → anwenden → **teilen** (`push`) → **merken** (`git commit`). `apply` hat die Ausgaben des Gewinners schon wiederhergestellt, es gibt nichts neu zu bauen.',
      },
      {
        title: 'Was in den Release-Commit gehört',
        markdown:
          '`git add params.yaml dvc.lock` — die Gewinnerwerte plus der Receipt des Laufs, der sie erzeugt hat. Die Modelldatei selbst bleibt aus Git heraus (DVC ignoriert sie); `dvc push` hat ihre Bytes ins Remote gebracht. Tagge den Commit (`git tag v1.4.0`), damit `dvc.api`- und `dvc pull`-Nutzer ihn pinnen können.',
      },
    ],
  },
  'mastery-5': {
    seriesTitle: 'Review & Vergleich',
    name: 'Confusion-Plots-Review',
    objective: 'Confusion-Template rendern und plots diff — Klassifikations-Review ohne Notebook.',
    learning: ['Templates kodieren die Lesart', 'plots diff ist der Zwilling von metrics diff'],
    fieldNotes: ['Klassifikation-Releases hängen immer eine Confusion-Matrix an'],
    startDialog: [
      {
        title: 'Matrix lesen, nicht den Mittelwert',
        markdown: '`dvc plots show --template confusion`.',
      },
      {
        title: 'Das Confusion-Template befüllen',
        markdown:
          'Das Template `confusion` erwartet eine Tabelle mit einer Zeile pro Vorhersage: einer Spalte `actual` und einer Spalte `predicted` (CSV, TSV oder JSON). Deklariere es in `dvc.yaml` unter `plots:` mit `template: confusion`, `x: actual`, `y: predicted`. `dvc plots diff` kann die Matrix dann für zwei Revisionen übereinanderlegen.',
      },
    ],
  },
  'mastery-6': {
    seriesTitle: 'Meta & Vertragsdateien',
    name: 'No-cache-Ausgaben und externe Daten',
    objective:
      'Deklariere eine Stage, deren Ausgabe den DVC-Cache überspringt (`-O`), reproduziere sie und verstehe den Unterschied zu externen Ausgaben.',
    learning: [
      '-O / --outs-no-cache (cache: false in dvc.yaml): DVC trackt den Hash der Datei, kopiert sie aber nicht in den Cache',
      'Eine No-cache-Ausgabe wird nicht gitignored, Git kann sie also halten, wenn sie klein ist',
      'Externe Ausgaben (ein s3://-Pfad) sind ein anderes, wenig empfohlenes Feature; besser Cloud-Versionierung oder import-url',
    ],
    fieldNotes: [
      'Kleine Berichtsdateien, Metrics und Plot-Daten: cache: false, damit Reviewer sie im PR sehen',
      'Riesige Tabellen im Warehouse: aus dem Code referenzieren, nicht zu Stage-Ausgaben machen',
    ],
    startDialog: [
      {
        title: 'Gecacht oder nicht?',
        markdown:
          'Eine normale `-o`-Ausgabe geht in den Cache und wird gitignored. `-O` / `--outs-no-cache` setzt `cache: false`: Die Datei bleibt im Workspace und **Git kann sie versionieren**, während `dvc.lock` ihren Hash weiter festhält.\n\nEs heißt **nicht** „liegt außerhalb des Repos“.',
      },
      {
        title: 'Externe Ausgaben sind etwas anderes',
        markdown:
          'Eine *externe* Ausgabe ist ein Pfad außerhalb des Workspace wie `s3://bucket/file` und braucht `--external` plus einen konfigurierten Remote-Cache. Das ist ein Altlast-Feature mit vielen Tücken: Liegen die Daten schon in einem Bucket, versioniere sie mit `dvc import-url` oder der Versionierung des Buckets und lass Stage-Ausgaben lokal.',
      },
    ],
  },
  'mastery-7': {
    seriesTitle: 'Remotes',
    name: 'Remote-Auth ohne Secret-Leaks',
    objective: 'Team-Remote konfigurieren: Nicht-Secrets in Config, Secrets aus env/CI — nie Credentials committen.',
    learning: ['URL und Non-Secrets in .dvc/config', 'Secrets aus env/CI/Rollen', 'remote modify kodiert Auth-Policy'],
    fieldNotes: ['.dvc/config im PR reviewen — keine langlebigen Keys', 'OIDC/Rollen statt access_key_id in CI'],
    startDialog: [
      {
        title: 'Credentials sind keine Projektdateien',
        markdown: 'URL/Profil teilen. `secret_access_key` niemals.',
      },
      {
        title: 'Wo Zugangsdaten liegen dürfen',
        markdown:
          'DVC liest Cloud-Zugangsdaten auch aus den üblichen Quellen: Umgebungsvariablen (`AWS_ACCESS_KEY_ID`, `GOOGLE_APPLICATION_CREDENTIALS`), gemeinsame Profildateien (`~/.aws/credentials`) sowie Instanz- oder OIDC-Rollen — keine davon berührt das Repo. `dvc remote modify --local` bleibt für Überschreibungen pro Rechner. Ist ein Secret je in der Git-Historie gelandet, rotiere es; den Commit zu löschen reicht nicht.',
      },
    ],
  },
  'mastery-8': {
    seriesTitle: 'Collab & CI',
    name: 'Transfer: Datenänderung ohne Rezept',
    objective: 'Keine Schrittliste. Daten dirty machen, Pointer committen, Objekte pushen.',
    learning: ['Transfer-Test: Pfad selbst entwerfen', 'Done = sauberer Status + Pointer in Git + Bytes auf Remote'],
    fieldNotes: ['Onboarding-/Hiring-Gate für Data Engineers'],
    startDialog: [
      {
        title: 'Offenes Labor',
        markdown: 'Dieses Level **kein Rezept**. Ziel ist ein Zustand.',
      },
      {
        title: 'Einen Zielzustand verifizieren',
        markdown:
          'Vertraue nicht dem grünen Text des letzten Befehls; frage den Zustand ab. `dvc status` für den Workspace, `dvc status --cloud` für Cache gegen Remote, `git status` und `git log` für das, was Git weiß. Drei saubere Antworten = fertig.',
      },
    ],
  },
  'xfer-1': {
    seriesTitle: 'Transfer',
    name: 'Pointer-Forensik: Verständnis beweisen',
    objective: 'Keine neuen Befehle. Pointer lesen, Git vs DVC erklären, Integrität mit status/diff beweisen.',
    learning: ['Pointer ist der Vertrag: path + md5', 'Wer .dvc nicht erklären kann, besitzt die Skill nicht'],
    fieldNotes: ['Incident-Fragen starten hier'],
    startDialog: [
      {
        title: 'Erkläre es oder du besitzt es nicht',
        markdown: 'Dieses Level verlangt **Evidenz**, keine neuen Flags.',
      },
      {
        title: 'Was eine .dvc-Datei enthält',
        markdown:
          'Unter `outs` stehen `md5`, `size` und `path`; ein Verzeichnis ergänzt `nfiles` und einen md5 mit Endung `.dir`, der ein Manifest-Objekt im Cache bezeichnet. Die Datei beschreibt Inhalt, sie enthält ihn nie. Widersprechen sich `git show HEAD:data/data.xml.dvc` und `dvc status` beim md5, ist der Workspace die Seite, die aus der Reihe fällt.',
      },
    ],
  },
  'xfer-2': {
    seriesTitle: 'Transfer',
    name: 'Unter Druck liefern — keine fehlenden Glieder',
    objective: 'Handoff: dirty → Evidenz → Pointer → Remote → History.',
    learning: ['Ohne Push/Pointer-Commit bricht der nächste Teammate', 'status vor commit ist nicht verhandelbar'],
    fieldNotes: ['Definition of done für Datenarbeit'],
    startDialog: [
      {
        title: 'Kein Sicherheitsnetz',
        markdown: 'Du bist on-call. Liefer den Handoff.',
      },
      {
        title: 'Warum diese Reihenfolge',
        markdown:
          '`dvc add` (Cache + Pointer) → `dvc push` (Bytes erreichen das Remote) → `git commit` / `git push` (der Pointer wird sichtbar). Geht Git zuerst, holt ein Kollege einen Pointer auf Daten, die das Remote noch nicht hat. `dvc status --cloud` vor der Ankündigung fängt das ab.',
      },
    ],
  },
  'xfer-3': {
    seriesTitle: 'Transfer',
    name: 'Pipeline-Design ohne Rezept',
    objective: 'Train-Stage selbst entwerfen: deps, params, outs, metrics. Dann repro + DAG.',
    learning: ['deps = Invalidierung, params = Stellschrauben, metrics = Evidenz', 'Fehlende deps sind stille Produktionsfehler'],
    fieldNotes: ['Interview-Drill: Stage skizzieren, dann tippen'],
    startDialog: [
      {
        title: 'Du entwirfst es',
        markdown: 'Erst denken, dann tippen. Dann repro + dag.',
      },
      {
        title: 'Vertrags-Checkliste',
        markdown:
          'Bevor du tippst: Welche Dateien müssen die Stage invalidieren (`-d`: Daten **und** Code)? Welche Hyperparameter (`-p`)? Was ist das Artefakt (`-o`), und welche Datei ist eine Metrikdatei, die `dvc metrics` lesen kann (`-m`)? Fehlt eines davon, läuft die Stage nie neu oder immer neu.',
      },
    ],
  },
  'xfer-4': {
    seriesTitle: 'Transfer',
    name: 'Experiment-Lifecycle + Fehlerrecovery',
    objective:
      'Führe eine schlechte und eine gute Konfiguration aus, wähle mit Belegen, wende den Gewinner an und prüfe, dass Params, Ausgaben und Status übereinstimmen.',
    learning: [
      'Ein schlechter Lauf sind Daten — behalten, lernen, dann den Gewinner anwenden',
      'Benannte Läufe (-n) machen apply und diff eindeutig',
      'apply ist fertig, wenn params show und status übereinstimmen; dann committen',
    ],
    fieldNotes: [
      'Nie einen fehlgeschlagenen Lauf löschen, bevor du exp show gelesen hast',
      'Checkliste nach apply: Params → Status → params.yaml + dvc.lock committen',
    ],
    startDialog: [
      {
        title: 'Der erste Versuch ist absichtlich falsch',
        markdown:
          'Starte mit einem **schlechten** Hyperparameter und benenne den Lauf (`-n bad`).\n\nDann ein besserer (`-n good`). Wähle mit `exp show`, wende den Gewinner per Namen an.',
      },
      {
        title: 'Wiederherstellung ohne Panik',
        markdown:
          'Hast du den falschen Lauf angewendet, ist nichts verloren: beide Experimente sind gespeichert. `dvc exp apply bad` / `dvc exp apply good` wechseln den Workspace in Sekunden. Der Commit ist der Punkt ohne Rückkehr: anwenden, `dvc params show` und `dvc status` prüfen, erst dann committen.',
      },
    ],
  },
  'xfer-5': {
    seriesTitle: 'Transfer',
    name: 'PR-Review-Maßstab: Evidenz oder ablehnen',
    objective: 'ML-PR-Evidenzpaket liefern. Ohne Metric-Bewegung nicht mergen.',
    learning: ['Review-Bar: params + metrics + plots diff', 'Keine Metric-Bewegung = nicht mergen'],
    fieldNotes: ['Das ist die Review-Vorlage fürs Team'],
    startDialog: [
      {
        title: 'Du bist der Reviewer',
        markdown: 'Drei Diffs. Fehlt die Wirkung, besteht das Level nicht.',
      },
      {
        title: 'Wenn sich die Metriken nicht bewegt haben',
        markdown:
          'Zeigt `dvc metrics diff` keine Änderung, frag, wozu der PR existiert: falsche Basis (`dvc metrics diff main` vergleicht mit einem anderen Branch), eine Stage, die nicht neu lief (`dvc status`), oder eine Metrikdatei, die nicht unter `metrics:` deklariert ist. Ein PR mit Codeänderungen und leeren Belegen ist eine Bitte um Belege, keine um Zustimmung.',
      },
    ],
  },
  'xfer-6': {
    seriesTitle: 'Transfer',
    name: 'Incident: kaputte Kette reparieren',
    objective: 'Datei weg. Kette pointer → cache/remote → Workspace wiederherstellen.',
    learning: ['Verlorene Datei ≠ verlorene Daten', 'fetch vs pull ist die Reparatur-Reihenfolge'],
    fieldNotes: ['Das ist das 2-Uhr-Runbook'],
    startDialog: [
      {
        title: 'Die Datei ist weg',
        markdown: '`data/data.xml` fehlt. **Repariere ohne Panik.**',
      },
      {
        title: 'Reihenfolge der Diagnose',
        markdown:
          'Geh die Kette vom billigsten Check aus durch: (1) `git log -- data/data.xml.dvc` — ist der Pointer committet? (2) `dvc status` — passt der Workspace dazu? (3) `dvc fetch` — existieren die Objekte in Cache oder Remote? (4) `dvc checkout`. Das erste fehlschlagende Glied zeigt, wo die Kette bricht; spring nicht direkt zu `dvc pull` und hoffe.',
      },
    ],
  },
  'xfer-7': {
    seriesTitle: 'Transfer',
    name: 'Lock-Integrität: Die Quittung lügt nie',
    objective: 'Stale Lock erzeugen, nur per repro fixen, dann yaml vs lock beweisen.',
    learning: ['Lock nie von Hand editieren', 'Stale Lock = falsche Quittung für jeden Clone'],
    fieldNotes: ['CI sollte failen, wenn lock nach repro dirty ist'],
    startDialog: [
      {
        title: 'Die Quittung muss stimmen',
        markdown: 'Params ändern. Mit `repro` fixen, nicht mit dem Editor.',
      },
      {
        title: 'dvc.lock im Review ehrlich halten',
        markdown:
          'Behandle `dvc.lock` als generierte Ausgabe: Ein PR, der es von Hand ändert, ist verdächtig. Zwei billige CI-Wächter: `dvc status` muss nach dem Checkout „Data and pipelines are up to date.“ ausgeben, und `dvc repro` auf dem PR darf die Datei nicht verändern (`git diff --exit-code dvc.lock`). `dvc repro --dry` zeigt, was laufen würde, ohne es auszuführen.',
      },
    ],
  },
  'prod-1': {
    seriesTitle: 'Produktionsgewohnheiten',
    name: 'Git-Hooks: Git lässt DVC für dich laufen',
    objective:
      'Installiere die DVC-Git-Hooks, geh dann mit `git checkout HEAD~1` einen Commit zurück und prüfe, dass die Daten dem Code gefolgt sind, ohne dass du selbst `dvc checkout` ausführst.',
    learning: [
      'dvc install legt drei Hooks in .git/hooks an: pre-commit führt dvc status aus, post-checkout dvc checkout, pre-push dvc push',
      'Mit dem post-checkout-Hook bewegt git checkout <ref> Code und Daten gemeinsam; ohne ihn behält der Workspace die neueren Daten',
      'Hooks gehören zu einem Clone und werden nicht versioniert: Jede Person führt dvc install aus, oder das Team teilt .pre-commit-config.yaml über --use-pre-commit-tool',
    ],
    fieldNotes: [
      'Schreib „dvc install ausführen“ in den Setup-Abschnitt der README, gleich neben die pip-install-Zeile',
      'Ein fehlschlagender pre-push-Hook ist ein Feature: Er verhindert, dass Code auf dem Remote landet, bevor seine Daten gepusht sind',
      'CI braucht die Hooks nicht; sie führt dvc pull und dvc repro ausdrücklich aus',
    ],
    startDialog: [
      {
        title: 'Der Code zieht um, die Daten bleiben zurück',
        markdown:
          'Du checkst den Commit der letzten Woche aus, um einen Bugreport nachzustellen. Git setzt Code und `.dvc`-Pointer zurück, aber `data/data.xml` auf der Platte bleibt die neueste Version, bis jemand `dvc checkout` ausführt.\n\nVergisst du diesen Schritt, debuggst du die heutigen Daten mit dem Code von letzter Woche. Die Zahlen sehen trotzdem plausibel aus – genau das macht es gefährlich.',
      },
      {
        title: 'Drei Hooks, einmal pro Clone installiert',
        markdown:
          '`dvc install` schreibt drei Git-Hooks nach `.git/hooks`: **pre-commit** führt `dvc status` aus, **post-checkout** `dvc checkout` und **pre-push** `dvc push`.\n\nDanach bewegt `git checkout HEAD~1` Code und Daten gemeinsam, und `git push` bricht ab, wenn die Daten das Remote nicht erreichen. Der Fehler zeigt sich auf deinem Laptop, nicht im `dvc pull` einer Kollegin am nächsten Morgen.\n\nHooks liegen in `.git`, das Git nicht versioniert; deshalb führt jede Person `dvc install` einmal pro Clone aus. Teams, die bereits das pre-commit-Tool nutzen, verwenden `dvc install --use-pre-commit-tool` und committen stattdessen `.pre-commit-config.yaml`.',
      },
    ],
  },
  'prod-2': {
    seriesTitle: 'Produktionsgewohnheiten',
    name: 'Experimente speichern und aufräumen',
    objective:
      'Halte zwei von Hand ausprobierte Lernraten mit `dvc exp save` als benannte Experimente fest und lösche das gescheiterte anschließend mit `dvc exp remove`, sodass nur das nützliche Experiment in der Liste bleibt.',
    learning: [
      'dvc exp save -n <name> speichert die aktuellen Params und Metriken des Workspace als Experiment, ohne eine Stage auszuführen',
      'Ohne -n erzeugt DVC einen Namen aus Adjektiv und Nomen; einen vorhandenen Namen überschreibt nur -f',
      'dvc exp remove <name> löscht ein Experiment; -A entfernt alle, --queue die eingereihten, -g <git-remote> löscht es auf einem Git-Remote',
    ],
    fieldNotes: [
      'Benenne ein Experiment nach der Änderung (lr-005), nicht nach dir selbst: Auf diesen Namen bezieht sich die Diskussion im Pull Request',
      'Räum auf, bevor du teilst: dvc exp push schickt jedes Experiment, also entferne zuerst die Sackgassen',
      'dvc exp gc gibt es in DVC 3 nicht mehr; dvc exp remove ersetzt es',
    ],
    startDialog: [
      {
        title: 'Ergebnisse, die nur in deinem Workspace existieren',
        markdown:
          'Du hast zwei Lernraten von Hand ausprobiert. Jedes Ergebnis steht in `params.yaml` und `metrics.json` im Workspace, und die nächste Änderung überschreibt es. `git stash` hilft nicht, denn genau diese Dateien sind das Experiment.\n\nDie ganze Pipeline noch einmal zu starten, nur um festzuhalten, was du schon hast, würde Rechenzeit verschwenden, die du bereits bezahlt hast.',
      },
      {
        title: 'exp save hält fest, exp remove räumt auf',
        markdown:
          '`dvc exp save -n lr-005` speichert die Params und Metriken, die gerade im Workspace liegen, als Experiment. Es führt keine Stage aus: Veraltete Stages bleiben veraltet, und es wird nichts neu berechnet. Ohne `-n` denkt sich DVC einen Namen aus Adjektiv und Nomen aus, etwa `brisk-otter`; einen vorhandenen Namen erneut zu speichern schlägt fehl, außer du gibst `-f` an.\n\nDie Liste wächst schnell. `dvc exp remove lr-09` löscht ein Experiment, `dvc exp remove -A` alle, und `dvc exp remove -g origin lr-09` löscht es nach einem `dvc exp push` auf einem Git-Remote. Im Team werden Experimente geteilt, also gehört eine aufgeräumte Liste zum Review: Alle anderen müssen sonst an deinen Sackgassen vorbeiscrollen. (`dvc exp gc` wurde in DVC 3 entfernt.)',
      },
    ],
  },
  'prod-3': {
    seriesTitle: 'Produktionsgewohnheiten',
    name: 'Eine Vorlage, vier Stages: vars und matrix',
    objective:
      'Lies die `vars`- und `matrix`-Vorlage in `dvc.yaml` und reproduziere dann alle vier erzeugten Stages mit einem einzigen `dvc repro train`.',
    learning: [
      'vars definiert einen Wert einmal; ${name} verwendet ihn in deps, outs und cmd wieder',
      'matrix erweitert eine Stage-Vorlage zu einer Stage pro Kombination, benannt train@cnn-a, train@cnn-b usw.; ${item.model} ist der jeweilige Wert',
      'dvc repro train führt alle erzeugten Stages aus, dvc repro train@cnn-a nur eine; dvc dag und dvc status zeigen die erzeugten Namen',
    ],
    fieldNotes: [
      'Halte das Raster klein: Jede Kombination ist eine Stage, ein Output und ein dvc.lock-Eintrag',
      'Nimm eine Matrix für ein festes Raster und dvc exp run -S für offene Sweeps',
      'dvc stage add kann keine Matrix anlegen; du schreibst sie von Hand in dvc.yaml',
    ],
    startDialog: [
      {
        title: 'Kopierte Stages laufen auseinander',
        markdown:
          'Zwei Modelle und zwei Feature-Sets ergeben vier fast identische Stages. Von Hand kopiert, driften sie auseinander: Eine bekommt ein neues Flag, eine andere behält das alte, und niemand merkt es, bis sich ein Ergebnis nicht mehr reproduzieren lässt.\n\nEine Vorlage beseitigt die Kopien.',
      },
      {
        title: 'Eine Matrix-Stage lesen',
        markdown:
          'In `dvc.yaml` hält `vars` Werte, die du mehrfach brauchst, und `matrix` listet die Optionen auf. DVC baut für jede Kombination eine Stage: `train@cnn-a`, `train@cnn-b`, `train@xgb-a` und `train@xgb-b`. In der Vorlage werden `${item.model}` und `${item.feature}` zur jeweiligen Kombination, während `${data}` aus `vars` stammt.\n\n`cat dvc.yaml` zeigt die Vorlage, nicht die erzeugten Stages; `dvc dag` und `dvc status` zeigen die ausgeklappten Namen. `dvc repro train` führt die ganze Gruppe aus, `dvc repro train@cnn-a` nur eine – so wiederholst du eine einzelne fehlgeschlagene Zelle des Rasters, ohne die anderen drei anzufassen.',
      },
    ],
  },
  'prod-4': {
    seriesTitle: 'Produktionsgewohnheiten',
    name: 'Frischer Clone: repro --pull',
    objective:
      'Du hast das Projekt gerade geklont. dvc.lock ist aktuell, aber weder Modell noch aufbereitete Daten liegen auf der Platte. Hol die Outputs mit `dvc repro --pull` zurück, statt neu zu trainieren.',
    learning: [
      'Auf einem frischen Clone sagt dvc.lock, dass die Stages aktuell sind, doch die Outputs liegen weder im Workspace noch im lokalen Cache',
      'Ein einfaches dvc repro hält fehlende Outputs für einen Grund, die Stage erneut auszuführen',
      'dvc repro --pull lädt die fehlenden Outputs vom Remote; fehlen sie dort, läuft die Stage trotzdem, und --allow-missing überspringt solche Stages stattdessen',
    ],
    fieldNotes: [
      'In CI stellt dvc repro --pull unveränderte Stages vom Remote wieder her und trainiert nur, was sich wirklich geändert hat',
      'dvc repro --allow-missing ist die billige CI-Prüfung, dass nichts veraltet ist: Es lädt nie Daten herunter',
      'Pushe die Outputs jeder Stage, die du committest, sonst hat --pull nichts zu holen',
    ],
    startDialog: [
      {
        title: 'Der teure Start in den Tag',
        markdown:
          'Du klonst das Repository auf einen neuen Rechner und startest `dvc repro`. DVC sieht, dass die in `dvc.lock` aufgeführten Outputs nicht auf der Platte liegen, hält die Stages für veraltet und beginnt wieder zu trainieren: Stunden an Rechenzeit, um Dateien neu zu erzeugen, die längst auf dem Remote liegen.',
      },
      {
        title: 'Herunterladen statt neu berechnen',
        markdown:
          '`dvc status` direkt nach einem Clone zeigt `changed outs` mit `not in cache`: Die Stages sind gesperrt und aktuell, nur die Bytes fehlen. `dvc repro --pull` prüft jede Stage gegen `dvc.lock`; hat sich nichts geändert, lädt es die fehlenden Outputs vom Standard-Remote und macht weiter, ohne etwas auszuführen. Besitzt das Remote einen Output nicht, läuft die Stage wie gewohnt, deshalb ist das Flag als Standard unbedenklich.\n\nMit `--allow-missing` überspringt DVC Stages, deren einziger Unterschied fehlende Daten sind, und lädt nichts herunter – passend für einen CI-Job, der nur prüft, dass niemand vergessen hat, `dvc repro` auszuführen.',
      },
    ],
  },
  'prod-5': {
    seriesTitle: 'Produktionsgewohnheiten',
    name: 'Ein gemeinsamer Team-Cache',
    objective:
      'Richte das Projekt auf ein teamweites Cache-Verzeichnis aus, mach es gruppenbeschreibbar, verlinke statt zu kopieren und committe die geteilte `.dvc/config`, damit jeder Clone dasselbe Setup bekommt.',
    learning: [
      'dvc cache dir <pfad> setzt cache.dir in .dvc/config; mit --local landet es in .dvc/config.local und bleibt auf einem Rechner',
      'cache.shared group macht Cache-Dateien gruppenbeschreibbar, damit mehrere Nutzer einen Cache füllen können; cache.type symlink,hardlink verlinkt statt zu kopieren, und DVC weist unbekannte Werte ab',
      'dvc checkout --relink legt die Workspace-Dateien als Links in den neuen Cache neu an; die Einstellungen sind eine gewöhnliche Git-Änderung an .dvc/config',
    ],
    fieldNotes: [
      'Lege den gemeinsamen Cache auf dasselbe Dateisystem wie die Workspaces, sonst sind Hardlinks unmöglich',
      'Schreib nie Zugangsdaten in die geteilte .dvc/config; nutze --local für Werte, die je Rechner abweichen',
      'Bei Links ist eine getrackte Datei das Cache-Objekt selbst: Ersetze sie und führe dvc add erneut aus, statt sie direkt zu bearbeiten',
    ],
    startDialog: [
      {
        title: 'Fünf Kopien desselben Datensatzes',
        markdown:
          'Fünf Leute teilen sich einen GPU-Server, und jede führt `dvc pull` aus. Jede bekommt einen privaten 50-GB-Cache im eigenen Projekt, und bis Freitag ist die Platte voll. Alle fünf Caches enthalten dieselben Dateien, denn DVC benennt jedes Objekt nach seinem Inhalts-Hash.',
      },
      {
        title: 'Ein Cache, drei Einstellungen und ein Commit',
        markdown:
          'Ein gemeinsamer Cache ist Konfiguration, kein neues Werkzeug. `dvc cache dir /mnt/shared/dvc-cache` legt fest, wo der Cache liegt, `dvc config cache.shared group` macht seine Dateien gruppenbeschreibbar, sodass jedes Teammitglied etwas hinzufügen kann, und `dvc config cache.type symlink,hardlink` lässt Workspaces auf den Cache zeigen, statt aus ihm zu kopieren. DVC prüft die Werte und lehnt unbekannte ab, etwa `cache.shared everyone`.\n\nFühre nach einer Änderung des Link-Typs `dvc checkout --relink` aus und lies dann `cat .dvc/config` und `git status`: Die Einstellungen stehen in der committeten `.dvc/config`, ein `git commit` gibt also jedem Clone dasselbe Layout. Ein Pfad, der je Rechner abweicht, gehört stattdessen in `.dvc/config.local` (`--local`).',
      },
    ],
  },
  'prod-6': {
    seriesTitle: 'Produktionsgewohnheiten',
    name: 'Modell-Registry mit GTO-Tags',
    objective:
      'Registriere Version v1.0.0 des in dvc.yaml deklarierten `model`-Artefakts, weise sie mit GTO der Stage prod zu und lade genau diese Version dann mit `dvc artifacts get` herunter.',
    learning: [
      'Der Abschnitt artifacts: in dvc.yaml benennt die Modelle und Datensätze, die ein Team veröffentlicht (path und type)',
      'GTO ist eine eigenständige CLI: gto register erzeugt den Git-Tag model@v1.0.0, gto assign den Tag model#prod#1; ein Commit trägt eine Version, die nächste Version braucht also einen neuen Commit',
      'dvc artifacts get <url> <name> --rev <version> oder --stage <stage> lädt diese registrierte Version nach -o und schlägt fehl, solange nichts registriert ist',
    ],
    fieldNotes: [
      'Deploye nach Stage, nicht nach Dateipfad: Der Dienst fragt nach „model in prod“, und eine Beförderung wird zu einem Git-Tag',
      'Pushe die Tags mit git push --tags, sonst sieht sonst niemand die Registry',
      'dvc artifact und dvc register sind keine Befehle; die Registry-Verben gehören zu gto',
    ],
    startDialog: [
      {
        title: 'Welches Modell läuft in Produktion?',
        markdown:
          'Jemand fragt, welche Modelldatei gerade den Traffic bedient. Die Antwort steckt in einem Chat-Verlauf, in einem Dateinamen wie `final_v2_REAL.pkl` oder im Kopf einer einzelnen Person. Eine Registry ersetzt das Raten durch einen Eintrag, den das ganze Team abfragen kann.',
      },
      {
        title: 'Git-Tags als Registry',
        markdown:
          'Deklariere das Modell einmal in `dvc.yaml` unter `artifacts:` (path und type). Nutze dann die eigenständige GTO-CLI: `gto register model --version v1.0.0` erzeugt den Git-Tag `model@v1.0.0` auf dem aktuellen Commit, und `gto assign model --version v1.0.0 --stage prod` erzeugt `model#prod#1`. Weist du prod später erneut zu, entsteht `model#prod#2`, und die höchste Nummer gilt.\n\nKonsumenten fassen deinen Branch nie an: `dvc artifacts get <registry-url> model --stage prod -o deploy/model.pkl` löst den Tag auf, findet dessen Commit und lädt die Datei so herunter, wie sie dort war. GTO schreibt nur Git-Tags; pushe sie (`git push --tags`), damit andere die Registry sehen. Beförderung und Rollback sind je ein Tag.',
      },
    ],
  },
};
