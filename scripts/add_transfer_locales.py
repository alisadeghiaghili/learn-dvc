from pathlib import Path

de_block = """
  'xfer-1': {
    seriesTitle: 'Transfer',
    name: 'Pointer-Forensik: Verständnis beweisen',
    objective: 'Keine neuen Befehle. Pointer lesen, Git vs DVC erklären, Integrität mit status/diff beweisen.',
    learning: ['Pointer ist der Vertrag: path + md5', 'Wer .dvc nicht erklären kann, besitzt die Skill nicht'],
    fieldNotes: ['Incident-Fragen starten hier'],
    startDialog: [{ title: 'Erkläre es oder du besitzt es nicht', markdown: 'Dieses Level verlangt **Evidenz**, keine neuen Flags.' }],
  },
  'xfer-2': {
    seriesTitle: 'Transfer',
    name: 'Unter Druck liefern — keine fehlenden Glieder',
    objective: 'Handoff: dirty → Evidenz → Pointer → Remote → History.',
    learning: ['Ohne Push/Pointer-Commit bricht der nächste Teammate', 'status vor commit ist nicht verhandelbar'],
    fieldNotes: ['Definition of done für Datenarbeit'],
    startDialog: [{ title: 'Kein Sicherheitsnetz', markdown: 'Du bist on-call. Liefer den Handoff.' }],
  },
  'xfer-3': {
    seriesTitle: 'Transfer',
    name: 'Pipeline-Design ohne Rezept',
    objective: 'Train-Stage selbst entwerfen: deps, params, outs, metrics. Dann repro + DAG.',
    learning: ['deps = Invalidierung, params = Stellschrauben, metrics = Evidenz', 'Fehlende deps sind stille Produktionsfehler'],
    fieldNotes: ['Interview-Drill: Stage skizzieren, dann tippen'],
    startDialog: [{ title: 'Du entwirfst es', markdown: 'Erst denken, dann tippen. Dann repro + dag.' }],
  },
  'xfer-4': {
    seriesTitle: 'Transfer',
    name: 'Experiment-Lifecycle + Fehlerrecovery',
    objective: 'Schlechten und guten Lauf fahren, Gewinner wählen, bis params/Artefakte/Status stimmen.',
    learning: ['Ein schlechter Lauf ist Datenmaterial', 'apply ist fertig erst nach params + repro + status'],
    fieldNotes: ['Fehlgeschlagenen Lauf nie vor exp show löschen'],
    startDialog: [{ title: 'Der erste Versuch ist absichtlich falsch', markdown: 'Erst der schlechte Hyperparameter. Dann der bessere.' }],
  },
  'xfer-5': {
    seriesTitle: 'Transfer',
    name: 'PR-Review-Maßstab: Evidenz oder ablehnen',
    objective: 'ML-PR-Evidenzpaket liefern. Ohne Metric-Bewegung nicht mergen.',
    learning: ['Review-Bar: params + metrics + plots diff', 'Keine Metric-Bewegung = nicht mergen'],
    fieldNotes: ['Das ist die Review-Vorlage fürs Team'],
    startDialog: [{ title: 'Du bist der Reviewer', markdown: 'Drei Diffs. Fehlt die Wirkung, besteht das Level nicht.' }],
  },
  'xfer-6': {
    seriesTitle: 'Transfer',
    name: 'Incident: kaputte Kette reparieren',
    objective: 'Datei weg. Kette pointer → cache/remote → Workspace wiederherstellen.',
    learning: ['Verlorene Datei ≠ verlorene Daten', 'fetch vs pull ist die Reparatur-Reihenfolge'],
    fieldNotes: ['Das ist das 2-Uhr-Runbook'],
    startDialog: [{ title: 'Die Datei ist weg', markdown: '`data/data.xml` fehlt. **Repariere ohne Panik.**' }],
  },
  'xfer-7': {
    seriesTitle: 'Transfer',
    name: 'Lock-Integrität: Die Quittung lügt nie',
    objective: 'Stale Lock erzeugen, nur per repro fixen, dann yaml vs lock beweisen.',
    learning: ['Lock nie von Hand editieren', 'Stale Lock = falsche Quittung für jeden Clone'],
    fieldNotes: ['CI sollte failen, wenn lock nach repro dirty ist'],
    startDialog: [{ title: 'Die Quittung muss stimmen', markdown: 'Params ändern. Mit `repro` fixen, nicht mit dem Editor.' }],
  },
};
"""

