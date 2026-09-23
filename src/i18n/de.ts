/** German catalog — full teaching copy. Commands and CLI stay English. */

import type { Catalog } from './types';
import { deLevels } from './de-levels';

export const de: Catalog = {
  locale: 'de',
  dir: 'ltr',
  teach: {
    'git-checkout-data': {
      title: 'git checkout (data pointers)',
      lines: [
        'Du wechselst, welche Datenversion das Projekt nutzen soll.',
        'Git aktualisiert den .dvc-Pointer; die Bytes selbst lädt es nicht.',
        'Danach dvc checkout, damit Workspace und Pointer übereinstimmen.',
        'Rollback-Drill für Produktion — üben, bevor du um 2 Uhr nachts dran denkst.',
      ],
    },
    'dvc-init': {
      title: 'dvc init',
      lines: [
        'DVC erweitert Git für Daten; es ersetzt Git nicht.',
        'Init legt nur lokale Metadaten unter .dvc/ an (config, Ignore-Regeln).',
        'Noch ist kein Datensatz versioniert — du hast nur den Workflow aktiviert.',
        'Diese kleinen Dateien musst du mit Git committen, damit das Team dasselbe DVC-Setup hat.',
      ],
    },
    'dvc-add': {
      title: 'dvc add',
      lines: [
        '1. Inhalt der Datendatei wird gehasht (md5) — Identität genau dieser Bytes.',
        '2. Bytes liegen einmal im lokalen Cache (.dvc/cache), content-adressiert.',
        '3. Eine kleine .dvc-Pointer-Datei hält path → md5 (lesbares YAML).',
        '4. Der rohe Datenpfad kommt in .gitignore — Git bläht nie mit GB-Dateien auf.',
        'Git versioniert den Pointer; DVC die Bytes. Klare Trennung.',
      ],
    },
    'dvc-status': {
      title: 'dvc status',
      lines: [
        'Vergleicht Workspace-Daten vs. Pointer vs. Cache vs. Remote.',
        '"modified" heißt: die Datei auf der Platte passt nicht mehr zur md5 im .dvc-File.',
        'Keine Daten verloren — nur eine uncommittete Datenänderung, wie bei Git status.',
      ],
    },
    'dvc-commit': {
      title: 'dvc commit',
      lines: [
        'Aktualisiert den .dvc-Pointer auf den aktuellen Datei-Hash und stellt sicher, dass das Objekt im Cache liegt.',
        'Das ist der Daten-Commit. Den Pointer committest du danach weiterhin mit git.',
        'Ohne dvc commit würde Git einen Pointer speichern, der nicht mehr zu den Daten passt.',
      ],
    },
    'dvc-remote-add': {
      title: 'dvc remote add',
      lines: [
        'Eine DVC-Remote ist Objektspeicher für Cache-Artefakte (S3, GCS, SSH, lokaler Pfad…).',
        'Das ist NICHT die Git-Remote. Git-Remote = Code + Pointer. DVC-Remote = schwere Daten.',
        '-d markiert die Default-Remote für push/pull/fetch.',
      ],
    },
    'dvc-push': {
      title: 'dvc push',
      lines: [
        'Lädt Cache-Objekte hoch, die die Remote noch nicht hat.',
        'Teammates mit demselben Git-Commit können dvc pull und bekommen exakt dieselben Bytes.',
        'CI holt Daten so, ohne Datensätze ins Git-Repo zu backen.',
      ],
    },
    'dvc-pull': {
      title: 'dvc pull',
      lines: [
        'fetch: nur Objekte Remote → lokaler Cache.',
        'pull: fetch + checkout, damit Workspace-Dateien zu den aktuellen Pointern passen.',
        'Deshalb bleiben Clones klein: Git clone bringt Pointer; DVC pull bringt Daten.',
      ],
    },
    'dvc-fetch': {
      title: 'dvc fetch',
      lines: [
        'fetch: nur Objekte Remote → lokaler Cache.',
        'pull: fetch + checkout, damit Workspace-Dateien zu den aktuellen Pointern passen.',
        'Deshalb bleiben Clones klein: Git clone bringt Pointer; DVC pull bringt Daten.',
      ],
    },
    'dvc-checkout': {
      title: 'dvc checkout',
      lines: [
        'Liest jeden .dvc-Pointer und stellt genau diesen Hash aus dem Cache im Workspace her.',
        'Nach git checkout eines älteren Commits bringt dvc checkout die Daten wieder in Sync.',
        'Datenversion wechseln heißt Pointer wechseln — billig, bei Cache kein Full Download.',
      ],
    },
    'dvc-stage-add': {
      title: 'dvc stage add',
      lines: [
        'Pipeline-Stages leben in dvc.yaml (deps, outs, cmd, params, metrics).',
        'Deps sagen, was den Stage invalidiert, wenn es sich ändert.',
        'Outs sagen, was DVC nach erfolgreichem Lauf tracken/cachen soll.',
        'Code bleibt in Git; Daten-I/O läuft über DVC — Reproduzierbarkeit als Vertrag.',
      ],
    },
    'dvc-repro': {
      title: 'dvc repro',
      lines: [
        'Build-System-Semantik für ML: nur Stages laufen, deren Inputs/Params sich änderten.',
        'Erfolgreiche Läufe schreiben dvc.lock — eine Ausführungsquittung der genutzten Hashes.',
        'Gleicher Lock + gleicher Cache ⇒ gleiche Outputs ohne Neu-Training.',
      ],
    },
    'dvc-exp-run': {
      title: 'dvc exp run',
      lines: [
        'Führt die Pipeline im Experimentkontext aus, ohne Branch-Spam.',
        'Params aus -S / params.yaml werden mit Metrics für den Vergleich festgehalten.',
        'Experiments sind First-Class: list, diff, Gewinner zurück in den Workspace.',
      ],
    },
    'dvc-exp-apply': {
      title: 'dvc exp apply',
      lines: [
        'Übernimmt Params/Metrics eines gewählten Experiments in den Workspace.',
        'So wird aus einem „winning run“ die neue Baseline — ohne Werte neu zu tippen.',
      ],
    },
    edit: {
      title: 'edit (simuliert)',
      lines: [
        'In echten Projekten ändern Tools oder Code Daten/Params, nicht dieser Helfer.',
        'Hier steht `edit` für „Datensatz/Hyperparameter haben sich geändert“.',
        'Die nächste Frage, die DVC dich stellt: ist die Änderung schon versioniert?',
      ],
    },
    'git-add-dvc': {
      title: 'git add (DVC files)',
      lines: [
        'Du staged Metadaten, die Git behalten soll: Pointer, Ignore-Regeln, Pipeline-YAML.',
        'Große Datendateien gehören hier nie hin — .gitignore hält sie draußen.',
        'Vor dem Commit mit `git status` prüfen: Pointer-Diffs, keine Daten-Blobs.',
      ],
    },
    'git-commit': {
      title: 'git commit',
      lines: [
        'Hält Pointer-/Pipeline-Zustand in der Git-History für Review + Repro fest.',
        'Ein Clone dieses Commits weiß, WELCHE Datenversion dazugehört — nicht die Daten selbst.',
        'Jedes Git-Release mit einer DVC-Remote koppeln, die diese Cache-Objekte noch hält.',
      ],
    },
    'dvc-live': {
      title: 'dvc live (DVCLive)',
      lines: [
        'DVCLive instrumentiert Python (Live / log_metric / log_plot / make_report).',
        'Skalare werden Metrics; Serien Plots; HTML-Report für Menschen.',
        'Offizielle Kurse sehen die Brücke von Notebook zu exp show/plots hier.',
      ],
    },
    'exp-queue': {
      title: 'exp queue',
      lines: [
        'Parametersätze queueen, dann gemeinsam ausführen (--run-all / queue start).',
        'Spart, für jeden Hyperparameter einen Laptop-Job zu babysitten.',
      ],
    },
    'dvc-update': {
      title: 'dvc update',
      lines: [
        'Aktualisiert einen importierten .dvc-Target auf die neueste Upstream-Registry-Version.',
        'Danach repro, wenn der Import eine Pipeline-Dep ist.',
      ],
    },
    cml: {
      title: 'CML',
      lines: [
        'CML kommentiert Metrics/Plots auf GitHub/GitLab-PRs aus der CI.',
        'CI-Skelett: checkout → dvc pull → dvc repro → cml comment.',
      ],
    },
    'dvc-freeze': {
      title: 'dvc freeze',
      lines: [
        'Freeze pinnt einen Pipeline-Stage, damit repro ihn nicht mehr ausführt.',
        'Schützt ein Produktionsartefakt, während du an Params/Daten experimentierst.',
        'Unfreeze ist ein bewusster Akt — mit Review + repro + push paaren.',
      ],
    },
    'dvc-unfreeze': {
      title: 'dvc unfreeze',
      lines: [
        'Freeze pinnt einen Pipeline-Stage, damit repro ihn nicht mehr ausführt.',
        'Schützt ein Produktionsartefakt, während du an Params/Daten experimentierst.',
        'Unfreeze ist ein bewusster Akt — mit Review + repro + push paaren.',
      ],
    },
    'dvc-diff': {
      title: 'dvc diff',
      lines: [
        'Zeigt Pointer-/Content-Drift für getrackte Daten (Hash-Ebene, keine Text-Hunks).',
        'Vor dem Akzeptieren einer Änderung: welche md5 hat sich bewegt, wie viel liegt auf der Remote?',
        'In Produktion mit git show der .dvc-Datei für die Erzählung paaren.',
      ],
    },
    'dvc-exp-show': {
      title: 'dvc exp show',
      lines: [
        'Tabellarischer Experimentvergleich: Params vs. Metrics nebeneinander.',
        'Baselines wählst du mit Evidenz, nicht aus dem Gedächtnis.',
      ],
    },
  },
  glossary: {
    split: {
      title: 'Git vs. DVC Trennung',
      body: 'Git versioniert Intent (Code + Pointer-Dateien). DVC versioniert Payload (Daten-/Modellobjekte). Nie GB-Datensätze in der Git-History; md5-Pointer + reviewbares YAML speichern.',
    },
    pointer: {
      title: 'Pointer-Datei (.dvc)',
      body: 'Kleines YAML mit path + md5 (+ size). Git committet den Pointer. Ändern sich die Bytes, aktualisiert dvc add/commit den Pointer; die Git-History hält alte Pointer für Rollback.',
    },
    cache: {
      title: 'Content-adressierter Cache',
      body: 'Objekte liegen unter .dvc/cache/files/md5/xx/… nach Content-Hash. Identische Bytes einmal gespeichert. Lokaler Cache ist Materialisierungsquelle für den Workspace-Checkout.',
    },
    remote: {
      title: 'Remote Storage',
      body: 'Geteilter Objektspeicher für Cache-Artefakte (S3, GCS, SSH, lokal). dvc push lädt fehlende Objekte hoch; dvc pull/fetch lädt sie herunter. Nicht dasselbe wie git remote.',
    },
    dirty: {
      title: 'Dirty Data',
      body: 'Workspace-Bytes ≠ Pointer-md5 (oder Datei fehlt). dvc status zeigt das. Fix: dvc commit (neue Version akzeptieren) oder dvc checkout (Drift verwerfen).',
    },
    checkout: {
      title: 'Version materialisieren',
      body: 'dvc checkout liest Pointer und stellt passende Cache-Objekte im Workspace her. Nach git checkout eines älteren Commits immer dvc checkout, damit Bytes zum Intent passen.',
    },
    pipeline: {
      title: 'Pipeline-DAG',
      body: 'dvc.yaml-Stages deklarieren deps, outs, cmd, params, metrics. dvc repro führt dirty Stages in topologischer Reihenfolge aus und schreibt dvc.lock als Ausführungsquittung.',
    },
    invalidation: {
      title: 'Invalidierungsregeln',
      body: 'Ein Stage ist dirty, wenn sich ein Dep-Hash, ein verlinkter Param-Wert oder die Kommandodefinition ändert. Eine Datenänderung invalidiert jeden Stage, der sie als -d listen.',
    },
    params: {
      title: 'params.yaml',
      body: 'Menschlich reviewbare Hyperparameter. Stage-Flags -p key verlinken Params an Stages, damit repro/exp runs wissen, was sie überwachen, und experiments mit -S überschreiben können.',
    },
    metrics: {
      title: 'Metriken & Vergleich',
      body: '-m markiert Metric-Dateien eines Stages. dvc exp show tabelliert Experimente. Entscheidungen brauchen Tabellen, nicht Notebook-Erinnerung.',
    },
    exp: {
      title: 'Experimente',
      body: 'dvc exp run führt die Pipeline mit festgehaltenen Params/Metrics aus, ohne Branch-Explosion. exp apply befördert die Gewinner-Konfig in den Workspace; dann Artefakte reproen.',
    },
    'run-cache': {
      title: 'Run Cache',
      body: 'DVC merkt sich (cmd + Dep-Hashes + Params) → Outputs. Hyperparam ändern, zurücksetzen, und repro restauriert aus dem Cache statt neu zu trainieren.',
    },
    metafiles: {
      title: 'dvc.yaml & dvc.lock',
      body: 'dvc.yaml ist der Stage-Vertrag (cmd/deps/params/outs). dvc.lock ist die Ausführungsquittung (md5s und Param-Werte). Beide gehen nach Git; Lock nie von Hand editieren.',
    },
    diffs: {
      title: 'Iterations-Diffs',
      body: 'dvc params diff / metrics diff / plots diff vergleichen Workspace vs. HEAD (oder Revisionen). So werden ML-Änderungen reviewed.',
    },
    'registry-cmds': {
      title: 'get / import',
      body: 'dvc get kopiert eine Datei aus einem anderen DVC-Projekt. dvc import versioniert zusätzlich die Abhängigkeit (schreibt .dvc). import-url trackt eine externe URL als Daten.',
    },
    dvclive: {
      title: 'DVCLive',
      body: 'Python-Bibliothek im Training-Code: Live(), log_metric, log_plot, log_image, make_report. Speist dvc.yaml metrics/plots, damit exp show und plots ohne Handverdrahtung laufen.',
    },
    'plots-templates': {
      title: 'Plots-Templates',
      body: 'Vega-Templates: simple, linear, confusion, scatter. Konfiguration in dvc.yaml unter plots:. dvc plots show --template confusion rendert Matrixansichten.',
    },
    queue: {
      title: 'Experiment Queue',
      body: 'dvc exp run --queue -S k=v parkt einen Lauf; dvc queue start / exp run --run-all führt sie aus. Standard-Sweep-Muster in Kursen.',
    },
    cml: {
      title: 'CML (CI for ML)',
      body: 'Continuous Machine Learning postet Metrics/Plots auf PRs. Flow: git clone + dvc pull + dvc repro + cml comment. Kein DVC-Ersatz.',
    },
    lfs: {
      title: 'Git-LFS vs. DVC',
      body: 'Git-LFS versioniert große Blobs in Git-Remotes. DVC versioniert Pointer-Dateien in Git und content-adressierte Objekte in DVC-Remotes, plus Pipelines/Exps. LFS für große Binaries mit wenig Versionen; DVC für ML-Daten/Modelle + Repro.',
    },
    foreach: {
      title: 'foreach / Matrix-Stages',
      body: 'dvc stage add --foreach expandiert einen Stage in viele (z. B. pro Modell). Kurs-Level-Alternative zu Copy-Paste-Stages.',
    },
    'external-outs': {
      title: 'Externe Daten / no-cache',
      body: 'Deps/Outs können außerhalb des Projekts liegen (s3://…). cache: false / -O, wenn DVC die Bytes nicht kopieren soll. Externe Datensätze mit import-url tracken/updaten.',
    },
    api: {
      title: 'dvc.api',
      body: 'Python-API, um getrackte Daten und exp_show() aus einem DVC-Repo ohne dvc checkout zu lesen — nützlich in Apps und Notebooks.',
    },
    'registry-promote': {
      title: 'Model Registry',
      body: 'Neuere DVC-Releases behandeln Artefakte/Modelle als First-Class (dvc artifacts, Stages wie dev/prod). Einen git Tag + gezogenes Modell promoten statt Gewichte zu mailen.',
    },
    dvcignore: {
      title: '.dvcignore',
      body: 'Pfadmuster, die DVC überspringen soll — Speed auf riesigen Bäumen. Nicht dasselbe wie .gitignore (Git) oder der Datenpfad-Ignore von dvc add.',
    },
    incident: {
      title: 'Incident-Frage',
      body: '„Welche Daten haben dieses Modell erzeugt?“ Antwort = Git-Commit des Releases → Pointer-md5s → Cache-/Remote-Objekt. Wurden Pointer nie committet, existiert die Antwort nicht.',
    },
    ci: {
      title: 'CI / Fresh-Clone-Muster',
      body: 'git clone (Code+Pointer) → dvc pull (Payload) → dvc repro (Rebuild) oder gecachte Outputs laden. Schwere Jobs brauchen Credentials für die DVC-Remote, keine Git-LFS-Hacks.',
    },
    freeze: {
      title: 'Stage freezen',
      body: 'dvc freeze <stage> pinnt einen Stage, damit repro ihn nicht mehr ausführt, auch wenn Inputs sich ändern — schützt ein Produktionsartefakt beim Downstream-Experiment.',
    },
    gc: {
      title: 'Garbage Collection',
      body: 'dvc gc entfernt Cache-Objekte, die von Workspace/Git-Refs, die du behältst, nicht referenziert sind. Nach gc ggf. dvc pull, wenn ein referenzierter Hash nur auf der Remote lag.',
    },
  },
  ui: {
    appWelcome:
      'LearnDVC — interaktive DVC-Sandbox. Tippe `help` oder `levels`, um das erste Tutorial zu starten.',
    sandboxSeeded:
      'Sandbox mit DVC-Projekt und data/data.xml vorbereitet. Versuch `dvc add data/data.xml`.',
    progressSaved:
      'Fortschritt wird in diesem Browser gespeichert (localStorage + Cookie). Komm jederzeit zurück.',
    lesson: 'Lektion',
    lessonTitle: 'Intro-Folien dieser Level wiederholen',
    help: 'Hilfe',
    levels: 'Levels',
    guide: 'Guide',
    hint: 'Tipp',
    solution: 'Lösung',
    undo: 'Rückgängig',
    reset: 'Zurücksetzen',
    sandboxBtn: 'Sandbox',
    titleLine: (id, name, par) => `${id} · ${name} · erwartet ${par} Befehle`,
    sandboxTitle: 'Sandbox-Modus',
    learningGuide: 'Lern-Guide',
    guideAlwaysOn:
      'Immer sichtbares Panel. In einem Level zeigt es Konzepte, Field Notes und die Lösungs-Checkliste.',
    startHere: 'Hier starten',
    startHereItems: [
      'Öffne **Levels** und starte mit Basics → Initialize DVC',
      'Tippe `help ui` für eine Karte dieser Seite',
      'Tippe `curriculum` für die Lernziele',
      'Tippe `concepts` für DVC-Mental Models',
    ],
    uiTourMeta:
      'UI-Tour: Board/Toolbar/Termin kurz umrissen. Nochmal Help für die Doku.',
    youAreLearning: 'Du lernst',
    fieldNotesTitle: 'In Produktion (Field Notes)',
    typeNext: 'Als Nächstes tippen',
    checklist: 'Checkliste',
    objectiveLabel: 'Ziel',
    sandboxTip: 'Sandbox-Tipp',
    sandboxTipItems: [
      'Board: Workspace → Cache → Remote',
      'Terminal: Tab vervollständigt wortweise; ↑/↓ ist History',
      'Fortschritt speichert sich in diesem Browser (Cookie + localStorage)',
    ],
    noActiveLevel: 'Kein aktives Level',
    noActiveLevelDetail: 'levels → wähle eine Challenge, um die Checkliste zu sehen',
    guideFlashNote:
      'Toolbar-**Guide** lässt dieses Panel kurz aufleuchten. Es bleibt auf voller Seitenhöhe offen.',
    allSolutionMet: 'Alle Lösungsschritte erfüllt.',
    typeNextTitle: 'Als Nächstes tippen — orange markiert',
    remainingLabel: '○ offen',
    wrongCommandNote:
      'Falscher Befehl? Du bleibst hier — Fortschritt bleibt. History: ↑ / ↓',
    inProduction: 'In Produktion',
    solvedBanner: (n) => `Level gelöst${n !== null ? ` mit ${n} Befehl(en)` : ''}.`,
    stateNotes: 'Status-Hinweise:',
    pickChallenge: 'Wähle eine Challenge. Gelöste Levels bleiben in diesem Browser.',
    howToRead: 'So liest du eine Level-Zeile',
    difficultyLegend:
      '**Schwierigkeit** — 1–5 gleiche Punkte; mehr gefüllt = schwerer (mehrere DVC-Ideen auf einmal). Immer 5 Slots.',
    idealLegend:
      '**Ideale Befehlszahl** — Länge der sauberen Lösung (Golf-Ziel, kein harte Grenze).',
    solvedLegend:
      '**Gelöst** — du hast es geschafft; die Zahl ist deine beste Befehlszahl.',
    optionalChip: 'optional',
    nowChip: 'jetzt',
    undoMeta: 'Rückgängig.',
    correct: '✓ Richtig.',
    levelSolvedBanner: '*** LEVEL GELÖST ***',
    partyMode: '*** PARTY MODE *** Konfetti kommt — Share-Buttons unten.',
    github: 'GitHub',
    githubTitle: 'GitHub — Quelle & Issues',
    support: 'Buy me a coffee',
    supportTitle: 'Unterstütze den Publisher',
    guidePanel: 'Lern-Guide-Panel',
    uiGuideTitle: 'UI-Guide — was jede Region macht',
    close: 'Schließen',
    highlightRegions: 'Regionen hervorheben',
    bestSoFar: (commands, par) =>
      `Bisher beste: ${commands} Befehl${commands === 1 ? '' : 'e'} · ideal: ${par}`,
    idealSolution: (par) =>
      `Ideale Lösung: ${par} Befehl${par === 1 ? '' : 'e'} (darunter oder gleich ist exzellent)`,
    guideAlwaysRight:
      'Guide-Panel ist rechts immer sichtbar (volle Höhe). Der Guide-Button fokussiert es.',
    difficultyOf: (n) => `Schwierigkeit ${n} von 5`,
    solvedLabel: 'gelöst',
    levelsTitle: 'Levels',
    aboutTitle: 'Über LearnDVC',
    aboutPublished: 'Veröffentlicht von **Ali Sadeghi Aghili**.',
    aboutBoard:
      'Das Board zeigt **Workspace → Cache → Remote** — den Materialfluss, den DVC verwaltet.',
    aboutOpenLevels:
      'Öffne **Levels** für das Curriculum, oder tippe `curriculum` / `concepts` / `lesson`.',
    aboutSupport: 'Unterstütze den Publisher:',
    back: 'Zurück',
    next: 'Weiter',
    startLevel: 'Level starten',
    solutionTitle: (id) => `Lösung — ${id}`,
    solutionCommands: 'Befehle, die dieses Level lösen:',
    solutionWarn: 'Es wird zuerst zurückgesetzt, dann die Lösung ausgeführt.',
    cancel: 'Abbrechen',
    runSolution: 'Lösung ausführen',
    noHintSandbox: 'Kein Tipp in der Sandbox. Öffne Levels.',
    noGoalSandbox: 'Sandbox hat kein Ziel. Öffne Levels für eine Challenge.',
    allStepsMet: 'Alle Lösungsschritte sind erfüllt.',
    nothingToUndo: 'Nichts rückgängig zu machen.',
    helpLinks: 'GitHub / Buy me a coffee — Toolbar-Links zu Quelle & Support',
    curriculumOutcomes: 'Nach diesem Kurs solltest du Folgendes können:',
    progressLevels: (solved, total) => `Fortschritt: ${solved}/${total} Levels gelöst.`,
    fieldGlossary: 'Feld-Glossar: tippe `concepts` (oder `concepts pointer`).',
    quizAnswerUsage: 'Antworte mit: quiz A | quiz B | quiz C',
    quizFinished:
      'Quiz beendet. Tippe `curriculum` für die Lernziele oder `quiz` zum Neustart.',
    quizHeader: (i, n) => `Quiz ${i}/${n}`,
    progressKept: (cmd) => `Fortschritt behalten. Noch bei: ${cmd}`,
    commandsUsed: (n, par) => `Befehle verwendet: ${n} · ideal: ${par}`,
    idealCommands: (par) => `Ideal: ${par} Befehl${par === 1 ? '' : 'e'}`,
    nextMeta: (cmd) => `Als Nächstes: ${cmd}`,
    continueGoal: 'Setze das Level-Ziel fort.',
    idealForLevel: (par) => `Ideal für dieses Level: ${par} Befehl${par === 1 ? '' : 'e'}`,
    idealForLevelShort: (par) => `— auf oder unter dem Ideal (${par}). Sauberer Lauf.`,
    cheers: [
      'Geschafft. Dieses Konzept gehört jetzt dir.',
      'Boom — eine weitere DVC-Skill gebunkert.',
      'Hast du dir gerade verdient. Teile es.',
      'Pipeline des Lernens: Stage gelöst.',
      'Pointer committed. Vertrauen hoch.',
    ],
    shareTitle: 'Teile, was du gelernt hast (inkl. deinem Curriculum)',
    styleList: 'Stil-Liste für den Post:',
    shareGroupLabel: 'In sozialen Netzwerken teilen',
    linkedin: 'LinkedIn',
    xTwitter: 'X / Twitter',
    facebook: 'Facebook',
    copyPost: 'Post kopieren',
    baskInIt: 'Genießen',
    celebrateOn: (id) => `Weiter feiern: ${id}`,
    browseLevels: 'Levels durchstöbern',
    levelComplete: 'Level abgeschlossen',
    copyOk: 'Vollständiger Post kopiert — überall einfügen.',
    copyFail: 'Kopieren fehlgeschlagen — Share-Text manuell auswählen.',
    shareOpened:
      'Share-Fenster geöffnet — Post-Text manuell kopieren, falls das Feld leer ist.',
    shareCopied:
      'Post kopiert. In die Share-Box einfügen (LinkedIn/Facebook blockieren Auto-Text).',
    unknownLevel: (id) => `Unbekanntes Level '${id}'`,
    levelMeta: (id, name) => `Level ${id} — ${name}`,
    lessonReplayed: 'Lektionsfolien für dieses Level wiederholt.',
    sandboxMode: 'Sandbox-Modus.',
    resetLevel: (id) => `Level ${id} zurückgesetzt.`,
    resetSandbox: 'Sandbox zurückgesetzt.',
    noSolutionSandbox: 'Sandbox hat keine Lösung. Öffne Levels.',
    nextCelebration: (id, name) => `Nächste Feier: **${id}** — ${name}`,
    lastInPack:
      'Letztes Level in diesem Pack. Öffne **Levels**, um weiterzumachen.',
    solvedCountLabel: (n, total) =>
      `${n} / ${total} Levels gelöst · Fortschritt in diesem Browser gespeichert`,
    learnMoreList: 'Was ich bisher gelernt habe:',
    solveMoreLevels: 'Löse mehr Levels, um diese Liste zu füllen',
    tabFillsWord: 'Tab füllt ein Wort nach dem anderen',
    nextPrompt: 'Als Nächstes',
    nextPlaceholder: (hint) => `Als Nächstes: ${hint}  (Tab Schritt für Schritt)`,
    termAriaLabel:
      'DVC-Kommando-Eingabe. Tab vervollständigt ein Wort. Pfeil rauf/runter durch die History.',
    workspaceEmpty: 'Workspace leer — führe `dvc init` aus oder lade ein Level.',
    cacheEmpty: 'Cache leer. `dvc add` speichert Objekte hier.',
    remoteEmpty: 'Keine Remote. `dvc remote add -d <name> <url>`',
    remoteEmptyCmd: 'Keine Remote. `dvc remote add -d <name> <url>`',
    remoteNoObjects: 'Noch keine Objekte hochgeladen — `dvc push`.',
    flowCaption: 'workspace ⇄ cache ⇄ remote',
    flowArrow:
      'Materialfluss: workspace → cache → remote (push) · remote → cache → workspace (pull)',
    workspaceHint: 'Dateien auf der Platte · Pointer · Code',
    workspaceWhy:
      'Warum es zählt: Das lesen deine Tools tatsächlich. Getrackte Daten bleiben hier als verlinkte Datei — Git sieht nie die schweren Bytes.',
    cacheHint: '.dvc/cache — content-adressierte Objekte',
    cacheWhy:
      'Warum es zählt: lokaler Store für Datenversionen (nach md5). dvc add/commit legen Bytes hier ab; checkout/pull lesen sie zurück.',
    remoteHint: 'Geteilter Speicher für schwere Daten',
    remoteWhy:
      'Warum es zählt: Teammates und CI bekommen hier dieselben Bytes. Leere Remote = Daten reisen nicht mit git push allein.',
    pipelineTitle: 'Pipeline · dvc.yaml',
    language: 'Sprache',
    menuLabel: 'Menü',
    workspace: 'Workspace',
    cache: 'Cache',
    remote: 'Remote',
    coachAllDone:
      'Alle Zielschritte sind erfüllt — du solltest fertig sein. Tippe `show goal` zum Bestätigen.',
    coachNextSteps: (n, id) => `Nächste Schritte (${n} offen)${id ? ` für ${id}` : ''}:`,
    coachFooter: 'Tippe `steps` für diese Liste · `hint` · `show goal`',
    shareLinkedInHead:
      'Ich bin wirklich glücklich — ich habe gerade praktisches Data Version Control auf LearnDVC gelernt!',
    shareStarting: 'Meine DVC-Reise beginnt.',
    shareLatestWin: (name, id) => `Letzter Erfolg: ${name} (${id})`,
    shareCommands: (n, par) => ` — ${n} Befehl${n === 1 ? '' : 'e'} (ideal ${par})`,
    shareLearnedSoFar: 'Was ich bisher gelernt habe:',
    shareProgress: (solved, total) => `Fortschritt: ${solved}/${total} Levels.`,
    shareCta:
      'Wenn du mit ML-Daten oder Modellen arbeitest, probier es — kostenlos, ohne Login:',
    shareXHead: (solved, total) =>
      `Richtig glücklich — DVC lernen auf LearnDVC (${solved}/${total} Levels).`,
    shareXFirst: 'Hands-on Sandbox.',
    shareHandson: 'Hands-on Sandbox.',
    titleLearnDvc: 'LearnDVC — Data Version Control Tutorial',
    welcomeTitle: 'LearnDVC',
    welcomeIntro:
      'Interaktives **Data Version Control**-Tutorial — Sandbox + geführte Levels.',
    welcomeBoard:
      'Das Board zeigt **Workspace → Cache → Remote**. Das ist der Materialfluss, den DVC verwaltet.',
    welcomeTracks:
      '- Basics: `init`, `add`, Pointer, Status\n- Remotes: `remote add`, `push`, `pull`\n- Pipelines: `stage add`, `repro`, Params/Metrics\n- Experiments: `exp run`, `exp show`, `exp apply`',
    welcomeMeta:
      'Meta: `levels`, `curriculum`, `concepts`, `lesson`, `hint`, `steps`, `show solution`.',
    welcomeLevelsCount: (n) =>
      `**${n}** Levels enthalten. Öffne Levels zum Starten oder bleib in der Sandbox.`,
    welcomeWhat: '**Was ist LearnDVC?**',
    welcomeWhatBody:
      'Eine Browser-Laborbank für DVC: du tippst echte `dvc` / `git`-Befehle und siehst, wie Pointer, Cache-Objekte und Remotes sich bewegen. Kein Install für den Tutorial-Kern nötig.',
    welcomePublisher: '**Publisher**',
    welcomePublisherBody:
      'Veröffentlicht und gepflegt von **Ali Sadeghi Aghili** — Programmer, Data Engineer / Scientist, ML Engineer. [linktr.ee/aliaghili](https://linktr.ee/aliaghili)',
    welcomeGithub: '- [GitHub — Quelle & Issues](https://github.com/alisadeghiaghili/learn-dvc)',
    welcomeCoffee: 'Buy Me a Coffee (unterstützt den Publisher):',
    welcomeToolbar:
      'Toolbar: **Lektion** (Intro wiederholen) · **GitHub** · **Buy me a coffee**.',
    sandbox: 'Sandbox',
    openLevels: 'Levels öffnen',
    useIt: 'So nutzt du es:',
    uiHelpMapTitle: 'Seitenkarte — was jede UI-Region macht',
    uiHelpCommands: 'Befehle: `help ui` · `help` · `curriculum` · `concepts` · `levels`',
    quiz: [
      {
        q: 'Was speichert Git in einem ML-Repo nach dvc add?',
        a: ['Rohe Datensatz-Bytes', 'Pointer (.dvc: md5) + Ignore-Regeln', 'Nur Modellgewichte'],
        correct: 1,
      },
      {
        q: 'dvc.lock ist…',
        a: [
          'Eine Passwortdatei',
          'Die Ausführungsquittung (Hashes/Params des letzten repro)',
          'Die Remote-URL',
        ],
        correct: 1,
      },
      {
        q: 'Nach dem Ändern von Params und Zurücksetzen auf den alten Wert sollte repro…',
        a: ['Immer neu trainieren', 'Den Run-Cache treffen und Arbeit sparen', 'Den Cache löschen'],
        correct: 1,
      },
      {
        q: 'DVCLive log_metric speist…',
        a: ['GitHub stars', 'metrics.json / exp comparison', 'SSH keys'],
        correct: 1,
      },
      {
        q: 'Bestes CI-Skelett für ein DVC-Projekt?',
        a: [
          'nur git clone',
          'git clone + dvc pull + dvc repro (+ cml comment)',
          'pip install dvc && exit',
        ],
        correct: 1,
      },
      {
        q: 'Git-LFS vs. DVC in einem Satz?',
        a: [
          'Identisch',
          'LFS = große Blobs in Git-Remotes; DVC = Pointer in Git + Objekt-Remote + Pipeline/Exp',
          'LFS ist für Python',
        ],
        correct: 1,
      },
    ],
    helpSections: [
      {
        id: 'level-title',
        selector: '.level-title',
        title: 'Kontext-Leiste',
        what: 'Zeigt Sandbox-Modus oder aktive Level-id/name und **ideale Befehlszahl** (wie viele Befehle die saubere Lösung braucht).',
        how: 'Zum Bestätigen, in welchem Level du bist. „Ideal: 3 Befehle“ = Golf-Ziel, kein hartes Limit.',
      },
      {
        id: 'toolbar',
        selector: '.toolbar-actions',
        title: 'Toolbar-Buttons',
        what: [
          '**Levels** — Challenge-Browser. Zeilen zeigen **Schwierigkeitspunkte** (1–5) und **ideale Befehlszahl**.',
          '**Lektion** — Intro-Folien des aktuellen Levels (oder About in der Sandbox).',
          '**Guide** — rechtes Guide-Panel pulsen/scrollen.',
          '**Tipp** / **Lösung** / **Rückgängig** / **Zurücksetzen** / **Sandbox**.',
          '**Hilfe** — diese UI-Karte (`help ui`).',
          '**GitHub** — Quellrepo und Issues.',
          '**Buy me a coffee** — unterstütze den Publisher (Ali Sadeghi Aghili).',
        ].join('\n'),
        how: 'Lektion ist immer verfügbar, wenn du die Teaching-Folien vergessen hast. Externe Links öffnen in neuem Tab.',
      },
      {
        id: 'links',
        selector: 'a.tb-link',
        title: 'GitHub- & Support-Links',
        what: 'Open-Source-Home und Buy-Me-a-Coffee-Seite des Publishers.',
        how: 'https://github.com/alisadeghiaghili/learn-dvc · https://www.buymeacoffee.com/alisadeghil',
      },
      {
        id: 'dock',
        selector: '.dock',
        title: 'Rechtes Guide-Panel (immer an)',
        what: [
          'Volle Höhe rechts neben der App.',
          '**Du lernst** — Konzepte dieses Levels.',
          '**In Produktion (Field Notes)** — was Engineers mit dem Skill tun.',
          '**Als Nächstes tippen** — erster offizieller Befehl.',
          '**Checkliste** — jeder Lösungsbefehl; orange Neon = aktueller Schritt.',
          'Grün ✓ = erledigt (bleibt auch nach Fehlern, solange der Effekt nicht rückgängig ist).',
        ].join('\n'),
        how: 'Beim Tippen im Blick behalten. Auf Desktop kollabiert es nie; auf schmalen Screens dockt es unter das Board.',
      },
      {
        id: 'status-pills',
        selector: '.status-bar',
        title: 'Status-Pills (oben am Board)',
        what: 'Schnelle Gesundheit: DVC initialisiert?, Remote-Anzahl, Cache-Objekte, Remote-Objekte, Experimente.',
        how: 'Nach push sollten Remote-Objekte steigen. Nach add sollte Cache steigen.',
      },
      {
        id: 'workspace-zone',
        selector: '.zone.workspace',
        title: 'Workspace-Zone',
        what: 'Dateien im simulierten Projekt: Rohdaten, Code, Params, `.dvc`-Pointer, `dvc.yaml`.',
        how: [
          'Chips erklären den Zustand:',
          '• **.dvc pointer** — DVC trackt diesen Pfad (Git trackt nur die `.dvc`-Datei)',
          '• **gitignored** — Rohdaten bewusst aus Git ausgeschlossen',
          '• **dirty** — Bytes ≠ Pointer-md5 (`dvc status`)',
          '• **git staged** — bereit für `git commit`',
          '• **missing** — Datei fehlt (pull/checkout nötig)',
        ].join('\n'),
      },
      {
        id: 'cache-zone',
        selector: '.zone.cache',
        title: 'Cache-Zone',
        what: 'Lokale `.dvc/cache`-Objekte — content-adressierte Kopien getrackter Daten (md5).',
        how: '`dvc add`/`commit` füllen ihn. `dvc checkout`/`pull` lesen daraus. Gleiche Bytes = ein Objekt.',
      },
      {
        id: 'remote-zone',
        selector: '.zone.remote',
        title: 'Remote-Zone',
        what: 'Konfigurierte DVC-Remotes + mit `dvc push` hochgeladene Objekte.',
        how: 'Leere Remote-Objekte + voller Cache ⇒ du musst noch pushen, bevor Teammates pullen können.',
      },
      {
        id: 'flow-arrow',
        selector: '.flow-arrow',
        title: 'Materialfluss-Bildunterschrift',
        what: 'Einzeilige Erinnerung: workspace ⇄ cache ⇄ remote.',
        how: 'Beim Debuggen fragen: „wo sind die Bytes?“ — in diese Richtung.',
      },
      {
        id: 'dag',
        selector: '.dag',
        title: 'Pipeline-Leiste',
        what: 'Stages aus `dvc.yaml` mit cmd/outs. Grün/up = aktuell; warn = stale/braucht repro.',
        how: '`dvc dag`, `dvc repro`. Params/Metrics-Zusammenfassung erscheint, wenn produziert.',
      },
      {
        id: 'term-log',
        selector: '.term-log',
        title: 'Terminal-Log',
        what: 'Befehls-Echo, Outputs, Errors, Coach-Zeilen, Why-Blöcke, Celebration-Text.',
        how: 'Nach wichtigen DVC-Befehlen nach `── Why: … ──` scrollen.',
      },
      {
        id: 'term-hint',
        selector: '.term-hint',
        title: 'Tipp-Leiste über der Eingabe',
        what: 'Zeigt den nächsten offiziellen Befehl und Tab-Zyklus-Optionen.',
        how: 'Orange `jetzt`-Chip im Dock passt zu diesem „next“-Schritt.',
      },
      {
        id: 'term-ghost',
        selector: '.term-input-wrap',
        title: 'Prompt + Ghost-Vervollständigung',
        what: [
          '`dvc $`-Prompt.',
          'Placeholder: nächster Befehl, wenn leer (ein Hinweis).',
          'Ghost: Rest des **aktuellen Worts** beim Tippen.',
          'Tab: **ein Wort** vervollständigen (bash-like). ↑/↓ History. Esc leert die Eingabe.',
        ].join('\n'),
        how: 'Tippe `dvc ` und dann Tab, um Subcommand-Wörter zu durchlaufen.',
      },
    ],
  },
  levels: deLevels,
};
