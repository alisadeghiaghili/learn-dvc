from pathlib import Path

def fix(path: str) -> None:
    lines = Path(path).read_text(encoding='utf-8').splitlines()
    out = []
    i = 0
    while i < len(lines):
        ln = lines[i]
        if ln.strip() == 'shareCta:':
            # next lines are shareSupport then the actual cta string
            support = ''
            cta = ''
            i += 1
            while i < len(lines):
                s = lines[i].strip()
                if s.startswith('shareSupport:'):
                    support = s
                    i += 1
                    continue
                if s.startswith("'") or s.startswith('`') or s.startswith('"'):
                    cta = s
                    i += 1
                    break
                if s.startswith('shareXHead') or s.startswith('share') or s.startswith('title'):
                    break
                i += 1
            if cta.startswith('shareSupport'):
                support, cta = cta, support
            out.append('    shareCta: ' + cta if not cta.startswith('share') else '    shareCta: ' + cta)
            if not cta.strip().endswith(','):
                out[-1] = out[-1] + ','
            if support:
                if not support.endswith(','):
                    support = support + ','
                out.append('    ' + support)
            continue
        out.append(ln)
        i += 1
    Path(path).write_text('\n'.join(out) + '\n', encoding='utf-8')
    print('fixed', path)

for f in ('src/i18n/de.ts', 'src/i18n/fa.ts'):
    fix(f)

# show region
for f in ('src/i18n/de.ts', 'src/i18n/fa.ts'):
    lines = Path(f).read_text(encoding='utf-8').splitlines()
    print('====', f)
    for i, ln in enumerate(lines, 1):
        if 'shareCta' in ln or 'shareSupport' in ln or 'shareXHead' in ln:
            print(i, ln)
