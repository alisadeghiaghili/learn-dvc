/** Persian catalog — full teaching copy. Commands and CLI stay English. UI is RTL. */

import type { Catalog } from './types';
import { faLevels } from './fa-levels';

export const fa: Catalog = {
  locale: 'fa',
  dir: 'rtl',
  teach: {
    'git-checkout-data': {
      title: 'git checkout (data pointers)',
      lines: [
        'دارید نسخه‌ی داده‌ای که پروژه باید استفاده کند را عوض می‌کنید.',
        'گیت pointer فایل .dvc را به‌روز می‌کند؛ خودش بایت دانلود نمی‌کند.',
        'بعدش dvc checkout تا فضای کاری با pointer هم‌راستا شود.',
        'تمرین rollback تولید — قبل از لزومِ ساعت ۲ بامداد تمرین کنید.',
      ],
    },
    'dvc-init': {
      title: 'dvc init',
      lines: [
        'DVC افزونه‌ی گیت برای داده است، جایگزین گیت نیست.',
        'Init فقط متادیتای محلی زیر .dvc/ می‌سازد (config، قواعد ignore).',
        'هنوز هیچ دیتاستی version نشده — فقط workflow را روشن کردید.',
        'این فایل‌های کوچک را باید با گیت commit کنید تا تیم setup یکسان داشته باشد.',
      ],
    },
    'dvc-add': {
      title: 'dvc add',
      lines: [
        '1. محتوای فایل داده هش می‌شود (md5) — هویت همان بایت‌ها.',
        '2. بایت‌ها یک بار در cache محلی (.dvc/cache) ذخیره می‌شوند، content-addressed.',
        '3. یک فایل pointer کوچک .dvc مسیر → md5 را ثبت می‌کند (YAML خوانا).',
        '4. مسیر داده‌ی خام به .gitignore می‌رود تا گیت با فایل گیگی باد نکند.',
        'گیت pointer را version می‌کند؛ DVC بایت‌ها را. تفکیک مسئولیت.',
      ],
    },
    'dvc-status': {
      title: 'dvc status',
      lines: [
        'داده‌ی فضای کاری را با pointer و cache و remote مقایسه می‌کند.',
        '«modified» یعنی فایل روی دیسک دیگر با md5 داخل فایل .dvc نمی‌خواند.',
        'داده گم نشده — یک تغییر commit‌نشده دارید، مثل git status.',
      ],
    },
    'dvc-commit': {
      title: 'dvc commit',
      lines: [
        'pointer فایل .dvc را روی هش فعلی می‌نویسد و مطمئن می‌شود شیء در cache هست.',
        'این commit سمت داده است. بعدش هنوز باید pointer را با git commit کنید.',
        'بدون dvc commit، گیت pointerی ثبت می‌کند که دیگر به داده نمی‌خواند.',
      ],
    },
    'dvc-remote-add': {
      title: 'dvc remote add',
      lines: [
        'remote داده‌ی DVC store شیء برای آرتیفکت‌های cache است (S3، GCS، SSH، مسیر محلی…).',
        'این remote گیت نیست. remote گیت = کد + pointer. remote داده = داده‌ی سنگین.',
        '-d مسیر default برای push/pull/fetch را مشخص می‌کند.',
      ],
    },
    'dvc-push': {
      title: 'dvc push',
      lines: [
        'اشیای cache را که remote ندارد آپلود می‌کند.',
        'هم‌تیمی‌ها با همان commit گیت می‌توانند dvc pull کنند و دقیقاً همان بایت‌ها را بگیرند.',
        'CI هم می‌تواند داده بکشد بدون آن‌که دیتاست را در ریپوی گیت بپزد.',
      ],
    },
    'dvc-pull': {
      title: 'dvc pull',
      lines: [
        'fetch: فقط کپی اشیا از remote به cache محلی.',
        'pull: fetch + checkout تا فایل‌های فضای کاری با pointerهای فعلی بخوانند.',
        'به همین دلیل cloneها کوچک می‌مانند: git clone pointer می‌آورد؛ dvc pull داده.',
      ],
    },
    'dvc-fetch': {
      title: 'dvc fetch',
      lines: [
        'fetch: فقط کپی اشیا از remote به cache محلی.',
        'pull: fetch + checkout تا فایل‌های فضای کاری با pointerهای فعلی بخوانند.',
        'به همین دلیل cloneها کوچک می‌مانند: git clone pointer می‌آورد؛ dvc pull داده.',
      ],
    },
    'dvc-checkout': {
      title: 'dvc checkout',
      lines: [
        'هر pointer فایل .dvc را می‌خواند و همان هش را از cache در فضای کاری برمی‌گرداند.',
        'بعد از git checkout یک commit قدیمی، dvc checkout داده را هم‌راستا می‌کند.',
        'تعویض نسخه‌ی داده یعنی تعویض pointer — ارزان؛ با cache دانلود کامل نمی‌خواهد.',
      ],
    },
    'dvc-stage-add': {
      title: 'dvc stage add',
      lines: [
        'stageهای pipeline در dvc.yaml زندگی می‌کنند (deps, outs, cmd, params, metrics).',
        'وابستگی‌ها مشخص می‌کنند چه چیزی stage را با تغییر invalidate کند.',
        'خروجی‌ها مشخص می‌کنند DVC بعد از اجرای موفق چه چیزی را ترک/cache کند.',
        'کد در گیت می‌ماند؛ I/O داده از مسیر DVC — بازتولیدپذیری به‌مثابه قرارداد.',
      ],
    },
    'dvc-repro': {
      title: 'dvc repro',
      lines: [
        'معنای build-system برای ML: فقط stageهایی که ورودی/پارامترشان عوض شده اجرا شوند.',
        'اجرای موفق dvc.lock می‌نویسد — رسید اجرای هش‌های مصرف‌شده.',
        'lock یکسان + cache یکسان ⇒ خروجی یکسان بدون آموزش دوباره.',
      ],
    },
    'dvc-exp-run': {
      title: 'dvc exp run',
      lines: [
        'pipeline را در بافت آزمایش اجرا می‌کند، بدون شلوغی شاخه.',
        'پارامترهای -S / params.yaml همراه metrics برای مقایسه ثبت می‌شوند.',
        'آزمایش‌ها first-class هستند: list، diff، اعمال برنده در فضای کاری.',
      ],
    },
    'dvc-exp-apply': {
      title: 'dvc exp apply',
      lines: [
        'پارامتر/metrics یک آزمایش انتخاب‌شده را به فضای کاری می‌آورد.',
        'از همین مسیر «اجرای برنده» baseline جدید می‌شود، بدون تایپ دوباره‌ی مقادیر.',
      ],
    },
    edit: {
      title: 'edit (شبیه‌سازی)',
      lines: [
        'در پروژه‌های واقعی داده/پارامتر را ابزار یا کد عوض می‌کند، نه این کمک.',
        'اینجا `edit` جانشین «دیتاست/هایپرپارامتر عوض شد» است.',
        'پرسش بعدی که DVC مجبورتان می‌کند: آیا این تغییر version شده؟',
      ],
    },
    'git-add-dvc': {
      title: 'git add (DVC files)',
      lines: [
        'متادیتایی را staged می‌کنید که گیت باید نگه دارد: pointer، قواعد ignore، YAML خط لوله.',
        'فایل داده‌ی بزرگ هرگز اینجا نباید باشد — .gitignore بیرونشان می‌گذارد.',
        'قبل از commit با `git status` ریویو کنید: diff می‌خواهید، نه blob داده.',
      ],
    },
    'git-commit': {
      title: 'git commit',
      lines: [
        'وضعیت pointer/pipeline را در تاریخچه‌ی گیت برای ریویو + بازتولید ثبت می‌کند.',
        'clone این commit می‌داند کدام نسخه‌ی داده متعلق است — نه خود داده را.',
        'هر release گیت را با remote داده‌ای که هنوز آن اشیای cache را دارد جفت کنید.',
      ],
    },
    'dvc-live': {
      title: 'dvc live (DVCLive)',
      lines: [
        'DVCLive پایتون را ابزارک‌گذاری می‌کند (Live / log_metric / log_plot / make_report).',
        'اسکالرها metrics می‌شوند؛ سری‌ها plot؛ گزارش HTML برای انسان.',
        'دوره‌های رسمی این را پل از نوت‌بوک به exp show/plots می‌دانند.',
      ],
    },
    'exp-queue': {
      title: 'exp queue',
      lines: [
        'مجموعه‌پارامترها را صف کنید، بعد با هم اجرا کنید (--run-all / queue start).',
        'از بیسیت کردن یک job لپ‌تاپ برای هر هایپرپارامتر جلوگیری می‌کند.',
      ],
    },
    'dvc-update': {
      title: 'dvc update',
      lines: [
        'هدف importشده‌ی .dvc را به آخرین نسخه‌ی upstream registry تازه می‌کند.',
        'بعد اگر import وابستگی pipeline بود repro کنید.',
      ],
    },
    cml: {
      title: 'CML',
      lines: [
        'CML از CI روی PRهای GitHub/GitLab درباره metrics/plot نظر می‌گذارد.',
        'اسکلت CI: checkout → dvc pull → dvc repro → cml comment.',
      ],
    },
    'dvc-freeze': {
      title: 'dvc freeze',
      lines: [
        'freeze یک stage خط لوله را میخکوب می‌کند تا repro دوباره اجرا نکند.',
        'برای محافظت از آرتیفکت تولید هنگام آزمایش روی پارامتر/داده.',
        'unfreeze کاری عمدی است — با ریویو + repro + push جفت کنید.',
      ],
    },
    'dvc-unfreeze': {
      title: 'dvc unfreeze',
      lines: [
        'freeze یک stage خط لوله را میخکوب می‌کند تا repro دوباره اجرا نکند.',
        'برای محافظت از آرتیفکت تولید هنگام آزمایش روی پارامتر/داده.',
        'unfreeze کاری عمدی است — با ریویو + repro + push جفت کنید.',
      ],
    },
    'dvc-diff': {
      title: 'dvc diff',
      lines: [
        'دریفت pointer/محتوا برای داده‌ی ترک‌شده را نشان می‌دهد (سطح هش، نه تکه‌های متن).',
        'قبل از پذیرش تغییر: کدام md5 جابه‌جا شد، چقدر روی remote است؟',
        'در تولید با git show فایل .dvc برای روایت جفت کنید.',
      ],
    },
    'dvc-exp-show': {
      title: 'dvc exp show',
      lines: [
        'مقایسه‌ی جدولی آزمایش‌ها: پارامتر در برابر metrics کنار هم.',
        'baseline را با شاهد انتخاب می‌کنید، نه با حافظه.',
      ],
    },
  },
  glossary: {
    split: {
      title: 'تفکیک گیت و DVC',
      body: 'گیت قصد را version می‌کند (کد + فایل pointer). DVC محموله را (اشیای داده/مدل). هرگز دیتاست گیگی در تاریخچه‌ی گیت نگذارید؛ pointer هش + YAML قابل ریویو نگه دارید.',
    },
    pointer: {
      title: 'فایل pointer (.dvc)',
      body: 'YAML کوچک با مسیر + md5 (+ اندازه). گیت pointer را commit می‌کند. وقتی بایت‌ها عوض شوند، dvc add/commit pointer را تازه می‌کند؛ تاریخچه‌ی گیت pointerهای قدیمی را برای rollback نگه می‌دارد.',
    },
    cache: {
      title: 'cache محتوانشان',
      body: 'اشیا زیر .dvc/cache/files/md5/xx/… با کلید هش محتوا. بایت‌های یکسان یک بار ذخیره می‌شوند. cache محلی منبع materialize برای checkout فضای کاری است.',
    },
    remote: {
      title: 'فضای ذخیره‌سازی remote',
      body: 'store شیء مشترک برای آرتیفکت‌های cache (S3، GCS، SSH، محلی). dvc push اشیای جامانده را می‌فرستد؛ dvc pull/fetch می‌گیرد. جدای از git remote.',
    },
    dirty: {
      title: 'داده‌ی dirty',
      body: 'بایت‌های فضای کاری ≠ md5 pointer (یا فایل نیست). dvc status نشان می‌دهد. راه‌حل: dvc commit (نسخه‌ی جدید) یا dvc checkout (دور ریختن دریفت).',
    },
    checkout: {
      title: 'materialize نسخه',
      body: 'dvc checkout pointerها را می‌خواند و اشیای cache سازگار را در فضای کاری برمی‌گرداند. بعد از git checkout commit قدیمی همیشه dvc checkout تا بایت‌ها با قصد بخوانند.',
    },
    pipeline: {
      title: 'DAG خط لوله',
      body: 'stageهای dvc.yaml وابستگی، خروجی، فرمان، پارامتر، metrics را اعلام می‌کنند. dvc repro stageهای dirty را توپولوژیک اجرا و dvc.lock را به‌عنوان رسید اجرا می‌نویسد.',
    },
    invalidation: {
      title: 'قواعد invalidate',
      body: 'stage dirty است وقتی هش وابستگی، مقدار پارامتر پیوندی، یا تعریف فرمان عوض شود. تغییر فایل داده هر stageی که آن را -d داشته باشد invalidate می‌کند.',
    },
    params: {
      title: 'params.yaml',
      body: 'هایپرپارامتر قابل ریویو برای انسان. فلگ -p پارامتر را به stage گره می‌زند تا repro/exp بدانند چه را پایش کنند و آزمایش‌ها با -S override کنند.',
    },
    metrics: {
      title: 'metrics و مقایسه',
      body: '-m فایل metrics خروجی stage را علامت می‌زند. dvc exp show آزمایش‌ها را جدول می‌کند. تصمیم جدول می‌خواهد، نه حافظه‌ی سلول نوت‌بوک.',
    },
    exp: {
      title: 'آزمایش‌ها',
      body: 'dvc exp run خط لوله را با پارامتر/metrics ثبت‌شده اجرا می‌کند بدون انفجار شاخه. exp apply پیکربندی برنده را به فضای کاری می‌آورد؛ بعد آرتیفکت‌ها repro.',
    },
    'run-cache': {
      title: 'run cache',
      body: 'DVC به یاد می‌سپارد (cmd + هش وابستگی + پارامتر) → خروجی. هایپرپارامتر را عوض و برگردانید، repro از cache بازیابی می‌کند به‌جای آموزش دوباره.',
    },
    metafiles: {
      title: 'dvc.yaml و dvc.lock',
      body: 'dvc.yaml قرارداد stage است (cmd/deps/params/outs). dvc.lock رسید اجراست (md5 و مقدار پارامتر). هر دو به گیت می‌روند؛ lock را هرگز دستی ویرایش نکنید.',
    },
    diffs: {
      title: 'diffهای تکرار',
      body: 'dvc params diff / metrics diff / plots diff فضای کاری را با HEAD (یا revisionها) مقایسه می‌کنند. تغییرات ML این‌طور review می‌شوند.',
    },
    'registry-cmds': {
      title: 'get / import',
      body: 'dvc get فایل را از پروژه‌ی DVC دیگر کپی می‌کند. dvc import وابستگی را هم version می‌کند (می‌نویسد .dvc). import-url یک URL خارجی را به‌عنوان داده ترک می‌کند.',
    },
    dvclive: {
      title: 'DVCLive',
      body: 'کتابخانه‌ی پایتون داخل کد آموزش: Live()، log_metric، log_plot، log_image، make_report. metrics/plots فایل dvc.yaml را تغذیه می‌کند تا exp show و plots بدون سیم‌کشی دستی کار کنند.',
    },
    'plots-templates': {
      title: 'قالب‌های plot',
      body: 'قالب‌های Vega: simple، linear، confusion، scatter. پیکربندی در dvc.yaml زیر plots:. dvc plots show --template confusion نمای ماتریسی می‌دهد.',
    },
    queue: {
      title: 'صف آزمایش',
      body: 'dvc exp run --queue -S k=v اجرا را پارک می‌کند؛ dvc queue start / exp run --run-all اجرا می‌کند. الگوی استاندارد sweep در دوره‌ها.',
    },
    cml: {
      title: 'CML (CI برای ML)',
      body: 'Continuous Machine Learning روی PRها metrics/plot می‌گذارد. جریان: git clone + dvc pull + dvc repro + cml comment. جایگزین DVC نیست.',
    },
    lfs: {
      title: 'Git-LFS در برابر DVC',
      body: 'Git-LFS blobهای بزرگ را در remoteهای گیت version می‌کند. DVC فایل pointer را در گیت و اشیای محتوانشان را در remoteهای داده، به‌علاوه pipeline/exp. LFS برای باینری بزرگ با نسخه‌ی کم؛ DVC برای داده/مدل ML + بازتولید.',
    },
    foreach: {
      title: 'stageهای foreach / ماتریسی',
      body: 'dvc stage add --foreach یک stage را به چندتا باز می‌کند (مثلاً per-model). جایگزین سطح دوره برای copy-paste stage.',
    },
    'external-outs': {
      title: 'داده‌ی خارجی / no-cache',
      body: 'deps/outs می‌توانند بیرون پروژه باشند (s3://…). cache: false / -O وقتی DVC نباید بایت کپی کند. داده‌ی خارجی را با import-url ترک/تازه کنید.',
    },
    api: {
      title: 'dvc.api',
      body: 'API پایتون برای خواندن داده‌ی ترک‌شده و exp_show() از ریپوی DVC بدون dvc checkout — کاربردی در اپ و نوت‌بوک.',
    },
    'registry-promote': {
      title: 'رجیستری مدل',
      body: 'نسخه‌های جدیدتر DVC آرتیفکت/مدل را first-class می‌دانند (dvc artifacts، stageهایی مثل dev/prod). یک git tag + مدل pullشده promote کنید، نه ایمیل وزنه.',
    },
    dvcignore: {
      title: '.dvcignore',
      body: 'الگوی مسیری که DVC باید بپرد — سرعت روی درخت‌های عظیم. با .gitignore (گیت) یا ignore مسیر داده که dvc add می‌نویسد یکی نیست.',
    },
    incident: {
      title: 'پرسش حادثه',
      body: '«کدام داده این مدل را ساخت؟» پاسخ = commit گیت release → md5های pointer → شیء cache/remote. اگر pointerها هرگز commit نشده باشند، پاسخ وجود ندارد.',
    },
    ci: {
      title: 'CI / الگوی clone تازه',
      body: 'git clone (کد+pointer) → dvc pull (محموله) → dvc repro (بازسازی) یا بارگذاری خروجی cache. job سنگین به credential برای remote داده نیاز دارد، نه حقه‌ی Git-LFS.',
    },
    freeze: {
      title: 'freeze یک stage',
      body: 'dvc freeze <stage> مرحله را میخکوب می‌کند تا repro حتی با تغییر ورودی اجرایش نکند — برای محافظت از آرتیفکت تولید هنگام آزمایش پایین‌دست.',
    },
    gc: {
      title: 'جمع‌آوری زباله',
      body: 'dvc gc اشیای cache را که workspace/refهای گیتی که نگه می‌دارید به آن‌ها ارجاع نمی‌دهند حذف می‌کند. بعد از gc اگر هش ارجاعی فقط روی remote بود شاید dvc pull لازم باشد.',
    },
  },
  ui: {
    appWelcome:
      'LearnDVC — سندباکس تعاملی DVC. `help` تایپ کنید یا `levels` را برای شروع آموزش.',
    sandboxSeeded:
      'سندباکس با پروژه‌ی DVC و data/data.xml آماده است. `dvc add data/data.xml` را امتحان کنید.',
    progressSaved:
      'پیشرفت در همین مرورگر ذخیره می‌شود (localStorage + cookie). هر وقت خواستید برگردید.',
    lesson: 'درس',
    lessonTitle: 'تکرار اسلایدهای مقدمه‌ی این مرحله',
    help: 'راهنما',
    levels: 'مرحله‌ها',
    guide: 'راهنمای یادگیری',
    hint: 'سرنخ',
    solution: 'راه‌حل',
    undo: 'واگردان',
    reset: 'بازنشانی',
    sandboxBtn: 'سندباکس',
    titleLine: (id, name, par) => `${id} · ${name} · انتظار ${par} فرمان`,
    sandboxTitle: 'حالت سندباکس',
    learningGuide: 'راهنمای یادگیری',
    guideAlwaysOn:
      'پنل همیشه‌باز. در مرحله مفاهیم، یادداشت‌های میدانی و چک‌لیست راه‌حل را نشان می‌دهد.',
    startHere: 'از اینجا شروع کنید',
    startHereItems: [
      '**مرحله‌ها** را باز کنید و با Basics → Initialize DVC شروع کنید',
      'برای نقشه‌ی صفحه `help ui` تایپ کنید',
      'برای نتایج یادگیری `curriculum` تایپ کنید',
      'برای مدل‌های ذهنی DVC یا `concepts` تایپ کنید',
    ],
    uiTourMeta:
      'تور UI: بورد/نوار ابزار/ترمینال کوتاه مشخص شد. برای مستندات دوباره Help بزنید.',
    youAreLearning: 'در حال یادگیری',
    fieldNotesTitle: 'در تولید (یادداشت میدانی)',
    typeNext: 'بعدی را تایپ کن',
    checklist: 'چک‌لیست',
    objectiveLabel: 'هدف',
    sandboxTip: 'نکته‌ی سندباکس',
    sandboxTipItems: [
      'بورد: Workspace → Cache → Remote',
      'ترمینال: Tab کلمه‌به‌کلمه کامل می‌کند؛ ↑/↓ تاریخچه',
      'پیشرفت در همین مرورگر ذخیره می‌شود (cookie + localStorage)',
    ],
    noActiveLevel: 'مرحله‌ی فعالی نیست',
    noActiveLevelDetail: 'levels → یک چالش انتخاب کنید تا چک‌لیست اینجا بیاید',
    guideFlashNote:
      'دکمه‌ی **راهنما** در نوار ابزار این پنل را چشمک می‌زند. در تمام ارتفاع صفحه باز می‌ماند.',
    allSolutionMet: 'همه‌ی گام‌های راه‌حل انجام شد.',
    typeNextTitle: 'بعدی را تایپ کن — با هایلایت نارنجی',
    remainingLabel: '○ باقی‌مانده',
    wrongCommandNote:
      'فرمان اشتباه؟ همین‌جا می‌مانید — پیشرفت حفظ می‌شود. تاریخچه: ↑ / ↓',
    inProduction: 'در تولید',
    solvedBanner: (n) => `مرحله حل شد${n !== null ? ` با ${n} فرمان` : ''}.`,
    stateNotes: 'یادداشت وضعیت:',
    pickChallenge: 'یک چالش انتخاب کنید. مراحل حل‌شده در همین مرورگر می‌مانند.',
    howToRead: 'چطور یک ردیف مرحله را بخوانید',
    difficultyLegend:
      '**سختی** — ۱–۵ نقطه‌ی هم‌اندازه؛ پرتر = سخت‌تر (چند ایده‌ی DVC هم‌زمان). همیشه ۵ جایگاه.',
    idealLegend:
      '**تعداد فرمان ایده‌آل** — طول راه‌حل تمیز (هدف گلف، نه سقف سخت).',
    solvedLegend: '**حل شد** — رد کردید؛ عدد بهترین تعداد فرمان شماست.',
    optionalChip: 'اختیاری',
    nowChip: 'اکنون',
    undoMeta: 'واگردان شد.',
    correct: '✓ درست.',
    levelSolvedBanner: '*** مرحله حل شد ***',
    partyMode: '*** حالت جشن *** کانفی می‌آید — دکمه‌های اشتراک پایین.',
    github: 'GitHub',
    githubTitle: 'GitHub — سورس و ایشو',
    support: 'Buy me a coffee',
    supportTitle: 'از ناشر حمایت کنید',
    guidePanel: 'پنل راهنمای یادگیری',
    uiGuideTitle: 'راهنمای UI — هر بخش چه می‌کند',
    close: 'بستن',
    highlightRegions: 'برجسته‌سازی نواحی',
    bestSoFar: (commands, par) =>
      `بهترین تاکنون: ${commands} فرمان · ایده‌آل: ${par}`,
    idealSolution: (par) =>
      `راه‌حل ایده‌آل: ${par} فرمان (کمتر یا مساوی عالی است)`,
    guideAlwaysRight:
      'پنل راهنما همیشه سمت راست باز است (ارتفاع کامل). دکمه‌ی Guide آن را فوکوس می‌کند.',
    difficultyOf: (n) => `سختی ${n} از ۵`,
    solvedLabel: 'حل شد',
    levelsTitle: 'مرحله‌ها',
    aboutTitle: 'درباره LearnDVC',
    aboutPublished: 'انتشار توسط **Ali Sadeghi Aghili**.',
    aboutBoard:
      'بورد **Workspace → Cache → Remote** را نشان می‌دهد — جریان موادی که DVC مدیریت می‌کند.',
    aboutOpenLevels:
      'برای برنامه‌ی آموزشی **مرحله‌ها** را باز کنید، یا `curriculum` / `concepts` / `lesson` تایپ کنید.',
    aboutSupport: 'از ناشر حمایت کنید:',
    back: 'قبلی',
    next: 'بعدی',
    startLevel: 'شروع مرحله',
    solutionTitle: (id) => `راه‌حل — ${id}`,
    solutionCommands: 'فرمان‌هایی که این مرحله را حل می‌کنند:',
    solutionWarn: 'اول بازنشانی می‌شود، بعد راه‌حل اجرا می‌شود.',
    cancel: 'انصراف',
    runSolution: 'اجرای راه‌حل',
    noHintSandbox: 'در سندباکس سرنخی نیست. مرحله‌ها را باز کنید.',
    noGoalSandbox: 'سندباکس هدف ندارد. برای چالش مرحله‌ها را باز کنید.',
    allStepsMet: 'همه‌ی گام‌های راه‌حل انجام شده‌اند.',
    nothingToUndo: 'چیزی برای واگردان نیست.',
    helpLinks: 'GitHub / Buy me a coffee — پیوندهای نوار ابزار به سورس و حمایت',
    curriculumOutcomes: 'بعد از این دوره باید بتوانید:',
    progressLevels: (solved, total) => `پیشرفت: ${solved}/${total} مرحله حل شد.`,
    fieldGlossary: 'واژه‌نامه‌ی میدانی: `concepts` (یا `concepts pointer`) تایپ کنید.',
    quizAnswerUsage: 'با quiz A | quiz B | quiz C پاسخ دهید',
    quizFinished:
      'آزمون تمام شد. برای نتایج `curriculum` تایپ کنید، یا `quiz` برای شروع دوباره.',
    quizHeader: (i, n) => `آزمون ${i}/${n}`,
    progressKept: (cmd) => `پیشرفت حفظ شد. هنوز روی: ${cmd}`,
    commandsUsed: (n, par) => `فرمان‌های مصرف‌شده: ${n} · ایده‌آل: ${par}`,
    idealCommands: (par) => `ایده‌آل: ${par} فرمان`,
    nextMeta: (cmd) => `بعدی: ${cmd}`,
    continueGoal: 'هدف مرحله را ادامه دهید.',
    idealForLevel: (par) => `ایده‌آل برای این مرحله: ${par} فرمان`,
    idealForLevelShort: (par) => `— روی یا زیر ایده‌آل (${par}). اجرای تمیز.`,
    cheers: [
      'گرفتید. این مفهوم حالا مال شماست.',
      'بوم — یک مهارت DVC دیگر بانک شد.',
      'همین را لایقش بودید. به اشتراک بگذارید.',
      'خط لوله‌ی یادگیری: مرحله حل شد.',
      'pointer کامیت شد. اعتماد بالا.',
    ],
    shareTitle: 'چه چیزی یاد گرفتید را به اشتراک بگذارید (با برنامه‌ی آموزشی شما)',
    styleList: 'فهرست استایل برای پست:',
    shareGroupLabel: 'اشتراک در شبکه‌های اجتماعی',
    linkedin: 'LinkedIn',
    xTwitter: 'X / Twitter',
    facebook: 'Facebook',
    copyPost: 'کپی پست',
    baskInIt: 'لذت ببر',
    celebrateOn: (id) => `جشن بعدی: ${id}`,
    browseLevels: 'مرور مرحله‌ها',
    levelComplete: 'مرحله کامل شد',
    copyOk: 'پست کامل کپی شد — هر جا جایگذاری کنید.',
    copyFail: 'کپی نشد — متن اشتراک را دستی انتخاب کنید.',
    shareOpened:
      'پنجره‌ی اشتراک باز شد — اگر جا خالی بود متن پست را دستی کپی کنید.',
    shareCopied:
      'پست کپی شد. در جای اشتراک جایگذاری کنید (LinkedIn/Facebook متن خودکار را می‌بندند).',
    unknownLevel: (id) => `مرحله‌ی ناشناخته '${id}'`,
    levelMeta: (id, name) => `مرحله ${id} — ${name}`,
    lessonReplayed: 'اسلایدهای درس برای این مرحله تکرار شد.',
    sandboxMode: 'حالت سندباکس.',
    resetLevel: (id) => `مرحله ${id} بازنشانی شد.`,
    resetSandbox: 'سندباکس بازنشانی شد.',
    noSolutionSandbox: 'سندباکس راه‌حل ندارد. مرحله‌ها را باز کنید.',
    nextCelebration: (id, name) => `جشن بعدی: **${id}** — ${name}`,
    lastInPack: 'آخرین مرحله‌ی این بسته. برای ادامه **مرحله‌ها** را باز کنید.',
    solvedCountLabel: (n, total) =>
      `${n} / ${total} مرحله حل شد · پیشرفت در همین مرورگر ذخیره شد`,
    learnMoreList: 'چه چیزی تاکنون یاد گرفته‌ام:',
    solveMoreLevels: 'مرحله‌ی بیشتری حل کنید تا این فهرست پر شود',
    tabFillsWord: 'Tab یک کلمه در هر مرحله کامل می‌کند',
    nextPrompt: 'بعدی',
    nextPlaceholder: (hint) => `بعدی: ${hint}  (Tab قدم‌به‌قدم)`,
    termAriaLabel:
      'ورودی فرمان DVC. Tab یک کلمه کامل می‌کند. فلش بالا/پایین تاریخچه را مرور می‌کند.',
    workspaceEmpty: 'فضای کاری خالی است — `dvc init` اجرا کنید یا مرحله بارگذاری کنید.',
    cacheEmpty: 'cache خالی است. `dvc add` اشیا را اینجا می‌گذارد.',
    remoteEmpty: 'remote نیست. `dvc remote add -d <name> <url>`',
    remoteEmptyCmd: 'remote نیست. `dvc remote add -d <name> <url>`',
    remoteNoObjects: 'هنوز شیئی آپلود نشده — `dvc push`.',
    flowCaption: 'workspace ⇄ cache ⇄ remote',
    flowArrow:
      'جریان مواد: workspace → cache → remote (push) · remote → cache → workspace (pull)',
    workspaceHint: 'فایل‌ها روی دیسک · pointer · کد',
    workspaceWhy:
      'چرا مهم است: این چیزی است که ابزارهای شما واقعاً می‌خوانند. داده‌ی ترک‌شده اینجا به‌صورت فایل پیوندی می‌ماند — گیت هرگز بایت‌های سنگین را نمی‌بیند.',
    cacheHint: '.dvc/cache — اشیای محتوانشان',
    cacheWhy:
      'چرا مهم است: انبار محلی نسخه‌های داده (با md5). dvc add/commit بایت اینجا می‌گذارد؛ checkout/pull برمی‌گرداند.',
    remoteHint: 'فضای مشترک برای داده‌ی سنگین',
    remoteWhy:
      'چرا مهم است: هم‌تیمی‌ها و CI همین‌جا بایت‌های یکسان می‌گیرند. remote خالی یعنی داده با git push تنها سفر نمی‌کند.',
    pipelineTitle: 'خط لوله · dvc.yaml',
    language: 'زبان',
    workspace: 'فضای کاری',
    cache: 'کش',
    remote: 'ریموت',
    coachAllDone:
      'همه‌ی گام‌های هدف انجام شده — باید تمام باشد. برای تأیید `show goal` تایپ کنید.',
    coachNextSteps: (n, id) => `گام‌های بعدی (${n} باقی)${id ? ` برای ${id}` : ''}:`,
    coachFooter: 'برای تکرار این فهرست `steps` · `hint` · `show goal` تایپ کنید',
    shareLinkedInHead:
      'واقعاً خوشحالم — تازه Data Version Control کاربردی را در LearnDVC یاد گرفتم!',
    shareStarting: 'سفر DVC من شروع شد.',
    shareLatestWin: (name, id) => `آخرین موفقیت: ${name} (${id})`,
    shareCommands: (n, par) => ` — ${n} فرمان (ایده‌آل ${par})`,
    shareLearnedSoFar: 'چه چیزی تاکنون یاد گرفته‌ام:',
    shareProgress: (solved, total) => `پیشرفت: ${solved}/${total} مرحله.`,
    shareCta:
      'اگر با داده یا مدل ML کار می‌کنید، امتحان کنید — رایگان، بدون ورود:',
    shareXHead: (solved, total) =>
      `واقعاً خوشحالم — دارم DVC را در LearnDVC یاد می‌گیرم (${solved}/${total} مرحله).`,
    shareXFirst: 'سندباکس عملی.',
    shareHandson: 'سندباکس عملی.',
    titleLearnDvc: 'LearnDVC — آموزش Data Version Control',
    welcomeTitle: 'LearnDVC',
    welcomeIntro: 'آموزش تعاملی **Data Version Control** — سندباکس + مراحل هدایت‌شده.',
    welcomeBoard:
      'بورد **Workspace → Cache → Remote** را نشان می‌دهد. این جریان موادی است که DVC مدیریت می‌کند.',
    welcomeTracks:
      '- مبانی: `init`, `add`, pointer, status\n- Remote: `remote add`, `push`, `pull`\n- Pipeline: `stage add`, `repro`, params/metrics\n- آزمایش: `exp run`, `exp show`, `exp apply`',
    welcomeMeta:
      'متا: `levels`, `curriculum`, `concepts`, `lesson`, `hint`, `steps`, `show solution`.',
    welcomeLevelsCount: (n) =>
      `**${n}** مرحله گنجانده شده. برای شروع مرحله‌ها را باز کنید، یا در سندباکس بمانید.`,
    welcomeWhat: '**LearnDVC چیست؟**',
    welcomeWhatBody:
      'یک آزمایشگاه مرورگری برای DVC: فرمان‌های واقعی‌شکل `dvc` / `git` تایپ می‌کنید و pointer، اشیای cache و remoteها را می‌بینید. برای هسته‌ی آموزش نصب لازم نیست.',
    welcomePublisher: '**ناشر**',
    welcomePublisherBody:
      'انتشار و نگهداری توسط **Ali Sadeghi Aghili** — برنامه‌نویس، مهندس/دانشمند داده، مهندس ML. [linktr.ee/aliaghili](https://linktr.ee/aliaghili)',
    welcomeGithub: '- [GitHub — سورس و ایشو](https://github.com/alisadeghiaghili/learn-dvc)',
    welcomeCoffee: 'Buy Me a Coffee (از ناشر حمایت می‌کند):',
    welcomeToolbar:
      'نوار ابزار: **درس** (تکرار مقدمه) · **GitHub** · **Buy me a coffee**.',
    sandbox: 'سندباکس',
    openLevels: 'باز کردن مرحله‌ها',
    useIt: 'چطور استفاده کنید:',
    uiHelpMapTitle: 'نقشه‌ی صفحه — هر ناحیه‌ی UI چه می‌کند',
    uiHelpCommands: 'فرمان‌ها: `help ui` · `help` · `curriculum` · `concepts` · `levels`',
    quiz: [
      {
        q: 'بعد از dvc add در ریپوی ML گیت چه چیزی را ذخیره می‌کند؟',
        a: ['بایت‌های خام دیتاست', 'pointer (.dvc: md5) + قواعد ignore', 'فقط وزنه‌های مدل'],
        correct: 1,
      },
      {
        q: 'dvc.lock چیست؟',
        a: [
          'فایل رمز عبور',
          'رسید اجرا (هش/پارامتر آخرین repro)',
          'آدرس remote',
        ],
        correct: 1,
      },
      {
        q: 'بعد از تغییر پارامتر و برگرداندن مقدار قبلی، repro باید…',
        a: ['همیشه دوباره آموزش ببیند', 'به run cache بزند و کار را بپرد', 'cache را پاک کند'],
        correct: 1,
      },
      {
        q: 'DVCLive log_metric چه چیزی را تغذیه می‌کند؟',
        a: ['GitHub stars', 'metrics.json / exp comparison', 'SSH keys'],
        correct: 1,
      },
      {
        q: 'بهترین اسکلت CI برای پروژه‌ی DVC؟',
        a: [
          'فقط git clone',
          'git clone + dvc pull + dvc repro (+ cml comment)',
          'pip install dvc && exit',
        ],
        correct: 1,
      },
      {
        q: 'Git-LFS در برابر DVC در یک جمله؟',
        a: [
          'یکسان',
          'LFS = blob بزرگ در remote گیت؛ DVC = pointer در گیت + remote شیء + pipeline/exp',
          'LFS برای پایتون است',
        ],
        correct: 1,
      },
    ],
    helpSections: [
      {
        id: 'level-title',
        selector: '.level-title',
        title: 'نوار بافت فعلی',
        what: 'حالت سندباکس یا id/نام مرحله‌ی فعال و **تعداد فرمان ایده‌آل** (راه‌حل تمیز چند فرمان می‌خواهد) را نشان می‌دهد.',
        how: 'برای تأیید مرحله بخوانید. «ایده‌آل: ۳ فرمان» هدف گلف است، نه سقف سخت.',
      },
      {
        id: 'toolbar',
        selector: '.toolbar-actions',
        title: 'دکمه‌های نوار ابزار',
        what: [
          '**مرحله‌ها** — مرورگر چالش‌ها. ردیف‌ها **نقطه‌ی سختی** (۱–۵) و **تعداد فرمان ایده‌آل** را نشان می‌دهند.',
          '**درس** — تکرار اسلایدهای مقدمه‌ی مرحله (یا درباره در سندباکس).',
          '**راهنما** — چشمک/اسکرول پنل راهنمای همیشه‌باز.',
          '**سرنخ** / **راه‌حل** / **واگردان** / **بازنشانی** / **سندباکس**.',
          '**راهنما** — این نقشه‌ی UI (`help ui`).',
          '**GitHub** — ریپوی سورس و ایشوها.',
          '**Buy me a coffee** — حمایت از ناشر (Ali Sadeghi Aghili).',
        ].join('\n'),
        how: 'درس همیشه در دسترس است اگر اسلایدهای آموزشی را فراموش کردید. پیوندهای خارجی در تب جدید باز می‌شوند.',
      },
      {
        id: 'links',
        selector: 'a.tb-link',
        title: 'پیوندهای GitHub و حمایت',
        what: 'خانه‌ی متن‌باز و صفحه‌ی Buy Me a Coffee ناشر.',
        how: 'https://github.com/alisadeghiaghili/learn-dvc · https://www.buymeacoffee.com/alisadeghil',
      },
      {
        id: 'dock',
        selector: '.dock',
        title: 'پنل راهنمای راست (همیشه روشن)',
        what: [
          'ستون تمام‌ارتفاع سمت راست اپ.',
          '**در حال یادگیری** — مفاهیم این مرحله.',
          '**در تولید (یادداشت میدانی)** — مهندسان با این مهارت چه می‌کنند.',
          '**بعدی را تایپ کن** — اولین فرمان رسمی تمام‌نشده.',
          '**چک‌لیست** — هر فرمان راه‌حل؛ نئون نارنجی = گام فعلی.',
          'سبز ✓ = انجام شد (بعد از خطا می‌ماند مگر اثر واگردان شود).',
        ].join('\n'),
        how: 'هنگام تایپ جلوی چشم نگه دارید. روی دسکتاپ جمع نمی‌شود؛ در صفحه‌ی باریک زیر بورد dock می‌شود.',
      },
      {
        id: 'status-pills',
        selector: '.status-bar',
        title: 'قرص‌های وضعیت (بالای بورد)',
        what: 'سلامت سریع: DVC راه‌اندازی شده؟ تعداد remote، اشیای cache، اشیای remote، آزمایش.',
        how: 'بعد از push اشیای remote باید بالا برود. بعد از add cache باید بالا برود.',
      },
      {
        id: 'workspace-zone',
        selector: '.zone.workspace',
        title: 'ناحیه‌ی فضای کاری',
        what: 'فایل‌های روی دیسک در پروژه‌ی شبیه‌سازی‌شده: داده‌ی خام، کد، پارامتر، فایل pointer `.dvc`، `dvc.yaml`.',
        how: [
          'چیپ‌ها وضعیت را توضیح می‌دهند:',
          '• **.dvc pointer** — DVC این مسیر را ترک می‌کند (گیت فقط فایل `.dvc` را)',
          '• **gitignored** — داده‌ی خام عمداً از گیت خارج است',
          '• **dirty** — بایت ≠ md5 pointer (`dvc status`)',
          '• **git staged** — آماده‌ی `git commit`',
          '• **missing** — فایل نیست (pull/checkout لازم)',
        ].join('\n'),
      },
      {
        id: 'cache-zone',
        selector: '.zone.cache',
        title: 'ناحیه‌ی cache',
        what: 'اشیای محلی `.dvc/cache` — کپی‌های محتوانشان داده‌ی ترک‌شده (md5).',
        how: '`dvc add`/`commit` پر می‌کند. `dvc checkout`/`pull` می‌خواند. بایت یکسان = یک شیء.',
      },
      {
        id: 'remote-zone',
        selector: '.zone.remote',
        title: 'ناحیه‌ی remote',
        what: 'remoteهای پیکربندی‌شده‌ی DVC + اشیای آپلودشده با `dvc push`.',
        how: 'اشیای remote خالی + cache پر ⇒ هنوز باید push کنید تا هم‌تیمی‌ها pull کنند.',
      },
      {
        id: 'flow-arrow',
        selector: '.flow-arrow',
        title: 'عنوان جریان مواد',
        what: 'یادآوری تک‌خطی: workspace ⇄ cache ⇄ remote.',
        how: 'هنگام دیباگ بپرسید «بایت‌ها کجایند؟» — در همین جهت.',
      },
      {
        id: 'dag',
        selector: '.dag',
        title: 'نوار خط لوله',
        what: 'stageهای `dvc.yaml` با cmd/outs. سبز/up = جاری؛ هشدار = کهنه/نیاز به repro.',
        how: '`dvc dag`, `dvc repro`. خلاصه‌ی params/metrics وقتی تولید شد می‌آید.',
      },
      {
        id: 'term-log',
        selector: '.term-log',
        title: 'گزارش ترمینال',
        what: 'پژواک فرمان، خروجی‌ها، خطاها، خطوط مربی، بلوک‌های Why، متن جشن.',
        how: 'بعد از فرمان‌های مهم DVC دنبال `── Why: … ──` بگردید.',
      },
      {
        id: 'term-hint',
        selector: '.term-hint',
        title: 'نوار سرنخ بالای ورودی',
        what: 'فرمان رسمی بعدی و گزینه‌های چرخه‌ی Tab را نشان می‌دهد.',
        how: 'چیپ نارنجی `اکنون` در dock با همین گام «بعدی» می‌خواند.',
      },
      {
        id: 'term-ghost',
        selector: '.term-input-wrap',
        title: 'پرامپت + تکمیل ghost',
        what: [
          'پرامپت `dvc $`.',
          'Placeholder: فرمان بعدی وقتی خالی است (یک سرنخ).',
          'Ghost: باقی‌مانده‌ی **کلمه‌ی فعلی** هنگام تایپ.',
          'Tab: تکمیل **یک کلمه** (مانند bash). ↑/↓ تاریخچه. Esc ورودی را پاک می‌کند.',
        ].join('\n'),
        how: '`dvc ` تایپ کنید و بعد Tab را برای چرخه‌ی کلمه‌های زیرفرمان بزنید.',
      },
    ],
  },
  levels: faLevels,
};
