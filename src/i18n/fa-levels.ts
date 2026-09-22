/** Persian level teaching copy. Never includes hint/solution/commands. */

import type { LevelCopy } from './types';

export const faLevels: Record<string, LevelCopy> = {
  'basics-1': {
    seriesTitle: 'مبانی',
    name: 'راه‌اندازی DVC',
    objective:
      'DVC را داخل یک مخزن Git مقداردهی کنید و متادیتای DVC را commit کنید تا کل تیم یک setup مشترک داشته باشد.',
    learning: [
      'DVC مکمل Git برای داده است؛ جایگزین Git نیست',
      'dvc init فقط متادیتای .dvc/ می‌سازد — هنوز هیچ داده‌ای version نشده',
      'Git همان متادیتا را version می‌کند؛ هم‌تیمی‌ها همان workflow را clone می‌کنند',
    ],
    fieldNotes: [
      'بوت استراپ ریپو: git init → dvc init → بلافاصله commit کردن .dvc',
      'کانفیگ remote را در .dvc/config نگه دارید تا cloneها همان data store را به ارث ببرند',
      'اگر .dvc commit نشود، هر نفر workflow داده‌ی متفاوتی دارد',
    ],
    startDialog: [
      {
        title: 'چرا Git به‌تنهایی برای داده‌ی ML شکست می‌خورد',
        markdown:
          'Git هر نسخه‌ی فایل را در `.git` نگه می‌دارد. برای سورس‌کد خوب است.\n\nبرای **دیتاست و مدل** خراب می‌شود:\n\n- ۱۰ گیگ در تاریخچه × نسخه‌های زیاد = clone غیرقابل استفاده\n- diff باینری کند و ناخواناست\n- ریویور داده‌ی آموزشی را در ریپوی کد نمی‌خواهد\n\n**DVC** مسئله را می‌شکند: Git نگه‌دارنده‌ی *pointer* است؛ cache/remote نگه‌دارنده‌ی *بایت‌ها*.',
      },
      {
        title: '`dvc init` دقیقاً چه می‌کند',
        markdown:
          'یک پوشه‌ی `.dvc/` می‌سازد با:\n\n- `config` — محل remoteها و cache برای این پروژه\n- `.gitignore` — تا cache داخلی DVC ناخواسته commit نشود\n\n**داده آپلود نمی‌کند.** شما data-versioning را برای پروژه *روشن* می‌کنید.\n\nمدل ذهنی: `git init` برای کد ≈ `dvc init` برای workflow داده.',
      },
      {
        title: 'چرا باید `.dvc/` را با Git commit کنید',
        markdown:
          'پوشه‌ی `.dvc/` کوچک و مخصوص تیم است.\n\n```\ngit add .dvc\ngit commit -m "Initialize DVC"\n```\n\nبدون این، clone شماره‌ی ۲ کد دارد ولی **پروژه‌ی DVC ندارد** — `dvc pull` چیدمان cache شما را نمی‌شناسد.\n\nبه بورد نگاه کنید: Workspace می‌تواند «initialized» باشد در حالی که commit راه‌اندازی در Git هنوز نیست.',
      },
    ],
  },
  'basics-2': {
    seriesTitle: 'مبانی',
    name: 'ترک کردن یک دیتاست',
    objective:
      '`data/data.xml` را طوری ترک کنید که محتوا در cache باشد، Git فقط pointer را ببیند و مسیر خام gitignore شود.',
    learning: [
      'dvc add = هش + شیء cache + pointer فایل .dvc + gitignore',
      'Git فقط pointer (md5) را commit می‌کند، نه فایل بزرگ را',
      'بورد: فایل Workspace به pointer تبدیل می‌شود و شیء cache ظاهر می‌شود',
    ],
    fieldNotes: [
      'دیتاست/مدل/آرتیفکتی را ترک کنید که بازسازی‌اش ارزان نیست',
      'ریویوی PR باید diff های pointer (md5) را بخواند، نه مگابایت CSV',
      'CI داده را با DVC می‌کشد؛ ایمیج‌ها سبک می‌مانند',
    ],
    startDialog: [
      {
        title: '`dvc add` چه می‌کند',
        markdown:
          'چهار اثر در یک فرمان:\n\n1. هش (md5) روی محتوای فایل\n2. بایت‌ها در `.dvc/cache`\n3. فایل pointer کوچک `.dvc` (YAML)\n4. مسیر خام در `.gitignore`\n\nبعد از آن Git فقط pointer را می‌بیند.',
      },
    ],
  },
  'basics-3': {
    seriesTitle: 'مبانی',
    name: 'داده‌ی dirty و status',
    objective: 'داده را تغییر دهید، `dvc status` بخوانید و با `dvc commit` وضعیت جدید را ثبت کنید.',
    learning: [
      'dvc status فضای کاری را با pointer و cache مقایسه می‌کند',
      'modified یعنی بایت‌ها با md5 داخل .dvc نمی‌خواند',
      'dvc commit نسخه‌ی جدید داده را می‌پذیرد',
    ],
    fieldNotes: [
      'داده‌ی dirty بعد از feature engineering عادی است',
      'کورکورانه commit نکنید — اول status، بعد commit یا checkout',
    ],
    startDialog: [
      {
        title: 'dirty خطا نیست',
        markdown:
          'مثل `git status` برای داده: یک تغییر commit‌نشده دارید.\n\nپذیرش: `dvc commit`\nدور ریختن: `dvc checkout`',
      },
    ],
  },
  'remote-1': {
    seriesTitle: 'Remoteها',
    name: 'پیکربندی remote',
    objective:
      'یک remote برای DVC بسازید و آن را default کنید تا push/pull بداند اشیا کجا می‌روند.',
    learning: [
      'remote داده‌ی DVC با remote گیت فرق دارد',
      '-d مسیر default را مشخص می‌کند',
      'کانفیگ در .dvc/config زندگی می‌کند و به اشتراک می‌رود',
    ],
    fieldNotes: [
      'S3/GCS/SSH/local — مهم store شیء‌محور است',
      'آدرس remote داخل ریپو؛ credentials هرگز',
    ],
    startDialog: [
      {
        title: 'دو remote، دو وظیفه',
        markdown:
          '**Git remote** = کد + pointer.\n**DVC remote** = اشیای سنگین داده.\n\n`dvc remote add -d myremote /tmp/dvcstore`',
      },
    ],
  },
  'remote-2': {
    seriesTitle: 'Remoteها',
    name: 'push داده به remote',
    objective: 'داده‌ی ترک‌شده را با `dvc push` آپلود کنید تا تیم به آن دسترسی داشته باشد.',
    learning: [
      'dvc push فقط اشیای جامانده‌ی cache را می‌فرستد',
      'هم‌تیمی‌ها به همان commit گیت + pull نیاز دارند',
    ],
    fieldNotes: [
      'بعد از هر وضعیت داده‌ای که دیگران لازم دارند push کنید',
      'CI می‌کشد، به‌جای پختن دیتاست در ایمیج',
    ],
    startDialog: [
      {
        title: 'push بایت می‌فرستد، نه گیت',
        markdown: 'Git push = pointer.\nDVC push = اشیا در data store.',
      },
    ],
  },
  'remote-3': {
    seriesTitle: 'Remoteها',
    name: 'ماشین تازه: pull داده',
    objective: 'روی یک ماشین تازه داده را با `dvc pull` مادی کنید، بدون آن‌که بایت‌ها در تاریخچه‌ی گیت باشند.',
    learning: [
      'git clone فقط pointer می‌آورد',
      'dvc pull داده را می‌آورد',
      'بعد از آن Workspace و pointer هم‌راستا هستند',
    ],
    fieldNotes: [
      'آن‌بوردینگ چند دقیقه: clone + pull',
      'گم شدن لپ‌تاپ یعنی از دست رفتن داده نیست، اگر remote پر باشد',
    ],
    startDialog: [
      {
        title: 'کلون کوچک، داده بزرگ',
        markdown: '```\ngit clone …\ndvc pull\n```\n\nتمام. بدون دانلود ۴۰ گیگ از تاریخچه‌ی گیت.',
      },
    ],
  },
  'pipe-1': {
    seriesTitle: 'Pipelineها',
    name: 'تعریف stage',
    objective:
      'یک stage با `dvc stage add` بسازید (deps, outs, cmd) تا بازتولیدپذیری قراردادی شود.',
    learning: [
      'stageها در dvc.yaml زندگی می‌کنند',
      'deps با تغییر، stage را invalidate می‌کنند',
      'outs بعد از اجرای موفق ترک می‌شوند',
    ],
    fieldNotes: [
      'هر مرحله‌ی گران آموزش لایق یک stage است',
      'کد در گیت؛ I/O از مسیر DVC',
    ],
    startDialog: [
      {
        title: 'dvc.yaml یک قرارداد است',
        markdown:
          '```\ndvc stage add -n prepare \\\n  -d data/data.xml -o data/prepared.csv \\\n  python src/prepare.py\n```',
      },
    ],
  },
  'pipe-2': {
    seriesTitle: 'Pipelineها',
    name: 'stage آموزش + repro',
    objective: 'مراحل prepare و train را وصل کنید و با `dvc repro` اجرا کنید.',
    learning: [
      'dvc repro فقط stageهای dirty را به‌ترتیب توپولوژیک اجرا می‌کند',
      'dvc.lock رسید اجراست',
    ],
    fieldNotes: ['بعد از هر تغییر مهم repro کنید', 'lock را دستی ویرایش نکنید'],
    startDialog: [
      {
        title: 'سیستم build برای ML',
        markdown: 'فقط چیزی که عوض شده دوباره اجرا می‌شود.\n\n`dvc repro`',
      },
    ],
  },
  'pipe-3': {
    seriesTitle: 'Pipelineها',
    name: 'تغییر پارامتر → repro',
    objective: 'هایپرپارامتر را در `params.yaml` عوض کنید، repro بزنید و metrics را مقایسه کنید.',
    learning: [
      'params.yaml برای انسان قابل ریویوست',
      '-p پارامترها را به stage گره می‌زند',
      'metrics نشان می‌دهد اجرا چه آورد',
    ],
    fieldNotes: ['تغییر پارامتر در آزمایش عادی است', 'قبل از merge حتماً diff'],
    startDialog: [
      {
        title: 'پارامترها first-class هستند',
        markdown: '`lr` را در `params.yaml` عوض کنید، بعد `dvc repro` و `dvc metrics show`.',
      },
    ],
  },
  'exp-1': {
    seriesTitle: 'آزمایش‌ها',
    name: 'اجرای یک آزمایش',
    objective: 'اولین آزمایش را با `dvc exp run` روی pipeline موجود اجرا کنید.',
    learning: ['exp run بدون شلوغی شاخه', 'پارامتر و metrics ثبت می‌شوند'],
    fieldNotes: ['آزمایش جای شاخه‌ی وحشی را می‌گیرد', 'همیشه با exp show مقایسه کنید'],
    startDialog: [
      {
        title: 'آزمایش بدون انفجار شاخه',
        markdown: '`dvc exp run` — pipeline در بافت آزمایش.',
      },
    ],
  },
  'exp-2': {
    seriesTitle: 'آزمایش‌ها',
    name: 'جست‌وجوی پارامتر',
    objective: 'با `-S` پارامتر را override کنید و با `dvc exp show` مقایسه کنید.',
    learning: ['-S مقدار پارامتر را برای همان اجرا می‌نویسد', 'exp show جدول params در برابر metrics'],
    fieldNotes: ['sweep الگوی استاندارد در دوره‌ها و تولید است'],
    startDialog: [
      {
        title: 'به‌جای حدس، sweep',
        markdown: '`dvc exp run -S lr=0.05` و دوستان، بعد `dvc exp show`.',
      },
    ],
  },
  'exp-3': {
    seriesTitle: 'آزمایش‌ها',
    name: 'اعمال برنده',
    objective: 'با `dvc exp apply` بهترین پیکربندی آزمایش را به Workspace بیاورید.',
    learning: ['exp apply پارامتر/metrics برنده را promote می‌کند', 'بعد آرتیفکت‌ها را repro کنید'],
    fieldNotes: ['برده baseline جدید می‌شوند — در نوت کپی نکنید'],
    startDialog: [
      {
        title: 'از اجرا تا baseline',
        markdown: '`dvc exp apply exp-xxxxxx` — بدون تایپ دوباره‌ی مقادیر.',
      },
    ],
  },
  'field-1': {
    seriesTitle: 'تمرین میدانی',
    name: 'بازگرداندن نسخه‌ی قدیمی داده',
    objective:
      'با `git checkout` و `dvc checkout` یک نسخه‌ی قدیمی داده برگردانید — تمرین rollback تولید.',
    learning: ['عوض کردن pointer ارزان است', 'dvc checkout بایت‌ها را materialize می‌کند'],
    fieldNotes: ['rollback را تمرین کنید، قبل از ساعت ۲ بامداد'],
    startDialog: [
      {
        title: 'rollback در دو فرمان',
        markdown: '```\ngit checkout HEAD~1 data/data.xml.dvc\ndvc checkout\n```',
      },
    ],
  },
  'field-2': {
    seriesTitle: 'تمرین میدانی',
    name: 'داده عوض شد → pipeline کهنه',
    objective: 'بعد از تغییر داده، pipeline را با `dvc repro` تازه کنید.',
    learning: ['تغییر داده stageهای وابسته را invalidate می‌کند', 'repro جبران می‌کند'],
    fieldNotes: ['دریفت داده روزمره است — پاسخ repro است'],
    startDialog: [
      {
        title: 'وقتی دنیا می‌چرخد',
        markdown: 'داده عوض می‌شود → stageها dirty → `dvc repro`.',
      },
    ],
  },
  'field-3': {
    seriesTitle: 'تمرین میدانی',
    name: 'promote برنده سپس repro',
    objective: 'برنده‌ی آزمایش را اعمال و آرتیفکت‌ها را دوباره بسازید.',
    learning: ['apply + repro = baseline جدید'],
    fieldNotes: ['مسیر تولید بعد از یک sweep خوب'],
    startDialog: [
      {
        title: 'promote و بساز',
        markdown: 'اول `dvc exp apply`، بعد `dvc repro`.',
      },
    ],
  },
  'capstone-1': {
    seriesTitle: 'کپ‌استون',
    name: 'تمرین end-to-end',
    objective: 'از داده‌ی dirty تا وضعیت مشترک: کل workflow DVC را در یک سناریو رد کنید.',
    learning: ['add/commit/push/pull به‌عنوان یک داستان', 'pipeline و exp در بافت'],
    fieldNotes: ['این روز عادی در تیم ML است'],
    startDialog: [
      {
        title: 'همه‌چیز کنار هم',
        markdown: 'وقت آن است که تکه‌ها را به یک لایه‌ی تولید تبدیل کنید.',
      },
    ],
  },
  'field-5': {
    seriesTitle: 'تمرین میدانی',
    name: 'registry / import',
    objective: 'فایل را از پروژه‌ی DVC دیگر بگیرید یا import کنید و version کنید.',
    learning: ['dvc get کپی می‌کند', 'dvc import وابستگی را version می‌کند'],
    fieldNotes: ['الگوی feature store و model registry'],
    startDialog: [
      {
        title: 'get در برابر import',
        markdown: '`dvc get` = کپی. `dvc import` = وابستگی version‌شده (می‌نویسد .dvc).',
      },
    ],
  },
  'field-6': {
    seriesTitle: 'تمرین میدانی',
    name: 'حادثه: کدام داده؟',
    objective: 'به پرسش حادثه پاسخ دهید: کدام دیتاست این مدل را ساخته؟',
    learning: [
      'commit گیت → md5 pointer → cache/remote',
      'اگر pointerها commit نشده باشند، پاسخ وجود ندارد',
    ],
    fieldNotes: ['postmortem به این زنجیره نیاز دارد — از قبل تمرین کنید'],
    startDialog: [
      {
        title: 'ساعت ۳ بامداد در حادثه',
        markdown: '«کدام داده این مدل را ساخت؟» — زنجیره باید بایستد.',
      },
    ],
  },
  'meta-1': {
    seriesTitle: 'فایل‌های متا',
    name: 'خواندن dvc.yaml و dvc.lock',
    objective: 'dvc.yaml را به‌عنوان قرارداد و dvc.lock را به‌عنوان رسید اجرا تمایز دهید.',
    learning: ['yaml = تعریف', 'lock = رسید (md5/پارامترها)'],
    fieldNotes: ['lock را دستی ویرایش نکنید — همیشه repro'],
    startDialog: [
      {
        title: 'قرارداد و رسید',
        markdown: '`cat dvc.yaml` و `cat dvc.lock` — تعریف در برابر اجرا.',
      },
    ],
  },
  'meta-2': {
    seriesTitle: 'فایل‌های متا',
    name: '.dvcignore',
    objective: 'مسیرها را با `.dvcignore` حذف کنید تا DVC روی درخت‌های بزرگ سریع بماند.',
    learning: ['.dvcignore با .gitignore فرق دارد', 'فقط DVC این مسیرها را می‌پرد'],
    fieldNotes: ['پوشه‌های scratch و داده‌ی موقت را بیرون نگه دارید'],
    startDialog: [
      {
        title: 'چه چیزی را DVC نادیده می‌گیرد',
        markdown: '`.dvcignore` با الگوی مسیر — سرعت روی درخت‌های بزرگ.',
      },
    ],
  },
  'meta-3': {
    seriesTitle: 'فایل‌های متا',
    name: 'update + نظر CML',
    objective: 'importها را با `dvc update` تازه کنید و بازخورد CI را با CML به PR بیاورید.',
    learning: ['update نسخه‌ی upstream را می‌گیرد', 'CML metrics/plot را روی PR می‌گذارد'],
    fieldNotes: ['اسکلت CI: clone → pull → repro → cml comment'],
    startDialog: [
      {
        title: 'تازه نگه دار، نشان بده',
        markdown: '`dvc update` و نظرهای CML در PR.',
      },
    ],
  },
  'cmp-1': {
    seriesTitle: 'مقایسه',
    name: 'params / metrics diff',
    objective: 'Workspace را با HEAD با params/metrics diff مقایسه کنید.',
    learning: ['diff = نمای ریویو برای تغییرات ML'],
    fieldNotes: ['قبل از merge حتماً diff بخوانید'],
    startDialog: [
      {
        title: 'ریویو، نه حدس',
        markdown: '`dvc params diff` · `dvc metrics diff`',
      },
    ],
  },
  'cmp-2': {
    seriesTitle: 'مقایسه',
    name: 'exp diff بعد از پارامتر تو در تو',
    objective: 'آزمایش‌ها را بعد از اجرای پارامتر تو در تو با `dvc exp diff` مقایسه کنید.',
    learning: ['exp diff دریفت پارامتر و metrics را نشان می‌دهد'],
    fieldNotes: ['کلیدهای تو در تو مثل train.lr را جدی بگیرید'],
    startDialog: [
      {
        title: 'پارامتر تو در تو',
        markdown: 'دو اجرا، یک مسیر `train.n_est` — بعد `dvc exp diff`.',
      },
    ],
  },
  'reg-1': {
    seriesTitle: 'رجیستری',
    name: 'import داده',
    objective: 'یک دیتاست را از registry/URL import و version کنید.',
    learning: ['import-url منبع خارجی را ترک می‌کند'],
    fieldNotes: ['داده‌ی خارجی همان انضباط pointer را می‌خواهد'],
    startDialog: [
      {
        title: 'منابع خارجی',
        markdown: '`dvc import-url` — URL خارجی به‌عنوان داده‌ی ترک‌شده.',
      },
    ],
  },
  'reg-2': {
    seriesTitle: 'رجیستری',
    name: 'promote مدل',
    objective: 'مدل را آرتیفکت بدانید و با git tag + pull promote کنید.',
    learning: ['الگوی registry: tag + مدل کشیده‌شده'],
    fieldNotes: ['وزنه را ایمیل نکنید — وضعیت را pull کنید'],
    startDialog: [
      {
        title: 'promote به‌جای ایمیل',
        markdown: 'git tag + `dvc pull` به‌جای WeTransfer.',
      },
    ],
  },
  'camp-1': {
    seriesTitle: 'DVCLive',
    name: 'ابزارک‌گذاری با DVCLive',
    objective: 'آموزش را با DVCLive ابزارک‌گذاری کنید: پارامتر، metrics، plot و گزارش خودکار.',
    learning: [
      'Live / log_metric / log_plot / make_report',
      'اسکالر → metrics، سری → plot',
    ],
    fieldNotes: ['پل از نوت‌بوک به exp show/plots'],
    startDialog: [
      {
        title: 'DVCLive',
        markdown: '```python\nfrom dvclive import Live\nwith Live() as live:\n    live.log_metric("acc", 0.92)\n```',
      },
    ],
  },
  'camp-2': {
    seriesTitle: 'DVCLive',
    name: 'قالب‌های نمودار',
    objective: 'قالب‌های Vega (linear، confusion) را برای `dvc plots show` استفاده کنید.',
    learning: ['قالب‌ها در dvc.yaml زیر plots:', 'show --template confusion'],
    fieldNotes: ['ماتریس خطا برای ریویوی stakeholder'],
    startDialog: [
      {
        title: 'قالب‌ها',
        markdown: '`dvc plots show --template linear` · `--template confusion`',
      },
    ],
  },
  'camp-3': {
    seriesTitle: 'صف و sweep',
    name: 'صف کردن sweep پارامتر',
    objective: 'آزمایش‌ها را با `dvc exp run --queue` پارک کنید و با هم اجرا کنید.',
    learning: ['--queue پارک می‌کند', 'queue start / --run-all اجرا می‌کند'],
    fieldNotes: ['برای هر هایپرپارامتر یک job را بیسیت نکنید'],
    startDialog: [
      {
        title: 'صف',
        markdown: '`dvc exp run --queue -S train.n_est=50` … بعد `dvc queue start`.',
      },
    ],
  },
  'camp-4': {
    seriesTitle: 'عمق pipeline',
    name: 'stage foreach + فلگ‌های پیشرفته',
    objective: 'با `--foreach` stage ماتریسی بسازید و فلگ‌های پیشرفته را بفهمید.',
    learning: ['--foreach یک stage را باز می‌کند', 'no-cache / always-changed / freeze'],
    fieldNotes: ['ماتریس per-model بدون copy-paste'],
    startDialog: [
      {
        title: 'foreach',
        markdown: '`dvc stage add --foreach a,b …` — یک stage، چند اجرا.',
      },
    ],
  },
  'camp-5': {
    seriesTitle: 'همکاری و CI',
    name: '.dvcignore + update + CML',
    objective: 'قواعد ignore، به‌روزرسانی import و نظر CML را در بافت تیم ترکیب کنید.',
    learning: ['همکاری به ignore + import تازه + CI دیده‌شده نیاز دارد'],
    fieldNotes: ['کیلومتر آخر تا workflow تیمی'],
    startDialog: [
      {
        title: 'اندگیم تیم',
        markdown: '`.dvcignore` · `dvc update` · `dvc cml "…"` — همه با هم.',
      },
    ],
  },
};