fa_block = """
  'xfer-1': {
    seriesTitle: 'انتقال',
    name: 'پزشکی قانونی pointer: اثبات درک',
    objective: 'فرمان جدید نیست. pointer را بخوانید، گیت و DVC را توضیح دهید، صحت را با status/diff اثبات کنید.',
    learning: ['فایل pointer قرارداد است: path + md5', 'اگر نمی‌توانید .dvc را توضیح دهید، مهارت مال شما نیست'],
    fieldNotes: ['پرسش‌های حادثه از همین‌جا شروع می‌شود'],
    startDialog: [{ title: 'توضیح بده وگرنه مال تو نیست', markdown: 'این level **شاهد** می‌خواهد، نه فلگ جدید.' }],
  },
  'xfer-2': {
    seriesTitle: 'انتقال',
    name: 'تحویل زیر فشار — بدون حلقه‌ی گم‌شده',
    objective: 'تحویل: dirty → شاهد → pointer → remote → تاریخچه.',
    learning: ['بدون push/commit pointer هم‌تیمی بعدی می‌شکند', 'status قبل از commit قابل مذاکره نیست'],
    fieldNotes: ['تعریف Done برای کار داده'],
    startDialog: [{ title: 'شبکه‌ی ایمنی نیست', markdown: 'شما مهندس on-call هستید. تحویل را تمام کنید.' }],
  },
  'xfer-3': {
    seriesTitle: 'انتقال',
    name: 'طراحی pipeline بدون دستورالعمل',
    objective: 'stage آموزش را خودتان طراحی کنید: deps، params، outs، metrics. بعد repro + DAG.',
    learning: ['deps = باطل‌سازی، params = اهرم‌ها، metrics = شاهد', 'deps جامانده یعنی باگ خاموش تولید'],
    fieldNotes: ['تمرین مصاحبه: اول طراحی، بعد تایپ'],
    startDialog: [{ title: 'شما طراحی می‌کنید', markdown: 'اول فکر، بعد تایپ. بعد repro + dag.' }],
  },
  'xfer-4': {
    seriesTitle: 'انتقال',
    name: 'چرخه‌ی آزمایش + بازیابی خطا',
    objective: 'اجرای بد و خوب، انتخاب با شاهد، تا params/آرتیفکت/status هم‌راستا شوند.',
    learning: ['اجرای بد هم داده است', 'apply تمام نمی‌شود تا params + repro + status'],
    fieldNotes: ['اجرای ناموفق را قبل از exp show پاک نکنید'],
    startDialog: [{ title: 'تلاش اول عمداً غلط است', markdown: 'اول هایپرپارامتر بد. بعد بهتر.' }],
  },
  'xfer-5': {
    seriesTitle: 'انتقال',
    name: 'مرز ریویوی PR: شاهد یا رد',
    objective: 'بسته‌ی شاهد ML PR را بسازید. بدون حرکت metric ادغام نکنید.',
    learning: ['مرز ریویو: params + metrics + plots diff', 'بدون حرکت metric یعنی نه'],
    fieldNotes: ['این قالب ریویوی تیم شما باید باشد'],
    startDialog: [{ title: 'شما ریویور هستید', markdown: 'سه diff. اگر اثر نیست، level قبول نیست.' }],
  },
  'xfer-6': {
    seriesTitle: 'انتقال',
    name: 'حادثه: ترمیم زنجیره‌ی شکسته',
    objective: 'فایل رفته است. زنجیره pointer → cache/remote → workspace را بازسازی کنید.',
    learning: ['فایل گم‌شده ≠ داده گم‌شده', 'fetch در برابر pull ترتیب ترمیم است'],
    fieldNotes: ['این runbook ساعت ۲ بامداد است'],
    startDialog: [{ title: 'فایل نیست', markdown: '`data/data.xml` از دیسک رفته. **بدون وحشت ترمیم کنید.' }],
  },
  'xfer-7': {
    seriesTitle: 'انتقال',
    name: 'یکپارچگی lock: رسید هرگز دروغ نمی‌گوید',
    objective: 'lock کهنه بسازید، فقط با repro درست کنید، بعد yaml و lock را هم‌داستان اثبات کنید.',
    learning: ['lock را دستی ویرایش نکنید', 'lock کهنه = رسید دروغ برای هر clone'],
    fieldNotes: ['CI باید fail کند اگر lock بعد از repro dirty بود'],
    startDialog: [{ title: 'رسید باید راست بگوید', markdown: 'پارامتر را عوض کنید. با `repro` درست کنید.' }],
  },
};
"""

for path, block in [('src/i18n/de-levels.ts', de_block), ('src/i18n/fa-levels.ts', fa_block)]:
    p = Path(path)
    t = p.read_text(encoding='utf-8')
    if 'xfer-1' in t:
        print(path, 'already')
        continue
    idx = t.rfind('};')
    t = t[:idx] + block.strip() + '\n' + t[idx:]
    p.write_text(t, encoding='utf-8')
    print(path, 'appended')
