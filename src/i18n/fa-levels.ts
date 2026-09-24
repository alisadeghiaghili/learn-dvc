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
  'cache-1': {
    seriesTitle: 'انضباط cache',
    name: 'اشیای بی‌استفاده و gc',
    objective:
      'یک شیء بی‌ارجاع cache بسازید (داده‌ی dirty + نسخه جدید) و با `dvc gc` جا خالی کنید، بدون از دست دادن pointer فعلی.',
    learning: [
      'cache محتوانشان هش‌های قدیمی را تا gc نگه می‌دارد',
      'dvc gc اشیای بدون ارجاع workspace/Git را حذف می‌کند',
      'فقط وقتی gc امن است که remote هنوز چیزی را دارد که تیم لازم دارد',
    ],
    fieldNotes: [
      'CI runner: بعد از pull+repro همان SHA که shipping می‌کنید gc کنید',
      'لپ‌تاپ‌ها از md5 یتیم پر می‌شوند — gc را زمان‌بندی کنید',
      'اگر مدل release فقط در cache محلی باشد، gc می‌تواند آخرین نسخه را بکشد',
    ],
    startDialog: [
      {
        title: 'cache انبار است، نه سطل زباله',
        markdown:
          'هر `dvc add`/`commit` یک شیء **جدید** می‌نویسد. قدیمی‌ها برای checkout تاریخچه می‌مانند.\n\n`dvc gc` جارو است — فقط چیزی که ارجاع دارد می‌ماند.',
      },
    ],
  },
  'cache-2': {
    seriesTitle: 'انضباط cache',
    name: 'جدول واقعیت workspace / cache / remote',
    objective:
      'فایل ترک‌شده را حذف کنید، `dvc status` بخوانید، با `dvc pull` برگردانید و status تمیز بگیرید.',
    learning: [
      'فایل جامانده ≠ داده گم‌شده اگر cache/remote هش را داشته باشند',
      'dvc pull = fetch + checkout',
      'status نقشه‌ی صادق pointer ↔ بایت است',
    ],
    fieldNotes: ['روال: status → pull → status. بعد اگر dirty بود escalate'],
    startDialog: [
      {
        title: 'سه جا، یک جدول',
        markdown: 'Workspace / Cache / Remote — `dvc status` و `dvc pull` این جدول را می‌خوانند.',
      },
    ],
  },
  'remote-4': {
    seriesTitle: 'Remoteها',
    name: 'remote دوم + تعویض default',
    objective: 'remote پشتیبان بسازید، لیست را ببینید، default را عوض کنید و push کنید.',
    learning: [
      'چند remote (origin، backup، team، region) عادی است',
      'push/pull بدون -r از default می‌خوانند',
      'کانفیگ remote در .dvc/config است و به اشتراک می‌رود',
    ],
    fieldNotes: ['remote تیم برای کار روزانه + backup سرد برای DR', 'credentials هرگز در .dvc/config'],
    startDialog: [
      {
        title: 'چرا بیش از یک remote',
        markdown: 'انبار همکاری ≠ انبار disaster recovery.',
      },
    ],
  },
  'remote-5': {
    seriesTitle: 'Remoteها',
    name: 'fetch در برابر pull روی ماشین تازه',
    objective: 'cache خالی، remote پر: `fetch` فقط cache را پر می‌کند، `pull` فضای کاری را مادی می‌کند.',
    learning: [
      'fetch: remote → cache',
      'pull: fetch + checkout',
      'CI می‌تواند prefetch کند بدون خراب کردن tree',
    ],
    fieldNotes: ['CI قبل از build prefetch؛ pull فقط جایی که بایت لازم است'],
    startDialog: [
      {
        title: 'دو فعل، یک انبار',
        markdown: '`fetch` انبار را پر می‌کند. `pull` به آشپزخانه هم تحویل می‌دهد.',
      },
    ],
  },
  'pipe-4': {
    seriesTitle: 'Pipelineها',
    name: 'wdir, always-changed, no-cache',
    objective: 'stage را با `--wdir` و `--always-changed` تعریف کنید، no-cache را بفهمید، repro + DAG.',
    learning: [
      '--wdir پوشه‌ی کاری stage را جابه‌جا می‌کند',
      '--always-changed repro را اجباری می‌کند',
      'خروجی cache:false هویت را ترک می‌کند بدون بایت cache',
    ],
    fieldNotes: ['always-changed برای API/scrape', 'no-cache برای خروجی‌های عظیم warehouse'],
    startDialog: [
      {
        title: 'فلگ‌های stage از تولید',
        markdown: '`--wdir` · `--always-changed` · `--no-cache` — تزیینی نیستند.',
      },
    ],
  },
  'pipe-5': {
    seriesTitle: 'Pipelineها',
    name: 'ماتریس foreach + DAG',
    objective: 'یک stage را با `--foreach` به ماتریس باز کنید، لیست کنید و DAG بخوانید.',
    learning: ['--foreach یک قالب را N stage می‌کند', 'هر خانه outs خودش را دارد', 'DAG قرارداد ریویو است'],
    fieldNotes: ['ماتریس برای «این مدل‌ها باید با هم بیایند»', 'جست‌وجو در `dvc exp`، محصول در stage'],
    startDialog: [
      {
        title: 'foreach در برابر آزمایش',
        markdown: '**foreach** = ماتریس محصول. **dvc exp** = جست‌وجو.',
      },
    ],
  },
  'exp-4': {
    seriesTitle: 'آزمایش‌ها',
    name: 'دو sweep + exp show',
    objective: 'دو مجموعه‌پارامتر اجرا کنید و با `dvc exp show` مقایسه کنید.',
    learning: ['-S هر set را آزمایش ثبت می‌کند', 'exp show جدول شاهد است', '--queue کار را پارک می‌کند'],
    fieldNotes: ['sweep جمعه: صف کنید، شنبه show بخوانید'],
    startDialog: [
      {
        title: 'جست‌وجو بدون بیسیت',
        markdown: 'sweep با `-S` و بعد `dvc exp show`.',
      },
    ],
  },
  'exp-5': {
    seriesTitle: 'آزمایش‌ها',
    name: 'اعمال برنده + بازبینی پارامتر',
    objective: 'sweep، `exp show`، `exp apply`، `params show`، بعد repro.',
    learning: ['apply پیکربندی را به workspace می‌نویسد — deploy نیست', 'بعدش repro/push برای تولید', 'params show بازبینی است'],
    fieldNotes: ['PR باید exp id و دلیل را بنویسد', 'apply بدون repro مدل را کهنه می‌گذارد'],
    startDialog: [
      {
        title: 'برده release نیست',
        markdown: '`exp apply` → `dvc repro` → `dvc push`.',
      },
    ],
  },
  'cmp-3': {
    seriesTitle: 'ریویو و مقایسه',
    name: 'تمرین params + metrics diff',
    objective: 'هایپرپارامتر را عوض کنید، `params diff`، repro، `metrics diff` — بسته‌ی ریویوی ML.',
    learning: ['params diff = نیت', 'metrics diff = اثر', 'حداقلِ ریویوی ML همین دو است'],
    fieldNotes: ['هر دو diff را در PR بگذارید. ریویور نوت‌بوک باز نکند'],
    startDialog: [
      {
        title: 'ریویوی بالغ',
        markdown: '`dvc params diff` + `dvc metrics diff`.',
      },
    ],
  },
  'cmp-4': {
    seriesTitle: 'ریویو و مقایسه',
    name: 'plots show + diff',
    objective: 'repro کنید تا سری بیاید، با قالب Vega رندر کنید، `plots diff` بگیرید.',
    learning: ['plot آرتیفکت ریویوست', 'قالب نحوه‌ی خواندن را کد می‌کند', 'plots diff دوقلو metrics diff است'],
    fieldNotes: ['CML تصویر plot را به PR می‌زند'],
    startDialog: [
      {
        title: 'نمودار تزیین نیست',
        markdown: '`dvc plots show` / `dvc plots diff`.',
      },
    ],
  },
  'meta-4': {
    seriesTitle: 'متا و فایل‌های قرارداد',
    name: 'freeze آگاهانه‌ی یک stage',
    objective: '`train` را freeze کنید، رفتار را ببینید، بعد آگاهانه unfreeze.',
    learning: ['freeze در برابر repro ناشی از invalidate', 'unfreeze رویداد تولید است', 'stage یخ‌زده در DAG می‌ماند'],
    fieldNotes: ['مدل طلایی را freeze کنید موقع آزمایش پایین‌دست', 'unfreeze با ریویو + repro + push'],
    startDialog: [
      {
        title: 'میخ با تبعات',
        markdown: 'freeze محافظت می‌کند؛ اما staleness را هم پنهان می‌کند.',
      },
    ],
  },
  'meta-5': {
    seriesTitle: 'متا و فایل‌های قرارداد',
    name: 'lock رسید است',
    objective: 'پارامتر را بشکنید، repro، yaml در برابر lock — تعریف در برابر رسید اجرا.',
    learning: ['dvc.yaml = قرارداد', 'dvc.lock = رسید', 'ویرایش دستی lock دروغ است'],
    fieldNotes: ['yaml ریویوی انسانی می‌خواهد؛ lock از CI repro می‌آید'],
    startDialog: [
      {
        title: 'قرارداد یا رسید',
        markdown: '`cat dvc.yaml` · `cat dvc.lock`.',
      },
    ],
  },
  'reg-3': {
    seriesTitle: 'رجیستری و بازاستفاده',
    name: 'import و status تمیز',
    objective: 'آرتیفکت upstream را با نسخه‌ی pinned import کنید و status را تمیز نگه دارید.',
    learning: ['import نسخه‌ی upstream را میخکوب می‌کند', 'update یک bump عمدی است', 'نه zip در چت'],
    fieldNotes: ['خروجی feature store می‌شود import، نه کپی'],
    startDialog: [
      {
        title: 'قرض بگیر، انبار نکن',
        markdown: '`dvc get` = کپی. `dvc import` = pin + مسیر update.',
      },
    ],
  },
  'camp-6': {
    seriesTitle: 'همکاری و CI',
    name: 'اسکلت CI: pull، repro، comment',
    objective: 'حلقه‌ی استاندارد CI: pull، repro، خواندن metrics، نظر CML، commit رسید.',
    learning: ['CI: clone → pull → repro → cml comment', 'بایت سنگین در remote داده', 'CML metrics را قابل ریویو می‌کند'],
    fieldNotes: ['همان YAML الگوهای GitHub Actions'],
    startDialog: [
      {
        title: 'مذهب CI در سه خط',
        markdown: '```\ndvc pull\ndvc repro\ndvc cml "…"\n```',
      },
    ],
  },
  'camp-7': {
    seriesTitle: 'همکاری و CI',
    name: 'metrics های DVCLive تا exp show',
    objective: 'اجرا را با DVCLive ابزارک‌گذاری کنید و در جدول آزمایش ببینید.',
    learning: ['DVCLive پل کد آموزش به metrics/plot است', 'اسکالر metrics، سری plot'],
    fieldNotes: ['یک Live() در train.py بهتر از ده echo است'],
    startDialog: [
      {
        title: 'منحنی loss کپی‌پیست نکنید',
        markdown: 'DVCLive به همان شکلی می‌نویسد که DVC می‌فهمد.',
      },
    ],
  },
  'collab-1': {
    seriesTitle: 'همکاری و CI',
    name: 'انضباط PR مبتنی بر pointer',
    objective: 'مسیر کامل PR داده: dirty → status → add/commit → git commit فقط pointer.',
    learning: ['ریویوی PR یعنی md5 pointer + lock، نه گیگابایت', 'بدون dvc commit، pointer دروغ می‌گوید'],
    fieldNotes: ['CI باید fail کند اگر کسی مسیر داده‌ی ترک‌شده را staged کند'],
    startDialog: [
      {
        title: 'تنها PR امن داده',
        markdown: 'Status → add → commit → git add فقط فایل‌های pointer → commit.',
      },
    ],
  },
  'collab-2': {
    seriesTitle: 'همکاری و CI',
    name: 'حادثه: کدام داده، کدام مدل؟',
    objective: 'پرسش حادثه را با شاهد پاسخ دهید: pointer → git → remote → checkout تمیز.',
    learning: ['commit release → md5 pointer → cache/remote', 'بدون pointer کامیت‌شده، پاسخ نیست'],
    fieldNotes: ['این چک‌لیست postmortem برای «مدل بد در prod» است'],
    startDialog: [
      {
        title: 'چک‌لیست ساعت ۲ بامداد',
        markdown: 'Commit → pointer → md5 → روی remote؟ → checkout + `dvc checkout`.',
      },
    ],
  },
  'collab-3': {
    seriesTitle: 'همکاری و CI',
    name: 'تحویل به هم‌تیمی: push و commit pointer',
    objective:
      'تغییر داده را طوری منتشر کنید که هم‌تیمی بازتولید کند: push، commit pointer، و status تمیز بعد از pull.',
    learning: [
      'تحویل = اشیای remote + commit pointer در گیت، نه zip',
      'push بدون commit pointer بایت‌ها را بی‌صاحب می‌کند',
      'status بعد از pull آزمون پذیرش است',
    ],
    fieldNotes: ['تعریف Done برای کار داده: pull موفق روی ماشین تمیز'],
    startDialog: [
      {
        title: 'قرارداد تحویل',
        markdown: 'تغییر مشترک است وقتی: بایت روی remote + pointer در گیت + `dvc pull` جواب دهد.',
      },
    ],
  },
  'api-1': {
    seriesTitle: 'همکاری و CI',
    name: 'خواندن داده بدون checkout (dvc.api)',
    objective: 'سطح API داده را در شبیه‌ساز بیازمایید و قرارداد pointer را بررسی کنید.',
    learning: ['dvc.api داده‌ی ترک‌شده را در اپ/نوت‌بوک می‌خواند', 'API جای checkout فایل روی دیسک را نمی‌گیرد'],
    fieldNotes: ['داشبورد با dvc.api + commit pinned، نه دانلود دستی'],
    startDialog: [
      {
        title: 'قرض گرفتن بایت در کد',
        markdown: '`dvc.api` برای اپ. `dvc checkout` برای فضای کاری.',
      },
    ],
  },
  'cmp-5': {
    seriesTitle: 'ریویو و مقایسه',
    name: 'بسته‌ی کامل ریویوی ML',
    objective: 'یک تغییر، کل بسته: params diff، metrics diff، plots diff بعد از repro.',
    learning: ['PR جدی ML یعنی نیت + اثر + منحنی', 'بدون metrics/plots ریویور مهر لاستیکی می‌زند'],
    fieldNotes: ['بدنه‌ی PR با سه جا: params / metrics / plots'],
    startDialog: [
      {
        title: 'حداقل PR جدی',
        markdown: 'params diff → repro → metrics diff → plots diff.',
      },
    ],
  },
  'collab-4': {
    seriesTitle: 'همکاری و CI',
    name: 'تعارض lock/pointer در PR داده',
    objective: 'تعارض PR را حل کنید: پارامتر عوض شده، lock کهنه. repro، commit رسید، status تمیز.',
    learning: ['yaml نیت، lock رسید', 'lock را دستی merge نکنید'],
    fieldNotes: ['روال: status → repro → commit → status'],
    startDialog: [{ title: 'دو نفر، یک قرارداد', markdown: 'repro، بعد رسید جدید را commit کنید.' }],
  },
  'reg-4': {
    seriesTitle: 'رجیستری و بازاستفاده',
    name: 'pin کردن upstream و update',
    objective: 'import را با pin بخوانید، بعد عمداً `dvc update`.',
    learning: ['import مسیر + md5 را میخکوب می‌کند', 'update رویداد ریویو است'],
    fieldNotes: ['bump را با changelog در PR بگذارید'],
    startDialog: [{ title: 'قرض با رسید', markdown: 'get کپی · import pin · update جابه‌جایی pin.' }],
  },
  'capstone-2': {
    seriesTitle: 'همکاری و CI',
    name: 'چک‌پوینت پایانی end-to-end',
    objective: 'تمرین فارغ‌التحصیلی: dirty → status → add/commit → push → git commit فقط pointer.',
    learning: ['end-to-end یک روایت است', 'بدون push/pointer هم‌تیمی بعدی می‌شکند'],
    fieldNotes: ['گیت آن‌بوردینگ کار داده'],
    startDialog: [{ title: 'فارغ‌التحصیلی', markdown: 'فرمان جدید نیست. **یک داستان منسجم.**' }],
  },
  'mastery-1': {
    seriesTitle: 'همکاری و CI',
    name: 'بازیابی فاجعه: restore از remote',
    objective: 'ماشین گم‌شده را شبیه‌سازی کنید: فضای کاری را خالی، از remote با fetch+pull برگردانید.',
    learning: ['DR یعنی remote + pointer کامیت‌شده', 'fetch cache را پر می‌کند؛ pull درخت کاری را برمی‌گرداند'],
    fieldNotes: ['تمرین DR فصلی: ماشین تازه، clone، pull، metrics'],
    startDialog: [{ title: 'وقتی لپ‌تاپ می‌میرد', markdown: 'گیت تاریخچه pointer را دارد. remote داده بایت را.' }],
  },
  'mastery-2': {
    seriesTitle: 'همکاری و CI',
    name: 'تصمیم Git-LFS در برابر DVC',
    objective: 'ابزار درست را با شاهد انتخاب کنید: LFS vs DVC، بعد tracking داده‌ی ML با DVC.',
    learning: ['LFS = blob در remote گیت؛ DVC = pointer + store شیء + pipeline', 'تقریباً همیشه برای ML: DVC'],
    fieldNotes: ['جدول تصمیم در wiki تیم، نه فولکلور چت'],
    startDialog: [{ title: 'درست و کسل‌کننده انتخاب کن', markdown: 'repro/exp/cache/pipeline → DVC.' }],
  },
  'mastery-3': {
    seriesTitle: 'همکاری و CI',
    name: 'CI secrets + pull + comment',
    objective: 'بدنه‌ی CI تولیدی: pull، repro، metrics، CML، commit رسید.',
    learning: ['credential در CI secrets، هرگز در .dvc/config', 'بدنه‌ی CI یعنی pull → repro → comment'],
    fieldNotes: ['OIDC/role auth بهتر از کلیدهای بلندمدت'],
    startDialog: [{ title: 'CI که تیم امنیت تأیید می‌کند', markdown: 'Secret در vault. کانفیگ remote در گیت. بایت در remote داده.' }],
  },
  'mastery-4': {
    seriesTitle: 'همکاری و CI',
    name: 'promote آرتیفکت: مدل تا release',
    objective: 'آزمایش برنده را به release تبدیل کنید: apply، repro، push، روایت در گیت.',
    learning: ['release = apply + repro + push + git commit', 'exp apply یعنی deploy نیست'],
    fieldNotes: ['چک‌لیست: apply → repro → push → commit → tag'],
    startDialog: [{ title: 'از برنده تا release', markdown: 'exp → show → apply → repro → push → git commit.' }],
  },
  'mastery-5': {
    seriesTitle: 'ریویو و مقایسه',
    name: 'ریویوی plot ماتریس خطا',
    objective: 'قالب confusion را رندر و plots diff بگیرید — ریویوی طبقه‌بندی بدون نوت‌بوک.',
    learning: ['قالب نحوه‌ی خواندن را کد می‌کند', 'plots diff دوقلو metrics diff است'],
    fieldNotes: ['release طبقه‌بندی همیشه confusion matrix دارد'],
    startDialog: [{ title: 'ماتریس را بخوان، نه میانگین را', markdown: '`dvc plots show --template confusion`.' }],
  },
  'mastery-6': {
    seriesTitle: 'متا و قرارداد',
    name: 'داده‌ی خارجی + قرارداد no-cache',
    objective: 'stage با خروجی external/no-cache، لیست، repro، و DAG به‌عنوان قرارداد.',
    learning: ['external/no-cache هویت را ترک می‌کند بدون بایت انبار', 'DAG قرارداد داده پیش از merge است'],
    fieldNotes: ['جدول‌های warehouse خروجی external هستند، نه شیء cache'],
    startDialog: [{ title: 'وقتی بایت جای دیگری است', markdown: '`-O` / cache:false **نام** را ترک می‌کند، نه انبار را.' }],
  },
  'mastery-7': {
    seriesTitle: 'Remoteها',
    name: 'auth مسیر بدون نشتی secret',
    objective: 'remote تیم را پیکربندی کنید: non-secret در config، secret از env/CI — credentials هرگز commit نشود.',
    learning: ['URL و non-secret در .dvc/config', 'secret از env/CI/role', 'remote modify سیاست auth را کد می‌کند'],
    fieldNotes: ['.dvc/config را در PR ببینید — کلید بلندمدت نه', 'OIDC/role بهتر از access_key_id در CI'],
    startDialog: [{ title: 'credential فایل پروژه نیست', markdown: 'URL/پروفایل را به اشتراک بگذارید. `secret_access_key` هرگز.' }],
  },
  'mastery-8': {
    seriesTitle: 'همکاری و CI',
    name: 'Transfer: تغییر داده بدون دستورالعمل',
    objective: 'بدون لیست مراحل. داده dirty، pointer commit، اشیا push.',
    learning: ['آزمون transfer: مسیر را خودتان طراحی کنید', 'Done = status تمیز + pointer در گیت + بایت روی remote'],
    fieldNotes: ['گیت آن‌بوردینگ/استخدام مهندس داده'],
    startDialog: [{ title: 'آزمایشگاه باز', markdown: 'این level **دستورالعمل نمی‌دهد**. هدف یک وضعیت است.' }],
  },
};
