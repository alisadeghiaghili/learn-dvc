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
        'خروجی‌ها مشخص می‌کنند DVC بعد از اجرای موفق چه چیزی را ردگیری/کش کند.',
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
        'انحراف (drift) بین pointer و محتوا برای داده‌ی ردگیری‌شده را نشان می‌دهد (سطح هش، نه تکه‌های متن).',
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
    'dvc-gc': {
      title: 'dvc gc',
      lines: [
        'اشیای cache بدون ارجاع workspace/Git را حذف می‌کند.',
        'قبل از gc چیزی را که تولید لازم دارد push کنید — وگرنه آخرین نسخه را می‌کشید.',
        'CI runner: همان SHA که shipping می‌شود را gc کنید، نه کل انبار را.',
      ],
    },
    'dvc-plots': {
      title: 'dvc plots',
      lines: [
        'plot آرتیفکت ریویو است (قالب Vega)، نه اسکرین‌شات نوت‌بوک.',
        'plots show سری کاری را رندر می‌کند؛ plots diff revision را مقایسه می‌کند.',
        'CML می‌تواند تصویر را به PR بچسباند — انسان منحنی را می‌خواند.',
      ],
    },
    'dvc-diffs': {
      title: 'params / metrics diff',
      lines: [
        'params diff = نیت. metrics diff = اثر.',
        'هر دو را در بدنه‌ی PR بگذارید. ریویور نوت‌بوک باز نکند.',
        'بدون حرکت metric ادغام نکنید.',
      ],
    },
    'dvc-api': {
      title: 'dvc.api',
      lines: [
        'API پایتون برای خواندن داده‌ی ردگیری‌شده / exp_show از مخزن DVC.',
        'اپ و نوت‌بوک بایت را قرض می‌گیرند بدون بازنویسی فضای کاری.',
        'قرارداد md5 همچنان معتبر است — commit را pin کنید.',
      ],
    },
    'dvc-config': {
      title: 'کانفیگ و کلیدهای امنیتی DVC',
      lines: [
        'فایل .dvc/config در گیت کامیت می‌شود (ریموت‌های اشتراکی). هرگز کلید یا رمز خصوصی در آن نگذارید.',
        'فایل .dvc/config.local به صورت پیش‌فرض در .gitignore است. از `dvc config --local` برای کلیدهای محرمانه استفاده کنید.',
        'در کلاود و CI، واگذاری نقش IAM (مثل AssumeRole یا OIDC) بر کلیدهای ثابت ترجیح دارد.',
      ],
    },
    'cml-runner': {
      title: 'رانرهای ابری CML (پردازشگرهای موقت GPU)',
      lines: [
        'فرمان `cml runner launch` ماشین‌های ابری با GPU (در AWS، GCP، Azure یا کوبرنتیز) را پویا روشن می‌کند.',
        'با فلگ `--single-shot`، ماشین بلافاصله بعد از اتمام آموزش مدل خاموش می‌شود (هزینه بیکاری صفر).',
        'پایپ‌لاین‌های CI می‌توانند مدل‌های حجیم را روی GPUهای اسپات بدون نیاز به سرور دائم آموزش دهند.',
      ],
    },
    'dvc-exp-share': {
      title: 'همگام‌سازی آزمایش‌ها با dvc exp push / pull / branch',
      lines: [
        'آزمایش‌ها در رفرنس‌های مخفی گیت (refs/exps) ذخیره می‌شوند تا تاریخچه و برنچ‌ها شلوغ نشوند.',
        '`dvc exp push` و `dvc exp pull` نتایج و هایپرپارامترها را میان اعضای تیم سینک می‌کنند.',
        '`dvc exp branch <id> <branch>` یک آزمایش پیروز را مستقیماً به شاخه گیت برای Pull Request تبدیل می‌کند.',
      ],
    },
    'python-dvc-api': {
      title: 'استفاده از dvc.api پایتون در پروداکشن',
      lines: [
        'سرویس‌های استنتاج در پروداکشن می‌توانند با `dvc.api.open()` یا `dvc.api.get_url()` مستقیماً از S3/GCS مدل را لود کنند.',
        'تگ یا کامیت مشخص گیت را پین کنید (rev="v1.0") تا بازتولیدپذیری تضمین شود.',
        'نیازی به اجرای `git clone` یا `dvc pull` در کانتینرهای سبک داکر برای سرویس‌دهی نیست.',
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
      body: 'اشیا زیر `.dvc/cache/files/md5/xx/…` با کلید هش محتوا ذخیره می‌شوند. بایت‌های یکسان یک بار ذخیره می‌شوند. کش محلی منبع بازیابی و استقرار برای checkout فضای کاری است.',
    },
    remote: {
      title: 'فضای ذخیره‌سازی remote',
      body: 'store شیء مشترک برای آرتیفکت‌های cache (S3، GCS، SSH، محلی). dvc push اشیای جامانده را می‌فرستد؛ dvc pull/fetch می‌گیرد. جدای از git remote.',
    },
    dirty: {
      title: 'داده‌ی تغییریافته (dirty)',
      body: 'بایت‌های فضای کاری ≠ md5 pointer (یا فایل نیست). dvc status نشان می‌دهد. راه‌حل: dvc commit (نسخه‌ی جدید) یا dvc checkout (دور ریختن دریفت).',
    },
    checkout: {
      title: 'بازیابی نسخه در فضای کاری',
      body: 'dvc checkout pointerها را می‌خواند و اشیای cache سازگار را در فضای کاری برمی‌گرداند. بعد از git checkout commit قدیمی همیشه dvc checkout تا بایت‌ها با قصد بخوانند.',
    },
    pipeline: {
      title: 'DAG خط لوله',
      body: 'stageهای dvc.yaml وابستگی، خروجی، فرمان، پارامتر، metrics را اعلام می‌کنند. dvc repro stageهای dirty را توپولوژیک اجرا و dvc.lock را به‌عنوان رسید اجرا می‌نویسد.',
    },
    invalidation: {
      title: 'قواعد باطل‌سازی (invalidation)',
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
      title: 'مقایسه‌ی نسخه‌ها با diff',
      body: 'dvc params diff / metrics diff / plots diff فضای کاری را با HEAD (یا revisionها) مقایسه می‌کنند. تغییرات ML این‌طور review می‌شوند.',
    },
    'registry-cmds': {
      title: 'get / import',
      body: 'dvc get فایل را از پروژه‌ی DVC دیگر کپی می‌کند. dvc import وابستگی را هم version می‌کند (می‌نویسد .dvc). import-url یک URL خارجی را به‌عنوان داده ردگیری می‌کند.',
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
      title: 'مرحله‌های foreach / ماتریسی',
      body: 'dvc stage add --foreach یک stage را به چندتا باز می‌کند (مثلاً per-model). جایگزین سطح دوره برای copy-paste stage.',
    },
    'external-outs': {
      title: 'داده‌ی خارجی / no-cache',
      body: 'deps/outs می‌توانند بیرون پروژه باشند (s3://…). cache: false / -O وقتی DVC نباید بایت کپی کند. داده‌ی خارجی را با import-url ردگیری/به‌روزرسانی کنید.',
    },
    api: {
      title: 'dvc.api',
      body: 'API پایتون برای خواندن داده‌ی ردگیری‌شده و exp_show() از مخزن DVC بدون dvc checkout — کاربردی در اپ و نوت‌بوک.',
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
      title: 'freeze کردن یک مرحله',
      body: 'dvc freeze <stage> مرحله را میخکوب می‌کند تا repro حتی با تغییر ورودی اجرایش نکند — برای محافظت از آرتیفکت تولید هنگام آزمایش پایین‌دست.',
    },
    gc: {
      title: 'جمع‌آوری زباله',
      body: 'dvc gc اشیای cache را که workspace/refهای گیتی که نگه می‌دارید به آن‌ها ارجاع نمی‌دهند حذف می‌کند. بعد از gc اگر هش ارجاعی فقط روی remote بود شاید dvc pull لازم باشد.',
    },
    'api-handson': {
      title: 'dvc.api در اپ‌های تولید',
      body: 'commit گیت را pin کنید، مسیرهای ردگیری‌شده را با dvc.api بخوانید، هرگز «latest» را داغ نگیرید. داشبورد و jobهای batch باید fail-closed باشند اگر pointer نیست — نه اینکه بی‌صدا روی بایت کهنه آموزش ببینند.',
    },
    'pr-pack': {
      title: 'بسته‌ی شاهد PR برای ML',
      body: 'تغییر جدی ML حداقل این‌ها را می‌آورد: dvc params diff (نیت)، dvc metrics diff (اثر)، dvc plots diff (منحنی). سه جا در بدنه‌ی PR. جای خالی = آماده‌ی ریویو نیست.',
    },
    'arch-lakehouse': {
      title: 'مقایسه DVC و Data Lakehouse (Delta Lake / Iceberg)',
      body: 'دی‌وی‌سی فایل‌های غیرساختاریافته، باینری‌های خام و وزنه‌های مدل را از طریق اشاره‌گرهای آدرس‌پذیر مبتنی بر هش گیت نسخه‌بندی می‌کند. در مقابل، Data Lakehouseها (مثل Delta Lake و Apache Iceberg) جداول ساختاریافته را با تراکنش‌های ACID در سطح سطر، سفر در زمان (Time-travel) و هرس پارتیشن مدیریت می‌کنند. در پایپ‌لاین‌های سازمانی، لیک‌هاوس داده‌های جدولی را نگه می‌دارد و DVC کد، پایپ‌لاین، وزنه‌های مدل و آرتیفکت‌ها را هماهنگ می‌کند.',
    },
    'arch-feature-store': {
      title: 'مقایسه DVC و Feature Store (Feast)',
      body: 'فیچر استورها (مثل Feast) وظیفه سرو برخط بردار ویژگی‌ها با تأخیر میلی‌ثانیه‌ای برای استنتاج بلادرنگ و جوین‌های بدون نشت زمان (Point-in-time) برای آموزش را بر عهده دارند. DVC اسنپ‌شات‌های نامتغیر، رسیدهای اجرا (dvc.lock) و وزنه‌های نهایی مدل را نسخه‌بندی می‌کند. در معماری حرفه‌ای، فیچر استور داده آموزش را تامین می‌کند و DVC خط تولید و زنجیره تکرارپذیری مدل را ثبت می‌نماید.',
    },
    'arch-model-registry': {
      title: 'مقایسه DVC و Model Registry (MLflow / SageMaker)',
      body: 'مدل رجیستری‌ها (مثل MLflow یا SageMaker) سرویس‌های متمرکزی برای تغییر وضعیت مدل (Staging به Production) و متادیتای دیپلوی ارائه می‌دهند. در عوض، DVC اصالت کامل کد، داده و مدل را درون گیت با هش‌های رمزنگاری تضمین می‌کند. در عمل، تیم‌ها مدل برنده DVC را در MLflow رجیستر می‌کنند تا بدانند هر مدلی در پروداکشن، بایت‌به‌بایت از کدام کامیت و داده ساخته شده است.',
    },
    'cloud-iam-secrets': {
      title: 'امنیت ابر، احراز هویت IAM و .dvc/config.local',
      body: 'تنظیمات DVC سه سطح دارد: سیستمی، پروژه‌ای (.dvc/config در گیت) و محلی (.dvc/config.local که در .gitignore است). کلیدهای خصوصی، توکن‌ها و پسوردها باید حتماً با `dvc config --local` یا متغیرهای محیطی در CI مقداردهی شوند و هرگز در گیت کامیت نشوند. در ابر، واگذاری نقش IAM (مثل AssumeRole یا OIDC) بر کلیدهای ثابت ترجیح دارد.',
    },
    'cml-cloud-runners': {
      title: 'رانرهای ابری CML و تخصیص پویای GPU',
      body: 'فرمان `cml runner launch` ماشین‌های ابری موقت با GPU (در AWS، GCP، Azure یا کوبرنتیز) را مستقیم از دل GitHub Actions روشن می‌کند. با فلگ `--single-shot`، ماشین مدل را آموزش داده، آرتیفکت را به ریموت DVC پوش کرده، گزارش CML را روی PR ثبت می‌کند و بلافاصله خاموش می‌شود تا هزینه بیکاری GPU به صفر برسد.',
    },
    'dvc-api-python': {
      title: 'دسترسی برنامه‌نویسی با dvc.api در پایتون',
      body: 'توابع `dvc.api.read()`، `dvc.api.get_url()` و `dvc.api.open()` به اپلیکیشن‌های پایتون، وب‌سرویس‌های FastAPI و نوت‌بوک‌ها اجازه می‌دهند داده‌ها و مدل را بر اساس تگ‌های گیت (مثلاً rev="v1.0") مستقیماً از استوریج ابری استریم کنند بدون اینکه نیازی به کلون ریپو یا `dvc pull` باشد. این کلید دیپلوی کانتینرهای سبک در استنتاج است.',
    },
    'exp-lifecycle': {
      title: 'چرخه حیات آزمایش‌ها (push / pull / branch)',
      body: 'دی‌وی‌سی آزمایش‌ها را در رفرنس‌های مخفی گیت (refs/exps) ذخیره می‌کند تا شاخه‌های ریپو شلوغ نشوند. با `dvc exp push` و `dvc exp pull` نتایج و هایپرپارامترها بین اعضای تیم سینک می‌شوند. وقتی آزمایشی برنده شد، با `dvc exp branch` به یک برنچ رسمی گیت تبدیل می‌شود تا برای Pull Request ارسال گردد.',
    },
    'pipeline-matrix': {
      title: 'پایپ‌لاین‌های ماتریسی و foreach در dvc.yaml',
      body: 'بخش `foreach` و `matrix` در dvc.yaml امکان تعریف مراحل پارامتری روی چندین دیتاست، معماری مدل یا پیش‌پردازش‌های مختلف را بدون تکرار کد فراهم می‌کند. DVC زیرشاخه‌های مجزا در گراف وابستگی (DAG) ایجاد کرده و کش هر مرحله را مستقل مدیریت می‌کند.',
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
    undo: 'مرحله قبل',
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
    undoMeta: 'به مرحله قبل برگشتید.',
    correct: '✓ درست.',
    levelSolvedBanner: '*** مرحله حل شد ***',
    partyMode: '*** جشن گرفتیم *** کاغذ رنگی می‌ریزد — دکمه‌های اشتراک پایین.',
    github: 'GitHub',
    githubTitle: 'GitHub — سورس و ایشو',
    visitors: (count) => `${count} یادگیرنده`,
    visitorsTitle: 'تعداد افراد یکتایی که در این سامانه DVC را تمرین کرده‌اند',
    support: 'Buy me a coffee',
    supportTitle: 'از ناشر حمایت کنید',
    guidePanel: 'پنل راهنمای یادگیری',
    uiGuideTitle: 'راهنمای UI — هر بخش چه می‌کند',
    close: 'بستن',
    highlightRegions: 'برجسته‌سازی نواحی',
    highlightThis: 'برجسته‌سازی',
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
    nothingToUndo: 'مرحله‌ی قبلی‌ای برای برگشتن نیست.',
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
      'بوم — یک مهارت DVC دیگر به مجموعه‌تان اضافه شد.',
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
      'چرا مهم است: این چیزی است که ابزارهای شما واقعاً می‌خوانند. داده‌ی ردگیری‌شده اینجا به‌صورت فایل پیوندی می‌ماند — گیت هرگز بایت‌های سنگین را نمی‌بیند.',
    cacheHint: '.dvc/cache — اشیای محتوانشان',
    cacheWhy:
      'چرا مهم است: انبار محلی نسخه‌های داده (با md5). dvc add/commit بایت اینجا می‌گذارد؛ checkout/pull برمی‌گرداند.',
    remoteHint: 'فضای مشترک برای داده‌ی سنگین',
    remoteWhy:
      'چرا مهم است: هم‌تیمی‌ها و CI همین‌جا بایت‌های یکسان می‌گیرند. remote خالی یعنی داده با git push تنها سفر نمی‌کند.',
    pipelineTitle: 'خط لوله · dvc.yaml',
    language: 'زبان',
    menuLabel: 'منو',
    workspace: 'فضای کاری',
    cache: 'کش',
    remote: 'ریموت',
    coachAllDone:
      'همه‌ی گام‌های هدف انجام شده — باید تمام باشد. برای تأیید `show goal` تایپ کنید.',
    coachNextSteps: (n, id) => `گام‌های بعدی (${n} باقی)${id ? ` برای ${id}` : ''}:`,
    coachFooter: 'برای تکرار این فهرست `steps` · `hint` · `show goal` تایپ کنید',
    shareLinkedInHead:
      'خیلی خوشحالم — تازه Data Version Control کاربردی را با LearnDVC یاد گرفتم!',
    shareStarting: 'سفر یادگیری‌ام با DVC همین‌جا جدی شد.',
    shareLatestWin: (name, id) => `تازه‌ترین قدم: ${name} (${id})`,
    shareCommands: (n, par) => ` — ${n} فرمان (ایده‌آل ${par})`,
    shareLearnedSoFar: 'تا اینجا این‌ها را یاد گرفته‌ام:',
    shareProgress: (solved, total) => `پیشرفت: ${solved}/${total} مرحله.`,
    shareCta: 'اگر با داده یا مدل ML سر و کار دارید، امتحانش کنید — رایگان و بدون ثبت‌نام:',
    shareSupport: 'اگر این آموزش به دردتان خورد، می‌توانید از یادگیری حمایت کنید:',
    shareXHead: (solved, total) =>
      `خوشحالم که دارم DVC را با LearnDVC یاد می‌گیرم (${solved}/${total} مرحله).`,
    shareXFirst: 'تمرین عملی در مرورگر.',
    shareHandson: 'تمرین عملی در مرورگر.',
    titleLearnDvc: 'LearnDVC — آموزش Data Version Control',
    welcomeTitle: 'Welcome to Learn DVC',
    welcomeTitleHtml: 'Welcome to Learn <span>DVC</span>',
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
      {
        q: 'کلید secret سرویس S3 کجا باید باشد؟',
        a: ['.dvc/config در گیت', 'CI secrets / env / role ابری', 'README'],
        correct: 1,
      },
      {
        q: 'هم‌تیمی به دیتاست ۴ گیگی شما نیاز دارد. شما…',
        a: ['zip ایمیل می‌کنید', 'به remote داده push می‌کنید و SHA کامیت را می‌فرستید', 'دوباره از لپ‌تاپ zip می‌کنید'],
        correct: 1,
      },
      {
        q: 'dvc fetch در برابر dvc pull؟',
        a: ['یکسان', 'fetch = remote→cache؛ pull = fetch + checkout در فضای کاری', 'pull همیشه سریع‌تر است'],
        correct: 1,
      },
      {
        q: 'حادثه: کدام داده این مدل را آموزش داده؟',
        a: [
          'از کارآموز بپرسید',
          'commit release → md5های pointer → اشیای cache/remote',
          'در چت بگردید',
        ],
        correct: 1,
      },
      {
        q: 'بعد از exp apply چه چیزی تا تولید باقی است؟',
        a: [
          'هیچ — apply یعنی deploy',
          'dvc repro آرتیفکت‌ها، dvc push، git commit release',
          'تغییر نام شاخه',
        ],
        correct: 1,
      },
      {
        q: 'محتوای امن برای .dvc/config؟',
        a: ['secret_access_key', 'آدرس remote و گزینه‌های non-secret', 'رمز عبور'],
        correct: 1,
      },
      {
        q: 'بدنه‌ی PR جدی ML چه چیزی دارد؟',
        a: ['فقط حس', 'params diff + metrics diff + plots diff', 'فقط diff کد'],
        correct: 1,
      },
      {
        q: 'تفاوت معماری DVC و Data Lakehouse (مثل Delta Lake/Iceberg) چیست؟',
        a: [
          'هر دو ابزار کاملاً یکسان هستند',
          'لیک‌هاوس جداول ساختاریافته را با تراکنش سطر ACID نسخه‌بندی می‌کند؛ DVC فایل‌ها، مدل‌ها و پایپ‌لاین‌ها را با اشاره‌گر گیت مدیریت می‌کند',
          'DVC فقط روی دیتابیس MySQL کار می‌کند',
        ],
        correct: 1,
      },
      {
        q: 'سرویس استنتاج پایتون چطور باید وزن‌های مدل را بدون clone کامل ریپو لود کند؟',
        a: [
          'اجرای git clone در داکر',
          'استفاده از dvc.api.open() یا dvc.api.get_url() با تگ مشخص گیت',
          'هاردکد کردن آدرس فایل از لپ‌تاپ توسعه‌دهنده',
        ],
        correct: 1,
      },
      {
        q: 'مزیت دستور `cml runner launch --single-shot` در چیست؟',
        a: [
          'یک سرور همیشگی و گران‌قیمت می‌سازد',
          'یک GPU ابری را موقت روشن کرده و بعد از پایان آموزش خاموش می‌کند (هزینه بیکاری صفر)',
          'نیازی به GitHub Actions ندارد',
        ],
        correct: 1,
      },
      {
        q: 'برای جلوگیری از نشت کلیدهای دسترسی به گیت، کلیدها کجا تنظیم می‌شوند؟',
        a: [
          'درون .dvc/config که در گیت کامیت می‌شود',
          'درون .dvc/config.local (که gitignore است) یا متغیرهای محیطی CI',
          'درون فایل README',
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
          '**سرنخ** / **راه‌حل** / **مرحله قبل** / **بازنشانی** / **سندباکس**.',
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
        title: 'نشانگرهای وضعیت (بالای بورد)',
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
          '• **.dvc pointer** — DVC این مسیر را ردگیری می‌کند (گیت فقط فایل `.dvc` را)',
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
        what: 'اشیای محلی `.dvc/cache` — کپی‌های مبتنی بر محتوای داده‌ی ردگیری‌شده (md5).',
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


