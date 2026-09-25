from pathlib import Path
import re

p = Path('src/i18n/fa.ts')
t = p.read_text(encoding='utf-8')

repls = {
    "shareLinkedInHead:\n      'واقعاً خوشحالم — تازه Data Version Control کاربردی را در LearnDVC یاد گرفتم!',":
        "shareLinkedInHead:\n      'خیلی خوشحالم — تازه Data Version Control کاربردی را با LearnDVC یاد گرفتم!',",
    "shareStarting: 'سفر DVC من شروع شد.',":
        "shareStarting: 'سفر یادگیری‌ام با DVC همین‌جا جدی شد.',",
    "shareLatestWin: (name, id) => `آخرین موفقیت: ${name} (${id})`,":
        "shareLatestWin: (name, id) => `تازه‌ترین قدم: ${name} (${id})`,",
    "shareLearnedSoFar: 'چه چیزی تاکنون یاد گرفته‌ام:',":
        "shareLearnedSoFar: 'تا اینجا این‌ها را یاد گرفته‌ام:',",
    "shareCta:\n      'اگر با داده یا مدل ML کار می‌کنید، امتحان کنید — رایگان، بدون ورود:',":
        "shareCta:\n      'اگر با داده یا مدل ML سر و کار دارید، امتحانش کنید — رایگان و بدون ثبت‌نام:',",
    "shareXHead: (solved, total) =>\n      `واقعاً خوشحالم — دارم DVC را در LearnDVC یاد می‌گیرم (${solved}/${total} مرحله).`,":
        "shareXHead: (solved, total) =>\n      `خوشحالم که دارم DVC را با LearnDVC یاد می‌گیرم (${solved}/${total} مرحله).`,",
    "shareXFirst: 'سندباکس عملی.',":
        "shareXFirst: 'تمرین عملی در مرورگر.',",
    "shareHandson: 'سندباکس عملی.',":
        "shareHandson: 'تمرین عملی در مرورگر.',",
}

for a, b in repls.items():
    if a in t:
        t = t.replace(a, b)
        print('OK', a.splitlines()[0][:50])
    else:
        print('MISS', a.splitlines()[0][:50])

# fallback regex for multi-line CTA / LinkedIn head
t = re.sub(
    r"shareLinkedInHead:\s*\n?\s*'[^']*'",
    "shareLinkedInHead:\n      'خیلی خوشحالم — تازه Data Version Control کاربردی را با LearnDVC یاد گرفتم!'",
    t,
    count=1,
)
t = re.sub(
    r"shareCta:\s*\n?\s*'[^']*'",
    "shareCta:\n      'اگر با داده یا مدل ML سر و کار دارید، امتحانش کنید — رایگان و بدون ثبت‌نام:'",
    t,
    count=1,
)
t = re.sub(
    r"shareXHead: \(solved, total\) =>\s*\n?\s*`[^`]*`",
    "shareXHead: (solved, total) =>\n      `خوشحالم که دارم DVC را با LearnDVC یاد می‌گیرم (${solved}/${total} مرحله).`",
    t,
    count=1,
)

p.write_text(t, encoding='utf-8')
print('--- share lines ---')
for i, line in enumerate(t.splitlines(), 1):
    if 'share' in line.lower() and any(k in line for k in ('Head', 'Starting', 'Latest', 'Learned', 'Cta', 'XHead', 'XFirst', 'Handson', 'Progress', 'Commands')):
        print(i, line)
    elif 'خوشحالم' in line or 'تمرین عملی' in line or 'تا اینجا' in line or 'ثبت‌نام' in line:
        print(i, line)
