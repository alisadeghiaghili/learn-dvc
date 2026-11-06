/** Persian level teaching copy. Never includes hint/solution/commands. */

import type { LevelCopy } from './types';

export const faLevels: Record<string, LevelCopy> = {
  'basics-1': {
    seriesTitle: 'مبانی',
    name: 'راه‌اندازی DVC',
    objective:
      'DVC را داخل یک مخزن Git مقداردهی کنید و فایل‌هایی را که `dvc init` stage کرده commit کنید تا کل تیم یک setup مشترک داشته باشد.',
    learning: [
      'DVC مکمل Git برای داده است؛ جایگزین Git نیست',
      'dvc init به یک مخزن Git نیاز دارد (یا --no-scm) و فقط متادیتای .dvc/ می‌سازد — هنوز هیچ داده‌ای version نشده',
      'dvc init خودش .dvc/config و .dvc/.gitignore و .dvcignore را stage می‌کند؛ شما فقط commit می‌کنید',
    ],
    fieldNotes: [
      'بوت استراپ ریپو: git init → dvc init → git commit (dvc init خودش git add را زده)',
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
          'داخل یک مخزن Git اجرا می‌شود (بیرون از آن، `dvc init` متوقف می‌شود و `--no-scm` را پیشنهاد می‌کند). این‌ها را می‌سازد:\n\n- `.dvc/config` — محل remoteها و cache برای این پروژه\n- `.dvc/.gitignore` — تا cache داخلی DVC ناخواسته commit نشود\n- `.dvcignore` — الگوهایی که DVC باید رد کند، مثل `.gitignore` برای DVC\n\n**داده آپلود نمی‌کند.** شما data-versioning را برای پروژه *روشن* می‌کنید.\n\nمدل ذهنی: `git init` برای کد ≈ `dvc init` برای workflow داده.',
      },
      {
        title: 'چرا باید نتیجه را با Git commit کنید',
        markdown:
          'این فایل‌ها کوچک و مخصوص تیم‌اند. `dvc init` خودش `git add` را برایشان زده (با `git status` ببینید)، پس فقط commit مانده:\n\n```\ngit commit -m "Initialize DVC"\n```\n\nبدون این، clone شماره‌ی ۲ کد دارد ولی **پروژه‌ی DVC ندارد** — `dvc pull` چیدمان cache شما را نمی‌شناسد.\n\nبه بورد نگاه کنید: Workspace می‌تواند «initialized» باشد در حالی که commit راه‌اندازی در Git هنوز نیست.',
      },
    ],
  },
  'basics-2': {
    seriesTitle: 'مبانی',
    name: 'ردگیری یک دیتاست',
    objective:
      '`data/data.xml` را طوری ردگیری کنید که محتوا در cache باشد، Git فقط pointer را ببیند و مسیر خام gitignore شود.',
    learning: [
      'dvc add = هش + شیء cache + pointer فایل .dvc + gitignore',
      'Git فقط pointer (md5) را commit می‌کند، نه فایل بزرگ را',
      'بورد: فایل Workspace به pointer تبدیل می‌شود و شیء cache ظاهر می‌شود',
    ],
    fieldNotes: [
      'دیتاست، مدل یا آرتیفکتی را ردگیری کنید که بازسازی‌اش ارزان نیست',
      'ریویوی PR باید تغییرات pointer (md5) را بخواند، نه مگابایت‌ها CSV',
      'CI داده را با DVC می‌کشد؛ ایمیج‌ها سبک می‌مانند',
    ],
    startDialog: [
      {
        title: '`dvc add` چه می‌کند',
        markdown:
          'چهار اثر در یک فرمان:\n\n1. هش (md5) روی محتوای فایل\n2. بایت‌ها در `.dvc/cache`\n3. فایل pointer کوچک `.dvc` (YAML)\n4. مسیر خام در `.gitignore`\n\nبعد از آن Git فقط pointer را می‌بیند.',
      },
      {
        title: 'زیر کاپوت چه می‌گذرد',
        markdown:
          'بعد از `dvc add`:\n\n- Workspace هنوز `data/data.xml` را دارد — به‌صورت پیش‌فرض یک کپی (`cache.type` برابر `reflink,copy` است؛ reflink و hardlink و symlink اختیاری‌اند)\n- `.dvc/cache/.../md5/xx/…` بایت‌های واقعی را بر پایه‌ی محتوا نگه می‌دارد\n- `data/data.xml.dvc` یک YAML با مسیر + md5 است — **چیزی که Git ذخیره می‌کند**\n- `data/.gitignore` مسیر خام را ignore می‌کند\n\n**Git** → کد + pointer. **cache/remote در DVC** → خودِ داده.',
      },
      {
        title: 'اشتباه رایج',
        markdown:
          'از سر عادت `git add data/data.xml` می‌زنند.\n\nقبل از `dvc add` گیت آن را می‌پذیرد (اینجا با هشدار) و مشکل اصلی را برمی‌گرداند. بعد از `dvc add` گیت رد می‌کند: *«The following paths are ignored by one of your .gitignore files»*. فقط فایل `.dvc` و قواعد ignore به Git تعلق دارند.',
      },
    ],
  },
  'basics-3': {
    seriesTitle: 'مبانی',
    name: 'داده‌ی dirty و status',
    objective:
      'وقتی داده روی دیسک عوض شد، با `dvc status` تشخیصش بدهید، نسخه‌ی جدید را با `dvc add` بپذیرید و بعد تغییر pointer را در Git ثبت کنید.',
    learning: [
      'dvc status فضای کاری را با pointer و cache مقایسه می‌کند',
      'modified یعنی بایت‌ها با md5 داخل .dvc نمی‌خواند',
      'اجرای دوباره‌ی dvc add md5 جدید را در فایل .dvc و بایت‌های جدید را در cache می‌نویسد؛ git commit همان pointer را version می‌کند',
      'تاریخچه md5 قدیمی را نگه می‌دارد — بعداً با checkout برمی‌گردید',
    ],
    fieldNotes: [
      'داده‌ی dirty بعد از feature engineering عادی است',
      'کورکورانه commit نکنید — اول status، بعد commit یا checkout',
    ],
    startDialog: [
      {
        title: 'dirty خطا نیست',
        markdown:
          'مثل `git status` برای داده: یک تغییر commit‌نشده دارید.\n\n```\nedit data/data.xml\n```\n\nاکنون **محتوای workspace ≠ md5 pointer**. اگر روی این فایل آموزش داده باشید، نتیجه تا ثبت نسخه‌ی داده **قابل بازتولید نیست**.',
      },
      {
        title: 'status → add → Git',
        markdown:
          '```\ndvc status\ndvc add data/data.xml\ngit add data/data.xml.dvc\ngit commit -m "Dataset updates"\n```\n\n1. **status** — کدام فایل‌های داده فرق کرده‌اند\n2. **dvc add** — دوباره روی فایل تغییرکرده: md5 جدید در فایل `.dvc` و بایت‌های جدید در cache\n3. **git commit** — انتشار تغییر pointer در تاریخچه‌ی کد\n\nبدون گام ۲ گیت یک *دروغ* را version می‌کند (هش قدیمی، فایل جدید). (`dvc commit` برادر آن برای خروجی‌های pipeline و `--no-commit` است؛ برای فایل ساده‌ی ردگیری‌شده کار هر روزه همان `add` دوباره است.)',
      },
    ],
  },
  'basics-4': {
    seriesTitle: 'مبانی',
    name: 'ردگیری دایرکتوری دیتاست',
    objective:
      'یک دایرکتوری دیتاست (`data/images`) را با DVC ردگیری کنید تا تمام فایل‌های درون آن با یک شناسه مانیفست (.dir) ثبت شوند.',
    learning: [
      'DVC پوشه‌ها را با هش مانیفست .dir به‌صورت یک واحد یکپارچه ردگیری می‌کند',
      'فایل اشاره‌گر به‌صورت <folder>.dvc ذخیره می‌شود (data/images.dvc)',
      'کل پوشه در gitignore قرار می‌گیرد و گیت فقط فایل اشاره‌گر را نسخه می‌کند',
    ],
    fieldNotes: [
      'دیتاست‌های تصویری و صوتی باید به‌صورت دایرکتوری ردگیری شوند، نه صدها فایل مجزای .dvc',
      'ریویوی PR به‌جای شلوغی گیت، فقط تغییر یک هش .dir را بررسی می‌کند',
    ],
    startDialog: [
      {
        title: 'تک‌فایل در برابر دایرکتوری در DVC',
        markdown:
          'در یادگیری ماشین (به‌ویژه بینایی ماشین)، دیتاست‌ها شامل پوشه‌هایی با هزاران تصویر هستند.\n\nاگر برای هر فایل جداگانه `dvc add` بزنید، هزاران فایل `.dvc` ساخته می‌شود!\n\nبه‌جای آن کل پوشه را ردگیری کنید:\n```\ndvc add data/images\n```\n\nابزار DVC یک مانیفست با پسوند `.dir` و یک اشاره‌گر واحد می‌سازد.',
      },
      {
        title: 'کامیت اشاره‌گر دایرکتوری',
        markdown:
          '```\ngit add data/images.dvc data/.gitignore\ngit commit -m "Track raw images directory"\n```\n\nگیت فقط فایل اشاره‌گر سبک را نسخه می‌کند و بایت‌های تصاویر در کش DVC نگهداری می‌شوند.',
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
    objective: 'داده‌ی ردگیری‌شده را با `dvc push` آپلود کنید تا تیم به آن دسترسی داشته باشد.',
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
    objective: 'روی یک ماشین تازه داده را با `dvc pull` دریافت و در فضای کاری مستقر کنید، بدون آن‌که بایت‌ها در تاریخچه‌ی گیت باشند.',
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
      'outs بعد از اجرای موفق ردگیری می‌شوند',
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
      {
        title: 'یک اجرا چه چیزی پشت سر می‌گذارد',
        markdown:
          'هر `dvc exp run -S` pipeline را **همان لحظه** اجرا می‌کند و workspace را با همان اجرا باقی می‌گذارد: `params.yaml` آخرین مقدار `-S` را نشان می‌دهد و `git status` آن را modified می‌گوید.\n\nهر اجرا به‌صورت یک experiment هم ذخیره می‌شود (refهای مخفی Git)، پس هر دو sweep حتی بعد از حرکت workspace در `dvc exp show` می‌مانند. اگر نمی‌خواهید workspace را تکان دهید، اجرا را با `--queue` در صف بگذارید و بعداً شروع کنید.',
      },
    ],
  },
  'exp-3': {
    seriesTitle: 'آزمایش‌ها',
    name: 'اعمال برنده',
    objective:
      'یک آزمایش با `lr=0.05` اجرا کنید، آزمایش‌ها را فهرست کنید و با `dvc exp apply <id>` پارامتر، metrics و خروجی‌های همان آزمایش را به workspace بیاورید.',
    learning: [
      'exp apply برنده را promote می‌کند',
      'apply پارامتر، metrics و فایل‌های خروجی را برمی‌گرداند؛ stageها بدون repro به‌روزند',
      'pointer و params و metrics برای ممیزی به هم وصل می‌مانند',
    ],
    fieldNotes: ['برده baseline جدید می‌شوند — در نوت کپی نکنید'],
    startDialog: [
      {
        title: 'از اجرا تا baseline',
        markdown: '`dvc exp apply exp-xxxxxx` — بدون تایپ دوباره‌ی مقادیر.',
      },
      {
        title: 'apply خروجی‌ها را هم برمی‌گرداند',
        markdown:
          '`dvc exp apply <id>` فایل `params.yaml`، metrics **و فایل‌های خروجی** (مثل `model.pkl`) آن آزمایش را به workspace برمی‌گرداند — **baseline** جدید شما. بعد از آن به `dvc repro` نیازی نیست.\n\nbaseline فقط وقتی رسمی می‌شود که آن را با Git commit کنید.',
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
    name: 'برنده را به commit تبدیل کنید',
    objective:
      'آزمایش برنده فقط با commit شدن baseline تولید می‌شود: اجرا، apply (پارامتر و خروجی‌ها برمی‌گردند) و بعد commit کردن `params.yaml` و `dvc.lock`.',
    learning: [
      'apply پارامتر، metrics و خروجی‌ها را برمی‌گرداند — بعد از آن dvc repro لازم نیست',
      'baseline فقط بعد از Git commit برای params.yaml و dvc.lock (و dvc.yaml اگر عوض شده) رسمی است',
      'جایگزین: dvc exp branch آزمایش را به یک branch مستقل Git برای ریویو تبدیل می‌کند',
    ],
    fieldNotes: [
      'چک‌لیست release: exp show → exp apply برنده → git add params.yaml dvc.lock → git commit → dvc push',
      'CI می‌تواند repro را روی commit انتشار اجرا کند تا ثابت شود مدل با کانفیگ commit‌شده می‌خواند',
    ],
    startDialog: [
      {
        title: 'apply پایان کار نیست',
        markdown:
          '```\ndvc exp run -S lr=0.05\ndvc exp apply <id>\ngit add params.yaml dvc.lock\ngit commit -m "Promote lr=0.05"\n```\n\n`apply` برنده را در **workspace** شما می‌گذارد: پارامتر، metrics و `model.pkl` برمی‌گردند و stageها به‌روزند. اما تا commit نشود هیچ‌کس دیگر آن را نمی‌بیند.',
      },
      {
        title: 'تعریف «تمام شد»',
        markdown:
          'baseline وقتی تمام است که:\n\n1. یک Git commit کد + پارامتر + `dvc.lock` را قفل کرده باشد\n2. خروجی‌های pipeline با آن lock بخوانند (apply آن‌ها را برگردانده)\n3. remote اشیایی را دارد که هم‌تیمی‌ها لازم دارند (`dvc push`)\n\nشاخه‌ی ریویو می‌خواهید؟ `dvc exp branch <id> <branch>` از آزمایش یکی می‌سازد.',
      },
    ],
  },
  'capstone-1': {
    seriesTitle: 'کپ‌استون',
    name: 'تمرین end-to-end',
    objective:
      'یک آزمایش مبتنی بر داده را end-to-end تحویل دهید: remote، push، pipeline، repro، آزمایش، apply — و بعد نتیجه را commit کنید تا train به‌روز بماند.',
    learning: ['add/commit/push/pull به‌عنوان یک داستان', 'pipeline و exp در بافت'],
    fieldNotes: ['این روز عادی در تیم ML است'],
    startDialog: [
      {
        title: 'همه‌چیز کنار هم',
        markdown: 'وقت آن است که تکه‌ها را به یک لایه‌ی تولید تبدیل کنید.',
      },
      {
        title: 'موفقیت چه شکلی است',
        markdown:
          'بورد: داده ردگیری شده، cache پر است، remote اشیا را دارد.\nDAG: prepare → train بازتولید شده.\nآزمایش‌ها: دست‌کم یکی با `lr=0.05` که apply و commit شده (`params.yaml`، `dvc.yaml`، `dvc.lock`).\n\nیک pipeline تولیدی کوچک که پای تخته‌ی مصاحبه توضیحش می‌دهید.',
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
    learning: [
      'دو اجرا + diff بهتر از یک اجرا و حدس است',
      'کلیدهای تو در تو با -S کار می‌کنند (train.n_est=…)',
      'exp diff بدون آرگومان workspace را با HEAD مقایسه می‌کند؛ برای مقایسه‌ی دو آزمایش نامشان را بدهید',
    ],
    fieldNotes: ['کلیدهای تو در تو مثل train.lr را جدی بگیرید'],
    startDialog: [
      {
        title: 'پارامتر تو در تو',
        markdown:
          '```\ndvc exp run -n n50 -S train.n_est=50\ndvc exp run -n n100 -S train.n_est=100\ndvc exp diff n50 n100\n```',
      },
      {
        title: 'کلیدهای تو در توی -S',
        markdown:
          'به `train.n_est=…` دقت کنید — همان کلید نقطه‌دار `params.yaml` / `-p` در stage.\n\n`dvc exp diff` بدون آرگومان **workspace را با HEAD** مقایسه می‌کند. دو نام آزمایش بدهید تا تفاوت params و metrics دقیقاً بین همان دو را چاپ کند.',
      },
    ],
  },
  'reg-1': {
    seriesTitle: 'رجیستری',
    name: 'import داده',
    objective: 'یک دیتاست را از registry/URL import و version کنید.',
    learning: ['import-url منبع خارجی را ردگیری می‌کند'],
    fieldNotes: ['داده‌ی خارجی همان انضباط pointer را می‌خواهد'],
    startDialog: [
      {
        title: 'منابع خارجی',
        markdown: '`dvc import-url` — URL خارجی به‌عنوان داده‌ی ردگیری‌شده.',
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
    name: 'DVCLive: لاگ از داخل اسکریپت آموزش',
    objective:
      'ببینید **DVCLive** چطور کار می‌کند: فراخوانی‌های لاگ داخل `src/train.py` را بخوانید، اسکریپت را اجرا کنید و metrics و plotهایی را که می‌نویسد ببینید.',
    learning: [
      'DVCLive کتابخانه‌ی پایتون است که اسکریپت آموزش import می‌کند (`from dvclive import Live`) — زیرفرمان dvc نیست',
      'live.log_metric → اسکالر در dvclive/metrics.json؛ live.next_step() → یک نقطه‌ی دیگر در plotها',
      'log_param و log_plot و log_image و make_report پارامتر، plot سفارشی، تصویر و گزارش HTML اضافه می‌کنند',
    ],
    fieldNotes: [
      'به‌جای print(loss) از live.log_metric استفاده کنید — plots/exp خودبه‌خود کار می‌کنند',
      'ورودی‌های metrics/plots در dvc.yaml را که به dvclive/ اشاره می‌کنند commit کنید',
    ],
    startDialog: [
      {
        title: 'چیزی که هر دوره‌ی DVC بعد از pipeline اضافه می‌کند',
        markdown:
          'فصل **Metrics/Plots** در Get Started رسمی با DVCLive داخل کد آموزش کار می‌کند:\n\n```\nfrom dvclive import Live\n\nwith Live() as live:\n    live.log_param("lr", 0.05)\n    for epoch in range(5):\n        ...\n        live.log_metric("acc", acc)\n        live.next_step()\n```\n\nدستور `dvc live` وجود ندارد. `cat src/train.py` اینجا اسکریپت ابزارک‌گذاری‌شده را نشان می‌دهد و `python src/train.py` اجرایش می‌کند.',
      },
      {
        title: 'نقشه‌ی ذهنی',
        markdown:
          '- `log_param` → `dvclive/params.yaml`\n- `log_metric` → `dvclive/metrics.json` + `plots/metrics/*.tsv`\n- `log_plot` → داده‌ی plot سفارشی\n- `log_image` → تصویر برای گزارش\n- `make_report` → داشبورد HTML\n\nبدون این لایه، `exp show` و `plots diff` در پروژه‌های واقعی خالی می‌مانند.',
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
    name: 'stageهای foreach در dvc.yaml',
    objective:
      'یک `dvc.yaml` را بخوانید که **foreach** در آن یک تعریف را روی یک dictionary باز می‌کند، هر stage تولیدشده را repro کنید و DAG را بخوانید.',
    learning: [
      'foreach یک تعریف را به چند stage باز می‌کند (featurize@a، featurize@b) — در dvc.yaml نوشته می‌شود، نه با dvc stage add',
      '${key} و ${item.field} قالب را از هر ورودی پر می‌کنند',
      'هر stage تولیدشده outs و باطل‌سازی خودش را دارد؛ یک DAG همه را نشان می‌دهد',
    ],
    fieldNotes: [
      'foreach برای کارهای per-model / per-region از copy-paste کردن YAML بهتر است',
    ],
    startDialog: [
      {
        title: '۲۰٪ بعدی pipelineها',
        markdown:
          '`foreach` (و `matrix`) فقط در `dvc.yaml` هستند. `cat dvc.yaml` یک نمونه را نشان می‌دهد:\n\n```\nfeaturize:\n  foreach:\n    a: {max_features: 100}\n    b: {max_features: 500}\n  do:\n    cmd: python src/evaluate.py ${key} ${item.max_features}\n    outs: [data/features/${key}.pkl]\n```\n\nDVC آن را به `featurize@a` و `featurize@b` باز می‌کند.',
      },
      {
        title: 'گزینه‌های stage که باید بشناسید',
        markdown:
          '- `foreach` / `matrix` — تولید stage از فهرست یا جدول\n- `wdir` — اجرا از پوشه‌ی دیگر\n- `always_changed: true` — repro هرگز رد نمی‌کند\n- `outs: [x: {cache: false}]` — همان `-O`، بیرون از cache\n\nفقط سه‌تای آخر فلگ در `dvc stage add` دارند (`-w`، `--always-changed`، `-O`).',
      },
    ],
  },
  'camp-5': {
    seriesTitle: 'همکاری و CI',
    name: '.dvcignore + import/update + کامنت CML',
    objective:
      'سه‌گانه‌ی دوره‌های تیمی را تمرین کنید: **`.dvcignore`**، **`dvc import` + `dvc update`** و یک **کامنت PR با CML** از ابزار جدای `cml`.',
    learning: [
      '.dvcignore روی درخت‌های عظیم و شلوغ DVC را سریع‌تر می‌کند',
      'dvc update فقط روی فایل‌های .dvc ساخته‌شده با dvc import / import-url کار می‌کند',
      'CML گزارش Markdown را روی PR می‌گذارد: clone → pull → repro → cml comment create',
    ],
    fieldNotes: ['کیلومتر آخر تا workflow تیمی'],
    startDialog: [
      {
        title: 'چک‌لیست روز تیم',
        markdown:
          '```\nedit .dvcignore scratch/*\ndvc import <registry-url> get-started/data.xml -o data/data.xml\ndvc update data/data.xml.dvc\ndvc repro\ndvc metrics show --md > report.md\ncml comment create report.md\n```\n\nگام آخر از ابزار جدای **CML** استفاده می‌کند، نه `dvc`. یک تک‌خطی پایتون با `dvc.api` نشان می‌دهد اپ‌ها همین داده را بدون checkout چطور می‌خوانند.',
      },
      {
        title: 'Git-LFS در برابر DVC (سؤال همیشگی امتحان)',
        markdown:
          '- **Git-LFS**: blobهای بزرگ از طریق میزبان Git\n- **DVC**: Git نگه‌دارنده‌ی pointer/YAML؛ remote نگه‌دارنده‌ی اشیا؛ به‌علاوه‌ی repro/exp\n- ML خط لوله و آزمایش می‌خواهد → DVC؛ باینری‌های بزرگ عمومی شاید با LFS هم بگذرند',
      },
    ],
  },
  'cache-1': {
    seriesTitle: 'انضباط cache',
    name: 'اشیای بی‌استفاده و gc',
    objective:
      'نسخه‌ای از دیتاست بسازید که دیگر چیزی به آن ارجاع نمی‌دهد و با `dvc gc -w` آن را آزاد کنید، بدون خراب شدن pointer فعلی.',
    learning: [
      'cache مبتنی بر محتوا هش‌های قدیمی را تا gc نگه می‌دارد',
      'dvc gc پرچم دامنه می‌خواهد: -w فقط چیزی را نگه می‌دارد که workspace استفاده می‌کند، -A هر commit را',
      'gc فقط از cache محلی حذف می‌کند؛ -c/--cloud remote را هم پاک می‌کند (و بعد کسی آن نسخه را پس نمی‌گیرد)',
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
          'هر `dvc add` یک شیء **جدید** می‌نویسد. قدیمی‌ها می‌مانند تا `dvc checkout` تاریخچه را برگرداند.\n\nبعد از ماه‌ها گیگابایت‌ها شیء یتیم جمع می‌شود. `dvc gc` جارو است — اما فقط چیزهایی را نگه می‌دارد که در دامنه‌ی اعلام‌شده باشند.',
      },
      {
        title: '«ارجاع‌شده» یعنی چه',
        markdown:
          'شما دامنه‌ی چیزهایی را که **می‌مانند** انتخاب می‌کنید:\n\n- `-w` — آنچه workspace فعلی استفاده می‌کند\n- `-a` / `-T` — نوک branchها / tagها\n- `-A` — هر commit\n\nبدون پرچم دامنه `dvc gc` اجرا نمی‌شود. هر چه بیرون دامنه باشد از cache محلی حذف می‌شود؛ remote دست‌نخورده می‌ماند مگر `-c` (`--cloud`) بزنید.\n\n**قاعده:** اول چیزی را که تولید لازم دارد push کنید، *بعد* gc.',
      },
      {
        title: 'تمرین',
        markdown:
          '1. دیتاست را dirty کنید (`edit data/data.xml`)\n2. `dvc add data/data.xml` → هش جدید در cache و pointer به‌روز\n3. `dvc gc -w` → نسخه‌ی قدیمی که workspace به آن ارجاع نمی‌دهد از cache محلی می‌رود (روی remote می‌ماند)\n4. بررسی کنید داده‌ی فعلی هنوز ردگیری و تمیز است',
      },
    ],
  },
  'cache-2': {
    seriesTitle: 'انضباط cache',
    name: 'جدول واقعیت workspace / cache / remote',
    objective:
      'فایل ردگیری‌شده را حذف کنید، `dvc status` بخوانید، با `dvc pull` برگردانید و status تمیز بگیرید.',
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
    objective: 'cache خالی، remote پر: `fetch` فقط cache را پر می‌کند، `pull` فضای کاری را آماده و مستقر می‌کند.',
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
      {
        title: 'CI و fetch',
        markdown:
          '`dvc fetch` اشیا را فقط در `.dvc/cache` دانلود می‌کند؛ `dvc checkout` آن‌ها را به workspace وصل می‌کند. در CI می‌توانید `dvc fetch` را زود اجرا کنید تا یک لایه‌ی cache گرم شود و `dvc checkout` را در jobی بزنید که فایل‌ها را لازم دارد. هر دو target می‌گیرند: `dvc fetch data/train.csv.dvc` به‌جای کل پروژه فقط یک دیتاست را می‌آورد.',
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
      'خروجی cache:false هویت را ردگیری می‌کند بدون ذخیره بایت‌ها در cache',
    ],
    fieldNotes: ['always-changed برای API/scrape', 'no-cache برای خروجی‌های عظیم warehouse'],
    startDialog: [
      {
        title: 'فلگ‌های stage از تولید',
        markdown:
          '- `--wdir src` — طوری اجرا می‌شود که انگار cwd برابر `src/` است\n- `--always-changed` — در repro همیشه dirty\n- `-O` / `--outs-no-cache` — هش ردگیری می‌شود، بایت‌ها بیرون از cache می‌مانند (`cache: false`)\n\nاین‌ها تزیینی نیستند؛ تعیین می‌کنند stage *چطور* دروغ می‌گوید یا درست می‌ماند.',
      },
      {
        title: 'always_changed در عمل',
        markdown:
          '`--always-changed` (یا `always_changed: true` در `dvc.yaml`) باعث می‌شود DVC در هر `dvc repro` آن stage را تغییرکرده بداند، حتی اگر هیچ وابستگی‌ای عوض نشده باشد. برای stageهایی به کار می‌رود که دنیای بیرون را می‌خوانند: فراخوانی API، پرس‌وجوی پایگاه داده، زمان. stageهای پایین‌دست فقط وقتی دوباره اجرا می‌شوند که هش خروجی واقعاً فرق کرده باشد.',
      },
    ],
  },
  'pipe-5': {
    seriesTitle: 'Pipelineها',
    name: 'foreach و matrix در dvc.yaml',
    objective:
      'یک `dvc.yaml` را بخوانید که `foreach` در آن یک قالب را به چند stage باز می‌کند، کل ماتریس را repro کنید و DAG را بخوانید.',
    learning: [
      'foreach / matrix فقط در dvc.yaml هستند — `dvc stage add` چنین فلگی ندارد',
      'هر خانه‌ی ماتریس stage مستقل است (train@50، train@100) با outs و باطل‌سازی خودش',
      'DAG راهی است که لیدها قرارداد را پیش از merge ریویو می‌کنند',
    ],
    fieldNotes: [
      'ماتریس برای «این سه مدل باید با هم بیایند»',
      'آنچه به `dvc exp` تعلق دارد foreach نکنید — exp جست‌وجو است، stage محصول',
    ],
    startDialog: [
      {
        title: 'foreach در برابر آزمایش',
        markdown:
          '**stageهای foreach** = ماتریس محصول (باید تحویل شود، قرارداد بازتولیدپذیر).\n**dvc exp** = جست‌وجو (امتحان‌های زیاد، انتخاب یک برنده).\n\nمخلوط کردنشان pipelineهایی می‌سازد که در حادثه کسی توضیحشان نمی‌تواند بدهد.',
      },
      {
        title: 'یک قالب، چند stage',
        markdown:
          '`dvc stage add` نمی‌تواند این‌ها را بسازد؛ در `dvc.yaml` می‌نویسید. `cat dvc.yaml` قالب را نشان می‌دهد:\n\n```\ntrain:\n  foreach: [50, 100]\n  do:\n    cmd: python src/train.py --n ${item}\n    outs: [models/model-${item}.pkl]\n```\n\nDVC آن را به `train@50` و `train@100` باز می‌کند — `dvc stage list` و `dvc repro` و `dvc dag` همه stageهای بازشده را می‌بینند. `matrix:` همین کار را برای چند متغیر همزمان می‌کند.',
      },
    ],
  },
  'exp-4': {
    seriesTitle: 'آزمایش‌ها',
    name: 'دو sweep + exp show',
    objective: 'دو مجموعه‌پارامتر اجرا کنید و با `dvc exp show` مقایسه کنید.',
    learning: [
      'هر `dvc exp run -S` با params و metrics خودش به‌عنوان یک آزمایش مستقل ثبت می‌شود',
      'exp show آن‌ها را کنار هم می‌گذارد: params و metrics ستون‌اند',
      'با جدول انتخاب کنید، بعد برنده را apply کنید',
    ],
    fieldNotes: ['sweep جمعه: صف کنید، شنبه show بخوانید'],
    startDialog: [
      {
        title: 'دو اجرا، یک جدول',
        markdown:
          'همان کد، همان داده، دو نرخ یادگیری:\n\n```\ndvc exp run -S lr=0.05\ndvc exp run -S lr=0.2\ndvc exp show\n```\n\nبرای sweepهای بلند اجراها را با `--queue` در صف بگذارید و بعداً با `dvc queue start` تخلیه کنید.',
      },
      {
        title: 'خواندن exp show',
        markdown:
          '`dvc exp show` workspace و `HEAD` را فهرست می‌کند و آزمایش‌ها زیر commitی که از آن شروع شده‌اند تو در تو می‌آیند. params و metrics ستون‌اند؛ `--sort-by acc --sort-order desc` اجراها را رتبه‌بندی می‌کند، `--only-changed` ستون‌هایی را که هیچ‌وقت فرق نکرده‌اند پنهان می‌کند و `--md` / `--csv` جدول را خروجی می‌دهند. دو ردیف را با `dvc exp diff` دقیق‌تر مقایسه کنید.',
      },
    ],
  },
  'exp-5': {
    seriesTitle: 'آزمایش‌ها',
    name: 'اعمال برنده + بازبینی پارامتر',
    objective:
      'یک sweep اجرا کنید، با `exp show` انتخاب کنید، برنده را با `exp apply` بیاورید و بعد بررسی کنید `params.yaml` و `dvc status` با هم می‌خوانند.',
    learning: [
      'apply پارامتر، metrics و خروجی‌ها را به workspace می‌آورد — «deploy» نمی‌کند',
      'بعد از apply فایل‌های params.yaml و dvc.lock را commit و آرتیفکت‌ها را push کنید',
      'params show و status ممیزی بعد از apply هستند',
    ],
    fieldNotes: [
      'توضیح PR باید id آزمایش apply‌شده و دلیلش را بگوید',
      'apply کردن release نیست: تا params.yaml و dvc.lock commit نشوند چیزی به اشتراک نمی‌رسد',
    ],
    startDialog: [
      {
        title: 'برنده release نیست',
        markdown:
          '`exp apply` = پارامتر، metrics **و خروجی‌های** برنده را به workspace برگرداندن.\n`git commit` برای `params.yaml` + `dvc.lock` = baseline کردنش.\n`dvc push` = به اشتراک گذاشتن بایت‌ها.',
      },
      {
        title: 'ممیزی بعد از apply',
        markdown:
          'دو بررسی سریع حلقه را می‌بندد:\n\n- `dvc params show` — مقدارهای برنده واقعاً در `params.yaml` هستند\n- `dvc status` — pipeline «up to date» می‌گوید، چون apply خروجی‌های آن اجرا را برگردانده\n\nاگر `status` هنوز stage را تغییرکرده نشان می‌دهد، چیز دیگری (کد یا داده) با اجرای apply‌شده فرق دارد.',
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
      {
        title: 'خواندن دو diff',
        markdown:
          '`dvc params diff` فایل `params.yaml` در workspace را با `HEAD` مقایسه می‌کند؛ با دو revision (`dvc params diff main feature`) می‌توانید commitها را مقایسه کنید. `dvc metrics diff` برای هر متریک مقدار قبلی، مقدار جدید و میزان تغییر را نشان می‌دهد. با `--md` جدول را در PR می‌گذارید و با `--all` مقدارهای بدون تغییر هم می‌آیند.',
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
      {
        title: 'plotها هم فقط فایل هستند',
        markdown:
          '`dvc plots show` فایل‌هایی را که زیر `plots:` در `dvc.yaml` اعلام شده‌اند در `dvc_plots/index.html` رندر می‌کند؛ `dvc plots diff` همان plot را در دو revision روی هم می‌اندازد (پیش‌فرض: workspace در برابر `HEAD`). قالب Vega را با `-t` / `--template` انتخاب کنید (`linear`، `simple`، `confusion`، …) و اگر CI به‌جای HTML خودِ spec را می‌خواهد از `--json` یا `--show-vega` استفاده کنید.',
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
      {
        title: 'freeze در dvc.yaml نوشته می‌شود',
        markdown:
          '`dvc freeze` مقدار `frozen: true` را در stage داخل `dvc.yaml` می‌نویسد، پس این تصمیم مثل هر تغییر دیگری در Git ریویو می‌شود. stage فریزشده حتی وقتی وابستگی‌هایش عوض شده باشند توسط `dvc repro` رد می‌شود و `dvc status` دیگر آن را تغییرکرده گزارش نمی‌کند. هر freeze را با یک دلیل و یک تیکت برای unfreeze همراه کنید.',
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
      {
        title: 'داخل dvc.lock چیست',
        markdown:
          'برای هر stage فایل `dvc.lock` دقیقاً `cmd`، md5 و اندازه‌ی هر وابستگی، مقدار paramsهای ردگیری‌شده و md5 هر خروجی را ثبت می‌کند. DVC با مقایسه‌ی workspace با این ورودی‌ها تصمیم می‌گیرد stage کهنه است یا نه — برای همین تعارض در `dvc.lock` با اجرای دوباره‌ی `dvc repro` حل می‌شود، نه با دست‌کاری هش‌ها.',
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
      {
        title: 'update فقط به importها دست می‌زند',
        markdown:
          '`dvc import` در فایل `.dvc` ثبت می‌کند داده از کجا آمده (`repo` و `rev_lock`). `dvc update data/external.csv.dvc` آن منبع را دوباره می‌خواند و pin را جابه‌جا می‌کند. روی فایل `.dvc`ی که با `dvc add` ساده ساخته شده، `dvc update` منبعی برای خواندن ندارد و شکست می‌خورد.',
      },
    ],
  },
  'camp-6': {
    seriesTitle: 'همکاری و CI',
    name: 'اسکلت CI: pull، repro، comment',
    objective:
      'حلقه‌ی استاندارد CI را اجرا کنید: pull، repro، نوشتن گزارش metrics به Markdown، فرستادن آن با ابزار جدای `cml` و commit کردن رسید.',
    learning: [
      'اسکلت CI: clone → pull → repro → cml comment',
      'بایت سنگین در remote داده می‌ماند؛ Git کوچک می‌ماند',
      'CML ابزار مستقلی است (cml comment create report.md) که گزارش Markdown را به کامنت PR تبدیل می‌کند',
    ],
    fieldNotes: ['همان YAML الگوهای GitHub Actions'],
    startDialog: [
      {
        title: 'مذهب CI در سه خط',
        markdown:
          '```\ndvc pull\ndvc repro\ncml comment create report.md\n```\n\nبین repro و کامنت گزارش را می‌سازید: `dvc metrics show --md > report.md`. بقیه لوله‌کشی است.',
      },
      {
        title: 'اسکلت GitHub Actions',
        markdown:
          '```\n- uses: iterative/setup-dvc@v1\n- uses: iterative/setup-cml@v2\n- run: |\n    dvc pull\n    dvc repro\n    dvc metrics show --md > report.md\n    cml comment create report.md\n  env:\n    REPO_TOKEN: ${{ secrets.GITHUB_TOKEN }}\n```\n\n`cml` جدا از `dvc` نصب می‌شود؛ فقط فایل Markdown و یک token می‌خواهد.',
      },
    ],
  },
  'camp-7': {
    seriesTitle: 'همکاری و CI',
    name: 'metrics های DVCLive تا exp show',
    objective:
      'آزمایشی اجرا کنید که اسکریپت آموزشش از قبل با DVCLive لاگ می‌کند، بعد metrics را در `dvc exp show` و منحنی‌ها را در `dvc plots show` ببینید.',
    learning: [
      'DVCLive کتابخانه‌ی پایتون است که train.py صدایش می‌زند — زیرفرمان dvc نیست',
      'اسکالرهای live.log_metric می‌شوند metrics؛ stepها می‌شوند plot',
      'exp show جدول انسانی روی این پل است',
    ],
    fieldNotes: ['یک Live() در train.py بهتر از ده echo است'],
    startDialog: [
      {
        title: 'منحنی loss کپی‌پیست نکنید',
        markdown:
          'اسکریپت آموزش خودش لاگ می‌کند (`cat src/train.py`):\n\n```\nfrom dvclive import Live\n\nwith Live() as live:\n    for epoch in range(5):\n        ...\n        live.log_metric("acc", acc)\n        live.next_step()\n```\n\nDVC فقط باید اسکریپت را اجرا کند و `dvclive/metrics.json` و `dvclive/plots/` را بخواند.',
      },
      {
        title: 'از اسکریپت تا جدول',
        markdown:
          '`dvc exp run -S lr=0.05` pipeline را اجرا می‌کند و DVCLive فایل‌هایش را می‌نویسد. بعد:\n\n- `dvc exp show` — هر آزمایش یک ردیف، با metricهای لاگ‌شده به‌عنوان ستون\n- `dvc plots show` — منحنی‌های step به step که DVCLive نوشته\n\n`dvclive/metrics.json` را زیر `metrics:` و `dvclive/plots` را زیر `plots:` در `dvc.yaml` بنویسید تا DVC آن‌ها را خودکار پیدا کند.',
      },
    ],
  },
  'collab-1': {
    seriesTitle: 'همکاری و CI',
    name: 'انضباط PR مبتنی بر pointer',
    objective:
      'مسیر کامل PR داده: dirty → status → add دوباره → git commit فقط pointer — هرگز بایت‌های خام.',
    learning: [
      'سطح ریویوی PR یعنی md5 pointer + lock، نه گیگابایت',
      'پیام git commit روایت انسانی است؛ .dvc روایت ماشینی',
      'بدون add دوباره، pointer دروغگو وارد PR می‌شود',
    ],
    fieldNotes: ['CI باید fail کند اگر کسی مسیر داده‌ی ردگیری‌شده را staged کند'],
    startDialog: [
      {
        title: 'تنها PR امن داده',
        markdown:
          '1. داده را عوض کنید\n2. `dvc status`\n3. `dvc add` (md5 جدید را می‌نویسد و بایت‌ها را در cache می‌گذارد)\n4. `git add` **فقط فایل‌های pointer**\n5. `git commit`\n\nهر چیز دیگر نشت داده یا دروغ است.',
      },
      {
        title: 'قاعده‌ی «فقط pointer» را نگهبانی کنید',
        markdown:
          'بعد از `dvc add`، دستور `git add data/data.xml` شکست می‌خورد، چون DVC مسیر را در `.gitignore` گذاشته — این تور ایمنی است. یک بررسی CI را هم به‌عنوان تور دوم اضافه کنید: PRی که diff آن به مسیری با فایل `.dvc` دست می‌زند رد شود.',
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
      {
        title: 'ردگیری یک مدل تا بایت‌ها',
        markdown:
          'از commit یا tag انتشار شروع کنید. `git show <rev>:data/data.xml.dvc` مقدار md5 را می‌دهد؛ `dvc.lock` در همان commit md5 هر وابستگی و خروجی و نیز params اجراشده را فهرست می‌کند. `dvc diff <قدیم> <جدید>` نشان می‌دهد بین دو انتشار چه عوض شده است. اگر شیء نه در cache باشد نه در remote، رد گم می‌شود — برای همین قبل از tag زدن push می‌کنیم.',
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
      {
        title: 'تحویل را با یک clone تازه بررسی کنید',
        markdown:
          'تحویل وقتی معتبر است که یک `git clone` تازه و بعد `dvc pull` کار کند. ترتیب مهم است: اول `dvc push` (بایت‌ها)، بعد push کردن commit در Git (pointer). برعکسش همکار شما pointerی می‌گیرد که داده‌اش هنوز روی remote نیست. `dvc status --cloud` نشان می‌دهد چه چیزی هنوز فقط محلی است.',
      },
    ],
  },
  'api-1': {
    seriesTitle: 'همکاری و CI',
    name: 'خواندن داده بدون checkout (dvc.api)',
    objective:
      'داده‌ی ردگیری‌شده را با `dvc.api` از پایتون بخوانید در حالی که فایل در workspace نیست، بعد بررسی کنید workspace هنوز با pointerها می‌خواند و آن را برگردانید.',
    learning: [
      'dvc.api ماژول پایتون است (read، open، get_url، params_show) — دستور `dvc api` وجود ندارد',
      'خواندن با API از cache/remote استریم می‌کند؛ وقتی فایل روی دیسک لازم است جای checkout را نمی‌گیرد',
      'status بعد از هر خواننده‌ای محک صداقت می‌ماند',
    ],
    fieldNotes: ['داشبورد با dvc.api + commit pinned، نه دانلود دستی'],
    startDialog: [
      {
        title: 'قرض گرفتن بایت در کد',
        markdown:
          '`dvc.api` برای **اپ**هایی است که داده می‌خوانند؛ `dvc checkout` برای **workspace**هایی که فایل لازم دارند. قرارداد md5 در هر دو یکی است.\n\nدر این level فایل از workspace حذف شده — API باز هم آن را از cache یا remote می‌خواند:\n\n```\npython -c "import dvc.api; print(dvc.api.read(\'data/data.xml\'))"\n```',
      },
      {
        title: 'revision را pin کنید',
        markdown:
          'بدون `rev=` همان چیزی را می‌خوانید که checkout فعلی می‌گوید. سرویس‌ها باید pin کنند: `dvc.api.read(path, rev="v1.2.0")` (tag، branch یا commit) و در صورت لزوم `repo=` و `remote=`. مسیر اشتباه یا ردگیری‌نشده `PathMissingError` می‌دهد؛ به‌جای برگشتن به بایت‌های کهنه، بسته شکست بخورید.',
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
      {
        title: 'بگذارید CI بسته را بسازد',
        markdown:
          'در CI دستورهای `dvc params diff --md`، `dvc metrics diff --md` و `dvc plots diff` را در برابر پایه‌ی PR (`origin/main`) اجرا کنید و نتیجه را با `cml comment create` بفرستید. ریویوکننده بدون checkout کردن branch هم قصد، اثر و منحنی‌ها را می‌بیند. بخش خالی هم یک اطلاع است: آن را در PR بنویسید، نه اینکه حذفش کنید.',
      },
    ],
  },
  'collab-4': {
    seriesTitle: 'همکاری و CI',
    name: 'تعارض lock/pointer در PR داده',
    objective: 'تعارض ادغام گیت در dvc.lock را حل کنید. هرگز هش‌ها را دستی دستکاری نکنید؛ با `dvc repro` رسید معتبر جدید تولید و کامیت کنید.',
    learning: ['yaml نیت، lock رسید', 'تعارض در dvc.lock هنگام merge طبیعی است', 'lock را دستی merge نکنید؛ با repro بازتولید کنید'],
    fieldNotes: ['روال: git merge → dvc status → dvc repro → commit → status'],
    startDialog: [
      {
        title: 'دو نفر، یک قرارداد',
        markdown:
          'هنگام `git merge origin/main` تعارض در `dvc.lock` رخ می‌دهد. با `dvc repro` رسید جدید بگیرید و کامیت کنید.',
      },
      {
        title: 'حل تعارض در dvc.lock',
        markdown:
          '`dvc.lock` تولیدشده است، پس تعارض آن خط‌به‌خط حل نمی‌شود. یکی از دو طرف را بردارید (`git checkout --ours dvc.lock`)، `dvc repro` را دوباره اجرا کنید — stageهایی که ورودی‌شان یکی است با run cache رد می‌شوند —، diff را بخوانید و commit کنید. تعارض در `dvc.yaml` یا `params.yaml` اول به تصمیم انسانی نیاز دارد، چون تعیین می‌کند چه چیزی اجرا شود.',
      },
    ],
  },
  'reg-4': {
    seriesTitle: 'رجیستری و بازاستفاده',
    name: 'pin کردن upstream و update',
    objective:
      'داده‌ی upstream را pin‌شده روی یک release import کنید، pin را بخوانید و بعد عمداً با `dvc update --rev` جابه‌جایش کنید — bump نسخه رویداد ریویو است.',
    learning: [
      'import یک pin می‌نویسد (ریپوی منبع، rev و md5) که در فایل .dvc می‌خوانید',
      'update --rev یک bump عمدی است، مثل ارتقای کتابخانه',
      'status ثابت می‌کند bump تمیز نشسته',
    ],
    fieldNotes: ['bump را با changelog در PR بگذارید'],
    startDialog: [
      {
        title: 'قرض با رسید',
        markdown:
          '`dvc get` کپی می‌کند.\n`dvc import` کپی می‌کند **و** pin می‌کند.\n`dvc update` pin را عمداً جابه‌جا می‌کند.\n\nپیش از update، `cat data/external.csv.dvc` را بخوانید — بدانید چه چیزی را پشت سر می‌گذارید.',
      },
      {
        title: 'روی یک rev pin کنید، با PR بالا ببرید',
        markdown:
          '`dvc import … --rev v1.0` import را به یک tag، branch یا commit ریپوی منبع قفل می‌کند. `dvc update` ساده همان rev را دوباره resolve می‌کند (برای branchها مفید)؛ `dvc update --rev v2.0 …` خودِ rev را عوض می‌کند. در هر دو حالت md5 جدید در فایل `.dvc` می‌نشیند، پس bump در diff گیت برای ریویو دیده می‌شود.',
      },
    ],
  },
  'capstone-2': {
    seriesTitle: 'همکاری و CI',
    name: 'چک‌پوینت پایانی end-to-end',
    objective:
      'تمرین فارغ‌التحصیلی: dirty → status → add دوباره → push به remote → git commit فقط pointer. یک داستان تمیز که یک لید بتواند ممیزی کند.',
    learning: ['end-to-end یک روایت است', 'بدون push/pointer هم‌تیمی بعدی می‌شکند'],
    fieldNotes: ['گیت آن‌بوردینگ کار داده'],
    startDialog: [
      {
        title: 'فارغ‌التحصیلی',
        markdown: 'فرمان جدید نیست. **یک داستان منسجم.**',
      },
      {
        title: 'تعریف «تمام شد» را بنویسید',
        markdown:
          'چک‌لیست را در قالب PR بگذارید:\n\n- [ ] `dvc status` تمیز\n- [ ] `dvc status --cloud` همگام بودن cache و remote را نشان می‌دهد\n- [ ] فقط تغییرهای `.dvc` / `.gitignore` / `dvc.lock` در diff\n\nریویویی که هر سه را تیک نزند نباید merge شود.',
      },
    ],
  },
  'mastery-1': {
    seriesTitle: 'همکاری و CI',
    name: 'بازیابی فاجعه: restore از remote',
    objective: 'ماشین گم‌شده را شبیه‌سازی کنید: فضای کاری را خالی، از remote با fetch+pull برگردانید.',
    learning: ['DR یعنی remote + pointer کامیت‌شده', 'fetch cache را پر می‌کند؛ pull درخت کاری را برمی‌گرداند'],
    fieldNotes: ['تمرین DR فصلی: ماشین تازه، clone، pull، metrics'],
    startDialog: [
      {
        title: 'وقتی لپ‌تاپ می‌میرد',
        markdown: 'گیت تاریخچه pointer را دارد. remote داده بایت را.',
      },
      {
        title: 'مسیر بازیابی را تمرین کنید',
        markdown:
          'بازیابی به دو چیز نیاز دارد: تاریخچه‌ی Git (pointerها، `dvc.yaml`، `dvc.lock`) و یک remote سالم. بعد از گم شدن لپ‌تاپ، `git clone` و سپس `dvc pull` پروژه را بازمی‌سازد و اشیای موجود را رد می‌کند. remote را پیش از فاجعه بررسی کنید: `dvc status --cloud` اشیایی را نشان می‌دهد که محلی هستند ولی هرگز به storage نرسیده‌اند — دقیقاً همان‌هایی که یک دیسک خراب با خود می‌برد.',
      },
    ],
  },
  'mastery-2': {
    seriesTitle: 'همکاری و CI',
    name: 'تصمیم Git-LFS در برابر DVC',
    objective: 'ابزار درست را با شاهد انتخاب کنید: LFS vs DVC، بعد tracking داده‌ی ML با DVC.',
    learning: ['LFS = blob در remote گیت؛ DVC = pointer + store شیء + pipeline', 'تقریباً همیشه برای ML: DVC'],
    fieldNotes: ['جدول تصمیم در wiki تیم، نه فولکلور چت'],
    startDialog: [
      {
        title: 'درست و کسل‌کننده انتخاب کن',
        markdown: 'repro/exp/cache/pipeline → DVC.',
      },
      {
        title: 'با رها کردن LFS چه عوض می‌شود',
        markdown:
          'Git LFS محتوای فایل را روی میزبان Git نگه می‌دارد و فایل‌ها را یکی‌یکی version می‌کند. DVC محتوا را در storageی که شما انتخاب می‌کنید (S3، GCS، Azure، SSH، …) نگه می‌دارد و pipeline (`dvc.yaml`)، experiment و metric هم اضافه می‌کند. مهاجرت یعنی `git lfs untrack`، سپس برای هر آرتیفکت `dvc add` و `dvc push`؛ از آن پس هم‌تیمی‌ها به remote DVC دسترسی می‌خواهند، نه فقط به میزبان Git.',
      },
    ],
  },
  'mastery-3': {
    seriesTitle: 'همکاری و CI',
    name: 'CI secrets + pull + comment',
    objective:
      'بدنه‌ی CI تولیدی را وقتی remote پشتیبانی‌شده با secret از قبل کانفیگ شده اجرا کنید: pull، repro، گزارش metrics، کامنت CML، commit رسید.',
    learning: ['credential در CI secrets، هرگز در .dvc/config', 'بدنه‌ی CI یعنی pull → repro → comment'],
    fieldNotes: ['OIDC/role auth بهتر از کلیدهای بلندمدت'],
    startDialog: [
      {
        title: 'CI که تیم امنیت تأیید می‌کند',
        markdown: 'Secret در vault. کانفیگ remote در گیت. بایت در remote داده.',
      },
      {
        title: 'secretها چطور به DVC می‌رسند',
        markdown:
          'URL remote در `.dvc/config` است؛ credentialها از secret store در CI به‌شکل متغیرهای محیطی می‌آیند (`AWS_ACCESS_KEY_ID`، `AWS_SECRET_ACCESS_KEY`) یا بهتر، نقش OIDCی که job به‌عهده می‌گیرد. `dvc pull` و `dvc push` آن‌ها را از محیط می‌خوانند و `cml` `REPO_TOKEN` خودش را می‌گیرد. چیزی در ریپو نوشته نمی‌شود.',
      },
    ],
  },
  'mastery-4': {
    seriesTitle: 'همکاری و CI',
    name: 'promote آرتیفکت: مدل تا release',
    objective:
      'آزمایش برنده را به روایت release ارتقا دهید: apply (پارامتر و خروجی‌ها برمی‌گردند)، push بایت‌ها، commit کردن params و lock در Git.',
    learning: [
      'release = پارامتر apply‌شده + آرتیفکت‌های برگشته + بایت push‌شده + git commit',
      'exp apply یعنی deploy نیست؛ push بدون تاریخچه release نیست',
      'commit انتشار همان چیزی است که تیم حادثه می‌پرسد',
    ],
    fieldNotes: [
      'چک‌لیست release: apply → push → commit → tag',
      'وزن‌ها را ایمیل نکنید؛ commit انتشار قرارداد است',
    ],
    startDialog: [
      {
        title: 'از برنده تا release',
        markdown:
          'جست‌وجو (`exp`) → انتخاب (`show`) → apply → **اشتراک** (`push`) → **حافظه** (`git commit`). `apply` خروجی‌های برنده را برگردانده، پس چیزی برای ساختن دوباره نیست.',
      },
      {
        title: 'چه چیزی در commit انتشار می‌رود',
        markdown:
          '`git add params.yaml dvc.lock` — مقدارهای برنده به‌علاوه‌ی رسید همان اجرا. خودِ فایل مدل از Git بیرون می‌ماند (DVC ignore‌اش می‌کند)؛ `dvc push` بایت‌هایش را روی remote گذاشته. commit را tag کنید (`git tag v1.4.0`) تا کاربران `dvc.api` و `dvc pull` بتوانند pinش کنند.',
      },
    ],
  },
  'mastery-5': {
    seriesTitle: 'ریویو و مقایسه',
    name: 'ریویوی plot ماتریس خطا',
    objective: 'قالب confusion را رندر و plots diff بگیرید — ریویوی طبقه‌بندی بدون نوت‌بوک.',
    learning: ['قالب نحوه‌ی خواندن را کد می‌کند', 'plots diff دوقلو metrics diff است'],
    fieldNotes: ['release طبقه‌بندی همیشه confusion matrix دارد'],
    startDialog: [
      {
        title: 'ماتریس را بخوان، نه میانگین را',
        markdown: '`dvc plots show --template confusion`.',
      },
      {
        title: 'ورودی قالب confusion',
        markdown:
          'قالب `confusion` جدولی می‌خواهد که برای هر پیش‌بینی یک ردیف دارد: ستون `actual` و ستون `predicted` (CSV، TSV یا JSON). آن را در `dvc.yaml` زیر `plots:` با `template: confusion`، `x: actual` و `y: predicted` اعلام کنید. بعد `dvc plots diff` می‌تواند ماتریس را در دو revision روی هم بیندازد.',
      },
    ],
  },
  'mastery-6': {
    seriesTitle: 'متا و قرارداد',
    name: 'خروجی‌های no-cache و داده‌ی خارجی',
    objective:
      'stageای تعریف کنید که خروجی‌اش cache را دور می‌زند (`-O`)، repro کنید و فرق آن با خروجی خارجی را بفهمید.',
    learning: [
      '-O / --outs-no-cache (در dvc.yaml برابر cache: false): DVC هش فایل را ردگیری می‌کند ولی در cache کپی‌اش نمی‌کند',
      'خروجی no-cache ignore نمی‌شود، پس اگر کوچک باشد Git می‌تواند نگهش دارد',
      'خروجی خارجی (مسیر s3://) قابلیت دیگری است و توصیه نمی‌شود؛ version‌دهی ابری یا import-url بهتر است',
    ],
    fieldNotes: [
      'فایل‌های گزارش کوچک، metrics و داده‌ی plot: cache: false تا ریویوران در PR ببینند',
      'جدول‌های عظیم warehouse: از کد به آن‌ها ارجاع دهید، نه خروجی stage',
    ],
    startDialog: [
      {
        title: 'cache می‌شود یا نه؟',
        markdown:
          'خروجی عادی `-o` به cache می‌رود و gitignore می‌شود. `-O` / `--outs-no-cache` مقدار `cache: false` می‌گذارد: فایل در workspace می‌ماند و **Git می‌تواند آن را version کند**، در حالی که `dvc.lock` هنوز هشش را ثبت می‌کند.\n\nمعنایش «بیرون از ریپو است» **نیست**.',
      },
      {
        title: 'خروجی خارجی چیز دیگری است',
        markdown:
          'خروجی *خارجی* مسیری بیرون از workspace است مثل `s3://bucket/file` و `--external` به‌علاوه‌ی یک remote cache می‌خواهد. قابلیتی قدیمی با ملاحظات زیاد است: اگر داده از قبل در bucket است، با `dvc import-url` یا version‌دهی خود bucket ردگیری‌اش کنید و خروجی stage را محلی نگه دارید.',
      },
    ],
  },
  'mastery-7': {
    seriesTitle: 'Remoteها',
    name: 'auth مسیر بدون نشتی secret',
    objective: 'remote تیم را پیکربندی کنید: non-secret در config و secret در کانفیگ محلی با --local — credentials هرگز commit نشود.',
    learning: ['URL و non-secret در .dvc/config', 'سکرت‌ها با --local در .dvc/config.local (که gitignore است)', 'remote modify --local مانع نشت به گیت می‌شود'],
    fieldNotes: ['.dvc/config را در PR ببینید — کلید بلندمدت نه', 'از --local برای سکرت‌های محلی سیستم استفاده کنید'],
    startDialog: [
      {
        title: 'credential فایل پروژه نیست',
        markdown:
          'URL/پروفایل را به اشتراک بگذارید. سکرت‌ها را با `dvc remote modify --local` در config.local ثبت کنید.',
      },
      {
        title: 'اعتبارنامه‌ها کجا می‌توانند باشند',
        markdown:
          'DVC اعتبارنامه‌های ابری را از جاهای معمول هم می‌خواند: متغیرهای محیطی (`AWS_ACCESS_KEY_ID`، `GOOGLE_APPLICATION_CREDENTIALS`)، فایل‌های profile مشترک (`~/.aws/credentials`) و نقش‌های instance یا OIDC — هیچ‌کدام به ریپو دست نمی‌زنند. `dvc remote modify --local` را برای تنظیم‌های مخصوص هر دستگاه نگه دارید. اگر رازی یک بار وارد تاریخچه‌ی Git شد، آن را عوض کنید (rotate)؛ حذف commit کافی نیست.',
      },
    ],
  },
  'mastery-8': {
    seriesTitle: 'همکاری و CI',
    name: 'Transfer: تغییر داده بدون دستورالعمل',
    objective: 'بدون لیست مراحل. داده dirty، pointer commit، اشیا push.',
    learning: ['آزمون transfer: مسیر را خودتان طراحی کنید', 'Done = status تمیز + pointer در گیت + بایت روی remote'],
    fieldNotes: ['گیت آن‌بوردینگ/استخدام مهندس داده'],
    startDialog: [
      {
        title: 'آزمایشگاه باز',
        markdown: 'این level **دستورالعمل نمی‌دهد**. هدف یک وضعیت است.',
      },
      {
        title: 'تأیید یک وضعیت هدف',
        markdown:
          'به متن سبز آخرین دستور اعتماد نکنید؛ از وضعیت بپرسید. `dvc status` برای workspace، `dvc status --cloud` برای cache در برابر remote، `git status` و `git log` برای آنچه Git می‌داند. سه پاسخ تمیز = تمام.',
      },
    ],
  },
  'xfer-1': {
    seriesTitle: 'انتقال',
    name: 'پزشکی قانونی pointer: اثبات درک',
    objective: 'فرمان جدید نیست. pointer را بخوانید، گیت و DVC را توضیح دهید، صحت را با status/diff اثبات کنید.',
    learning: ['فایل pointer قرارداد است: path + md5', 'اگر نمی‌توانید .dvc را توضیح دهید، مهارت مال شما نیست'],
    fieldNotes: ['پرسش‌های حادثه از همین‌جا شروع می‌شود'],
    startDialog: [
      {
        title: 'توضیح بده وگرنه مال تو نیست',
        markdown: 'این level **شاهد** می‌خواهد، نه فلگ جدید.',
      },
      {
        title: 'داخل یک فایل .dvc چه چیزی است',
        markdown:
          'زیر `outs` مقدارهای `md5`، `size` و `path` آمده‌اند؛ برای یک پوشه `nfiles` و یک md5 با پسوند `.dir` اضافه می‌شود که نام یک شیء manifest در cache است. این فایل محتوا را توصیف می‌کند و هرگز خودِ محتوا را ندارد. اگر `git show HEAD:data/data.xml.dvc` و `dvc status` درباره‌ی md5 با هم نخوانند، workspace است که از خط خارج شده.',
      },
    ],
  },
  'xfer-2': {
    seriesTitle: 'انتقال',
    name: 'تحویل زیر فشار — بدون حلقه‌ی گم‌شده',
    objective: 'تحویل: dirty → شاهد → pointer → remote → تاریخچه.',
    learning: ['بدون push/commit pointer هم‌تیمی بعدی می‌شکند', 'status قبل از commit قابل مذاکره نیست'],
    fieldNotes: ['تعریف Done برای کار داده'],
    startDialog: [
      {
        title: 'شبکه‌ی ایمنی نیست',
        markdown: 'شما مهندس on-call هستید. تحویل را تمام کنید.',
      },
      {
        title: 'چرا این ترتیب',
        markdown:
          '`dvc add` (cache + pointer) → `dvc push` (بایت‌ها به remote می‌رسند) → `git commit` / `git push` (pointer دیده می‌شود). اگر Git اول برود، هم‌تیمی pointerی می‌گیرد که داده‌اش هنوز روی remote نیست. `dvc status --cloud` پیش از اعلام این را می‌گیرد.',
      },
    ],
  },
  'xfer-3': {
    seriesTitle: 'انتقال',
    name: 'طراحی pipeline بدون دستورالعمل',
    objective: 'stage آموزش را خودتان طراحی کنید: deps، params، outs، metrics. بعد repro + DAG.',
    learning: ['deps = باطل‌سازی، params = اهرم‌ها، metrics = شاهد', 'deps جامانده یعنی باگ خاموش تولید'],
    fieldNotes: ['تمرین مصاحبه: اول طراحی، بعد تایپ'],
    startDialog: [
      {
        title: 'شما طراحی می‌کنید',
        markdown: 'اول فکر، بعد تایپ. بعد repro + dag.',
      },
      {
        title: 'چک‌لیست قرارداد',
        markdown:
          'پیش از تایپ: کدام فایل‌ها باید stage را باطل کنند (`-d`: داده **و** کد)؟ کدام هایپرپارامترها (`-p`)؟ آرتیفکت چیست (`-o`) و کدام فایل metrics است که `dvc metrics` بتواند بخواند (`-m`)؟ stageای که یکی از این‌ها را نداشته باشد یا هرگز دوباره اجرا نمی‌شود یا همیشه.',
      },
    ],
  },
  'xfer-4': {
    seriesTitle: 'انتقال',
    name: 'چرخه‌ی آزمایش + بازیابی خطا',
    objective:
      'یک پیکربندی بد و یک خوب اجرا کنید، با شاهد انتخاب کنید، برنده را apply کنید و بررسی کنید params، خروجی‌ها و status با هم می‌خوانند.',
    learning: [
      'اجرای بد هم داده است — نگهش دارید، یاد بگیرید، بعد برنده را apply کنید',
      'نام‌گذاری اجراها (-n) apply و diff را بی‌ابهام می‌کند',
      'apply وقتی تمام است که params show و status بخوانند؛ بعد commit',
    ],
    fieldNotes: [
      'اجرای ناموفق را قبل از خواندن exp show پاک نکنید',
      'چک‌لیست بعد از apply: params → status → commit کردن params.yaml + dvc.lock',
    ],
    startDialog: [
      {
        title: 'تلاش اول عمداً غلط است',
        markdown:
          'اول یک هایپرپارامتر **بد** اجرا کنید و اسم بگذارید (`-n bad`).\n\nبعد بهتر (`-n good`). با `exp show` انتخاب و برنده را با نامش apply کنید.',
      },
      {
        title: 'بازیابی بدون وحشت',
        markdown:
          'اگر اجرای اشتباه را apply کردید چیزی از دست نرفته: هر دو آزمایش ذخیره‌اند. `dvc exp apply bad` / `dvc exp apply good` workspace را در چند ثانیه بین آن‌ها جابه‌جا می‌کند. commit نقطه‌ی بی‌بازگشت است: apply کنید، `dvc params show` و `dvc status` را ببینید و بعد commit.',
      },
    ],
  },
  'xfer-5': {
    seriesTitle: 'انتقال',
    name: 'مرز ریویوی PR: شاهد یا رد',
    objective: 'بسته‌ی شاهد ML PR را بسازید. بدون حرکت metric ادغام نکنید.',
    learning: ['مرز ریویو: params + metrics + plots diff', 'بدون حرکت metric یعنی نه'],
    fieldNotes: ['این قالب ریویوی تیم شما باید باشد'],
    startDialog: [
      {
        title: 'شما ریویور هستید',
        markdown: 'سه diff. اگر اثر نیست، level قبول نیست.',
      },
      {
        title: 'وقتی metricها تکان نخورده‌اند',
        markdown:
          'اگر `dvc metrics diff` هیچ تغییری نشان نمی‌دهد، بپرسید PR برای چیست: baseline اشتباه (`dvc metrics diff main` با branch دیگری مقایسه می‌کند)، stageای که دوباره اجرا نشده (`dvc status`) یا فایل metricی که زیر `metrics:` اعلام نشده. PRی که کد را عوض می‌کند ولی شواهدش خالی است، درخواست شواهد است نه درخواست تأیید.',
      },
    ],
  },
  'xfer-6': {
    seriesTitle: 'انتقال',
    name: 'حادثه: ترمیم زنجیره‌ی شکسته',
    objective: 'فایل رفته است. زنجیره pointer → cache/remote → workspace را بازسازی کنید.',
    learning: ['فایل گم‌شده ≠ داده گم‌شده', 'fetch در برابر pull ترتیب ترمیم است'],
    fieldNotes: ['این runbook ساعت ۲ بامداد است'],
    startDialog: [
      {
        title: 'فایل نیست',
        markdown: '`data/data.xml` از دیسک رفته. **بدون وحشت ترمیم کنید.',
      },
      {
        title: 'ترتیب عیب‌یابی',
        markdown:
          'زنجیره را از ارزان‌ترین بررسی شروع کنید: (۱) `git log -- data/data.xml.dvc` — آیا pointer commit شده؟ (۲) `dvc status` — آیا workspace با آن می‌خواند؟ (۳) `dvc fetch` — آیا اشیا در cache یا remote هستند؟ (۴) `dvc checkout`. اولین حلقه‌ی شکسته نشان می‌دهد زنجیره کجا پاره شده؛ مستقیم سراغ `dvc pull` نروید و امیدوار نباشید.',
      },
    ],
  },
  'xfer-7': {
    seriesTitle: 'انتقال',
    name: 'یکپارچگی lock: رسید هرگز دروغ نمی‌گوید',
    objective: 'lock کهنه بسازید، فقط با repro درست کنید، بعد yaml و lock را هم‌داستان اثبات کنید.',
    learning: ['lock را دستی ویرایش نکنید', 'lock کهنه = رسید دروغ برای هر clone'],
    fieldNotes: ['CI باید fail کند اگر lock بعد از repro dirty بود'],
    startDialog: [
      {
        title: 'رسید باید راست بگوید',
        markdown: 'پارامتر را عوض کنید. با `repro` درست کنید.',
      },
      {
        title: 'درست نگه داشتن dvc.lock در ریویو',
        markdown:
          '`dvc.lock` را خروجی تولیدشده بدانید: PRی که آن را با دست عوض کرده مشکوک است. دو نگهبان ارزان در CI: `dvc status` بعد از checkout باید «Data and pipelines are up to date.» چاپ کند و `dvc repro` روی PR نباید فایل را تغییر دهد (`git diff --exit-code dvc.lock`). `dvc repro --dry` نشان می‌دهد چه چیزی اجرا می‌شد، بدون اینکه اجرایش کند.',
      },
    ],
  },
  'prod-1': {
    seriesTitle: 'عادت‌های تیمی و محیط عملیاتی',
    name: 'هوک‌های Git: بگذارید Git به‌جای شما DVC را اجرا کند',
    objective:
      'هوک‌های Git مربوط به DVC را نصب کنید، سپس با `git checkout HEAD~1` یک commit به عقب بروید و بررسی کنید که داده‌ها بدون اجرای دستی `dvc checkout` همراه کد برگشته‌اند.',
    learning: [
      'dvc install سه هوک در .git/hooks می‌نویسد: pre-commit دستور dvc status، post-checkout دستور dvc checkout و pre-push دستور dvc push را اجرا می‌کند',
      'با هوک post-checkout، دستور git checkout <ref> کد و داده را با هم جابه‌جا می‌کند؛ بدون آن، workspace روی داده‌ی جدیدتر می‌ماند',
      'هوک‌ها به یک clone تعلق دارند و نسخه‌بندی نمی‌شوند: هر هم‌تیمی باید dvc install بزند، یا تیم فایل .pre-commit-config.yaml را با --use-pre-commit-tool به اشتراک بگذارد',
    ],
    fieldNotes: [
      'عبارت «dvc install را اجرا کنید» را در بخش راه‌اندازی README، کنار خط pip install بنویسید',
      'شکست هوک pre-push یک ویژگی است: جلوی رسیدن کد به remote را می‌گیرد، پیش از آنکه داده‌اش push شده باشد',
      'CI به هوک‌ها نیاز ندارد؛ dvc pull و dvc repro را صریحاً اجرا می‌کند',
    ],
    startDialog: [
      {
        title: 'کد جابه‌جا می‌شود، داده جا می‌ماند',
        markdown:
          'برای بازتولید یک گزارش باگ، commit هفته‌ی گذشته را checkout می‌کنید. Git کد و pointerهای `.dvc` را به عقب برمی‌گرداند، اما `data/data.xml` روی دیسک همان نسخه‌ی جدید می‌ماند تا کسی `dvc checkout` را اجرا کند.\n\nاگر این گام را فراموش کنید، داده‌ی امروز را با کد هفته‌ی پیش اشکال‌زدایی می‌کنید. عددها باز هم منطقی به نظر می‌رسند و همین خطرناک است.',
      },
      {
        title: 'سه هوک، یک بار برای هر clone',
        markdown:
          '`dvc install` سه هوک Git را در `.git/hooks` می‌نویسد: **pre-commit** دستور `dvc status`، **post-checkout** دستور `dvc checkout` و **pre-push** دستور `dvc push` را اجرا می‌کند.\n\nپس از آن `git checkout HEAD~1` کد و داده را با هم جابه‌جا می‌کند و `git push` وقتی داده به remote نمی‌رسد متوقف می‌شود. خطا روی لپ‌تاپ خودتان دیده می‌شود، نه در `dvc pull` یک هم‌تیمی در صبح روز بعد.\n\nهوک‌ها در `.git` هستند که Git آن را نسخه‌بندی نمی‌کند؛ پس هر هم‌تیمی یک بار برای هر clone دستور `dvc install` را می‌زند. تیم‌هایی که از ابزار pre-commit استفاده می‌کنند، به‌جای آن `dvc install --use-pre-commit-tool` را اجرا و فایل `.pre-commit-config.yaml` را commit می‌کنند.',
      },
    ],
  },
  'prod-2': {
    seriesTitle: 'عادت‌های تیمی و محیط عملیاتی',
    name: 'ذخیره و هرس آزمایش‌ها',
    objective:
      'دو نرخ یادگیری را که دستی امتحان کرده‌اید با `dvc exp save` به‌صورت آزمایش‌های نام‌دار ثبت کنید، سپس آزمایش ناموفق را با `dvc exp remove` حذف کنید تا فقط آزمایش مفید در فهرست بماند.',
    learning: [
      'dvc exp save -n <name> پارامترها و متریک‌های فعلی workspace را بدون اجرای هیچ stage به‌عنوان یک آزمایش ذخیره می‌کند',
      'بدون -n، DVC یک نام «صفت-اسم» می‌سازد؛ ذخیره‌ی دوباره‌ی یک نام موجود فقط با -f ممکن است',
      'dvc exp remove <name> یک آزمایش را حذف می‌کند؛ -A همه را، --queue آزمایش‌های صف‌شده را و -g <git-remote> آزمایش را از یک Git remote پاک می‌کند',
    ],
    fieldNotes: [
      'آزمایش را به نام تغییر (lr-005) بنامید، نه به نام خودتان: بحث در pull request به همین نام ارجاع می‌دهد',
      'پیش از اشتراک‌گذاری هرس کنید: `dvc exp push origin -A` همه‌ی آزمایش‌ها را می‌فرستد (بدون `-A` و بدون نام، فقط آزمایش‌های مبتنی بر کامیت فعلی را می‌فرستد)، پس اول بن‌بست‌ها را پاک کنید',
      'dvc exp gc در DVC 3 دیگر وجود ندارد؛ dvc exp remove جای آن را گرفته است',
    ],
    startDialog: [
      {
        title: 'نتیجه‌هایی که فقط در workspace شما هستند',
        markdown:
          'دو نرخ یادگیری را دستی امتحان کرده‌اید. هر نتیجه در `params.yaml` و `metrics.json` داخل workspace است و ویرایش بعدی آن را رونویسی می‌کند. `git stash` کمکی نمی‌کند، چون خودِ این فایل‌ها همان آزمایش‌اند.\n\nاجرای دوباره‌ی کل pipeline فقط برای ثبت چیزی که از قبل دارید، همان توان پردازشی را که پیش‌تر هزینه کرده‌اید هدر می‌دهد.',
      },
      {
        title: 'exp save ثبت می‌کند، exp remove هرس می‌کند',
        markdown:
          '`dvc exp save -n lr-005` پارامترها و متریک‌هایی را که همین حالا در workspace هستند به‌عنوان یک آزمایش ذخیره می‌کند. هیچ stageای اجرا نمی‌شود؛ پس stageهای قدیمی همچنان قدیمی می‌مانند و چیزی دوباره محاسبه نمی‌شود. بدون `-n` خود DVC نامی مثل `brisk-otter` می‌سازد و ذخیره‌ی دوباره‌ی نام موجود شکست می‌خورد، مگر `-f` بدهید.\n\nفهرست سریع بلند می‌شود. `dvc exp remove lr-09` یک آزمایش را پاک می‌کند، `dvc exp remove -A` همه را، و `dvc exp remove -g origin lr-09` پس از `dvc exp push` آن را از یک Git remote حذف می‌کند. در تیم، آزمایش‌ها مشترک‌اند و فهرست مرتب بخشی از review است: وگرنه همه باید از کنار بن‌بست‌های شما رد شوند. (`dvc exp gc` در DVC 3 حذف شد.)',
      },
    ],
  },
  'prod-3': {
    seriesTitle: 'عادت‌های تیمی و محیط عملیاتی',
    name: 'یک قالب، چهار stage: vars و matrix',
    objective:
      'قالب `vars` و `matrix` را در `dvc.yaml` بخوانید، سپس هر چهار stage تولیدشده را با یک `dvc repro train` بازتولید کنید.',
    learning: [
      'vars یک مقدار را یک بار تعریف می‌کند؛ ${name} آن را در deps، outs و cmd دوباره به کار می‌برد',
      'matrix یک قالب stage را به یک stage برای هر ترکیب گسترش می‌دهد، با نام‌هایی مثل train@cnn-a و train@cnn-b؛ ${item.model} مقدار جاری است',
      'dvc repro train همه‌ی stageهای تولیدشده را اجرا می‌کند و dvc repro train@cnn-a فقط یکی را؛ dvc dag و dvc status نام‌های تولیدشده را نشان می‌دهند',
    ],
    fieldNotes: [
      'شبکه را کوچک نگه دارید: هر ترکیب یک stage، یک خروجی و یک ورودی در dvc.lock است',
      'برای شبکه‌ی ثابت از matrix و برای sweepهای باز از dvc exp run -S استفاده کنید',
      'dvc stage add نمی‌تواند matrix بسازد؛ آن را دستی در dvc.yaml می‌نویسید',
    ],
    startDialog: [
      {
        title: 'stageهای کپی‌شده از هم دور می‌شوند',
        markdown:
          'دو مدل و دو مجموعه ویژگی یعنی چهار stage تقریباً یکسان. اگر دستی کپی شوند از هم فاصله می‌گیرند: یکی فلگ جدید می‌گیرد، دیگری فلگ قدیمی را نگه می‌دارد و کسی نمی‌فهمد تا وقتی که یک نتیجه دیگر بازتولید نشود.\n\nیک قالب این کپی‌ها را از بین می‌برد.',
      },
      {
        title: 'خواندن یک stage از نوع matrix',
        markdown:
          'در `dvc.yaml`، بخش `vars` مقدارهایی را نگه می‌دارد که بیش از یک بار لازم‌اند و `matrix` گزینه‌ها را فهرست می‌کند. DVC برای هر ترکیب یک stage می‌سازد: `train@cnn-a`، `train@cnn-b`، `train@xgb-a` و `train@xgb-b`. داخل قالب، `${item.model}` و `${item.feature}` به ترکیب جاری تبدیل می‌شوند و `${data}` از `vars` می‌آید.\n\n`cat dvc.yaml` قالب را نشان می‌دهد، نه stageهای تولیدشده را؛ `dvc dag` و `dvc status` نام‌های گسترش‌یافته را نشان می‌دهند. `dvc repro train` کل گروه را اجرا می‌کند و `dvc repro train@cnn-a` فقط یکی را؛ با همین می‌توانید یک خانه‌ی شکست‌خورده‌ی شبکه را بدون دست زدن به سه‌تای دیگر دوباره اجرا کنید.',
      },
    ],
  },
  'prod-4': {
    seriesTitle: 'عادت‌های تیمی و محیط عملیاتی',
    name: 'کلون تازه: repro --pull',
    objective:
      'تازه پروژه را clone کرده‌اید. dvc.lock به‌روز است، اما نه مدل و نه داده‌ی آماده‌شده روی دیسک است. خروجی‌ها را به‌جای آموزش دوباره، با `dvc repro --pull` برگردانید.',
    learning: [
      'روی یک clone تازه، dvc.lock می‌گوید stageها به‌روزند، اما خروجی‌ها نه در workspace هستند و نه در cache محلی',
      'dvc repro ساده، نبودنِ خروجی‌ها را دلیلی برای اجرای دوباره‌ی stage می‌داند',
      'dvc repro --pull خروجی‌های گمشده را از remote دانلود می‌کند؛ اگر remote آن‌ها را نداشته باشد stage به‌هرحال اجرا می‌شود، و --allow-missing چنین stageهایی را به‌جای آن رد می‌کند',
    ],
    fieldNotes: [
      'در CI، dvc repro --pull stageهای بدون تغییر را از remote برمی‌گرداند و فقط چیزی را که واقعاً عوض شده آموزش می‌دهد',
      'dvc repro --allow-missing بررسی ارزان CI برای اطمینان از کهنه‌نبودن چیزی است: هرگز داده دانلود نمی‌کند',
      'خروجی هر stageای را که commit می‌کنید push هم بکنید، وگرنه --pull چیزی برای دانلود ندارد',
    ],
    startDialog: [
      {
        title: 'شروع گران روز',
        markdown:
          'مخزن را روی یک دستگاه جدید clone می‌کنید و `dvc repro` را می‌زنید. DVC می‌بیند خروجی‌های فهرست‌شده در `dvc.lock` روی دیسک نیستند، stageها را کهنه می‌داند و دوباره آموزش را شروع می‌کند: ساعت‌ها محاسبه برای ساختن فایل‌هایی که همین حالا روی remote هستند.',
      },
      {
        title: 'به‌جای محاسبه، دانلود',
        markdown:
          '`dvc status` درست بعد از clone بخش `changed outs` را با برچسب `not in cache` نشان می‌دهد: stageها قفل‌شده و به‌روزند، فقط بایت‌ها نیستند. `dvc repro --pull` هر stage را با `dvc.lock` مقایسه می‌کند؛ اگر چیزی تغییر نکرده باشد، خروجی‌های گمشده را از remote پیش‌فرض دانلود می‌کند و بدون اجرای چیزی جلو می‌رود. اگر remote یک خروجی را نداشته باشد، stage مثل همیشه اجرا می‌شود؛ بنابراین این فلگ به‌عنوان پیش‌فرض بی‌خطر است.\n\nبا `--allow-missing`، DVC stageهایی را که تنها تفاوتشان نبودنِ داده است رد می‌کند و چیزی دانلود نمی‌کند؛ مناسب یک کار CI که فقط می‌خواهد مطمئن شود کسی اجرای `dvc repro` را فراموش نکرده است.',
      },
    ],
  },
  'prod-5': {
    seriesTitle: 'عادت‌های تیمی و محیط عملیاتی',
    name: 'کش مشترک تیم',
    objective:
      'پروژه را به یک پوشه‌ی cache در سطح تیم وصل کنید، آن را برای گروه قابل‌نوشتن کنید، به‌جای کپی از لینک استفاده کنید و `.dvc/config` مشترک را commit کنید تا هر clone همین تنظیمات را بگیرد.',
    learning: [
      'dvc cache dir <path> مقدار cache.dir را در .dvc/config می‌گذارد؛ با --local در .dvc/config.local می‌نشیند و فقط روی همان دستگاه می‌ماند',
      'cache.shared group فایل‌های cache را برای گروه قابل‌نوشتن می‌کند تا چند کاربر یک cache را پر کنند؛ cache.type symlink,hardlink به‌جای کپی لینک می‌سازد و DVC مقدارهای ناشناخته را رد می‌کند',
      'dvc checkout --relink فایل‌های workspace را دوباره به‌صورت لینک به cache جدید می‌سازد؛ این تنظیمات یک تغییر عادی Git روی .dvc/config هستند',
    ],
    fieldNotes: [
      'cache مشترک را روی همان فایل‌سیستمِ workspaceها بگذارید، وگرنه hardlink ممکن نیست',
      'هرگز اعتبارنامه را در .dvc/config مشترک ننویسید؛ برای مقدارهایی که در هر دستگاه فرق دارند از --local استفاده کنید',
      'با لینک، فایل ردیابی‌شده خودِ شیء cache است: آن را جایگزین کنید و دوباره dvc add بزنید، نه اینکه درجا ویرایشش کنید',
    ],
    startDialog: [
      {
        title: 'پنج نسخه از یک مجموعه‌داده',
        markdown:
          'پنج نفر یک سرور GPU را به اشتراک می‌گذارند و هرکدام `dvc pull` می‌زنند. هرکس یک cache خصوصی ۵۰ گیگابایتی داخل پروژه‌ی خودش می‌گیرد و تا جمعه دیسک پر می‌شود. هر پنج cache فایل‌های یکسان دارند، چون DVC هر شیء را با هش محتوایش نام‌گذاری می‌کند.',
      },
      {
        title: 'یک cache، سه تنظیم و یک commit',
        markdown:
          'cache مشترک پیکربندی است، نه ابزاری جدید. `dvc cache dir /mnt/shared/dvc-cache` مشخص می‌کند cache کجا باشد، `dvc config cache.shared group` فایل‌هایش را برای گروه قابل‌نوشتن می‌کند تا هر هم‌تیمی بتواند چیزی اضافه کند، و `dvc config cache.type symlink,hardlink` باعث می‌شود workspaceها به cache اشاره کنند، نه از آن کپی بگیرند. DVC مقدارها را بررسی می‌کند و مقدارهای ناشناخته مثل `cache.shared everyone` را رد می‌کند.\n\nپس از تغییر نوع لینک، `dvc checkout --relink` را اجرا کنید و بعد `cat .dvc/config` و `git status` را ببینید: تنظیمات در فایل commit‌شده‌ی `.dvc/config` هستند، پس یک `git commit` همین چیدمان را به هر clone می‌دهد. مسیری که در هر دستگاه فرق دارد باید به‌جای آن در `.dvc/config.local` (با `--local`) برود.',
      },
    ],
  },
  'prod-6': {
    seriesTitle: 'عادت‌های تیمی و محیط عملیاتی',
    name: 'رجیستری مدل با تگ‌های GTO',
    objective:
      'نسخه‌ی v1.0.0 از آرتیفکت `model` را که در dvc.yaml تعریف شده ثبت کنید، با GTO به stage با نام prod اختصاص دهید و همان نسخه را با `dvc artifacts get` دانلود کنید.',
    learning: [
      'بخش artifacts: در dvc.yaml مدل‌ها و مجموعه‌دادگانی را که تیم منتشر می‌کند نام می‌برد (path و type)',
      'GTO یک CLI جداست: gto register تگ Git با نام model@v1.0.0 و gto assign تگ model#prod#1 را می‌سازد؛ هر commit یک نسخه دارد، پس نسخه‌ی بعدی commit جدید می‌خواهد',
      'dvc artifacts get <url> <name> با --rev <version> یا --stage <stage> همان نسخه‌ی ثبت‌شده را در مسیر -o دانلود می‌کند و تا وقتی چیزی ثبت نشده باشد شکست می‌خورد',
    ],
    fieldNotes: [
      'بر پایه‌ی stage مستقر کنید، نه مسیر فایل: سرویس «model در prod» را می‌خواهد و ارتقا یک تگ Git می‌شود',
      'تگ‌ها را با git push --tags بفرستید، وگرنه کس دیگری رجیستری را نمی‌بیند',
      'dvc artifact و dvc register دستور نیستند؛ فعل‌های رجیستری به gto تعلق دارند',
    ],
    startDialog: [
      {
        title: 'کدام مدل در محیط عملیاتی است؟',
        markdown:
          'کسی می‌پرسد کدام فایل مدل الان ترافیک را جواب می‌دهد. پاسخ در یک رشته‌ی چت، در نام فایلی مثل `final_v2_REAL.pkl` یا در حافظه‌ی یک نفر است. رجیستری این حدس‌زدن را با سابقه‌ای جایگزین می‌کند که کل تیم می‌تواند از آن بپرسد.',
      },
      {
        title: 'تگ‌های Git به‌عنوان رجیستری',
        markdown:
          'مدل را یک بار در `dvc.yaml` زیر `artifacts:` تعریف کنید (path و type). سپس از CLI جداگانه‌ی GTO استفاده کنید: `gto register model --version v1.0.0` تگ Git با نام `model@v1.0.0` را روی commit فعلی می‌سازد و `gto assign model --version v1.0.0 --stage prod` تگ `model#prod#1` را. اگر بعداً prod را دوباره اختصاص دهید `model#prod#2` ساخته می‌شود و بزرگ‌ترین شماره معتبر است.\n\nمصرف‌کننده‌ها هرگز به branch شما دست نمی‌زنند: `dvc artifacts get <registry-url> model --stage prod -o deploy/model.pkl` تگ را پیدا می‌کند، commit آن را می‌یابد و فایل را همان‌طور که آنجا بود دانلود می‌کند. GTO فقط تگ Git می‌نویسد؛ آن‌ها را push کنید (`git push --tags`) تا دیگران رجیستری را ببینند. ارتقا و بازگشت هرکدام یک تگ است.',
      },
    ],
  },
};
