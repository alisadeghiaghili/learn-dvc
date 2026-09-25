from pathlib import Path

p = Path('src/i18n/fa.ts')
lines = p.read_text(encoding='utf-8').splitlines()
out = []
for line in lines:
    s = line.strip()
    if s.startswith('shareStarting:'):
        out.append("    shareStarting: 'سفر یادگیری‌ام با DVC همین‌جا جدی شد.',")
    elif s.startswith('shareLatestWin:'):
        out.append("    shareLatestWin: (name, id) => `تازه‌ترین قدم: ${name} (${id})`,")
    elif s.startswith('shareLearnedSoFar:'):
        out.append("    shareLearnedSoFar: 'تا اینجا این‌ها را یاد گرفته‌ام:',")
    elif s.startswith('shareXFirst:'):
        out.append("    shareXFirst: 'تمرین عملی در مرورگر.',")
    elif s.startswith('shareHandson:'):
        out.append("    shareHandson: 'تمرین عملی در مرورگر.',")
    else:
        out.append(line)
p.write_text('\n'.join(out) + '\n', encoding='utf-8')
print('rewrote share lines')
for i, line in enumerate(out, 1):
    if 'share' in line and any(k in line for k in ('Starting', 'Latest', 'Learned', 'XFirst', 'Handson', 'LinkedInHead', 'Cta', 'XHead')):
        print(i, line)
