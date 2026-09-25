from pathlib import Path

# types.ts
p = Path('src/i18n/types.ts')
t = p.read_text(encoding='utf-8')
if 'shareSupport' not in t:
    t = t.replace('  shareCta: string;', '  shareCta: string;\n  shareSupport: string;')
    p.write_text(t, encoding='utf-8')
    print('types ok')
else:
    print('types already')

def upsert(path, after_prefix, new_line):
    p = Path(path)
    lines = p.read_text(encoding='utf-8').splitlines()
    if any('shareSupport' in ln for ln in lines):
        print(path, 'has shareSupport')
        return
    out = []
    inserted = False
    for ln in lines:
        out.append(ln)
        if not inserted and ln.strip().startswith(after_prefix):
            out.append(new_line)
            inserted = True
    if not inserted:
        print(path, 'MISS anchor', after_prefix)
    p.write_text('\n'.join(out) + '\n', encoding='utf-8')
    print(path, 'updated' if inserted else 'failed')

upsert('src/i18n/en.ts', 'shareCta:', "    shareSupport: 'If this helps your learning, you can support the project here:',")
upsert('src/i18n/de.ts', 'shareCta:', "    shareSupport: 'Wenn dir das beim Lernen hilft, kannst du das Projekt hier unterstützen:',")
upsert('src/i18n/fa.ts', 'shareCta:', "    shareSupport: 'اگر این آموزش به دردتان خورد، می‌توانید از یادگیری حمایت کنید:',")

# verify share.ts
s = Path('src/ui/share.ts').read_text(encoding='utf-8')
print('share.ts has support', 'shareSupport' in s and 'COFFEE_URL' in s)
