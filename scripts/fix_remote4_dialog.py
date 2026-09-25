from pathlib import Path
import re

def patch(path: str, second_slide: str) -> None:
    p = Path(path)
    t = p.read_text(encoding='utf-8')
    pat = re.compile(r"(id: 'remote-4',[\s\S]*?startDialog: \[)([\s\S]*?)(\n    \],)")
    m = pat.search(t)
    if not m:
        print(path, 'remote-4 not found')
        return
    count = m.group(2).count('title:')
    print(path, 'slides', count)
    if count >= 2:
        print(path, 'ok')
        return
    t = t[: m.end(2)] + '\n' + second_slide + t[m.end(2) :]
    p.write_text(t, encoding='utf-8')
    print(path, 'added slide')

patch(
    'src/levels/advanced.ts',
    """      {
        title: 'Default vs -r',
        markdown:
          'Default remote is what `push`/`pull` use. `push -r backup` is deliberate.\\n\\nIf you mix them up, teammates fetch from the wrong store.',
      },""",
)

patch(
    'src/i18n/de-levels.ts',
    "      { title: 'Default vs. -r', markdown: 'Default-Remote nutzen push/pull. `push -r backup` ist bewusst.' },",
)

patch(
    'src/i18n/fa-levels.ts',
    "      { title: 'default در برابر -r', markdown: 'push/pull از remote پیش‌فرض می‌خوانند. `push -r backup` عمدی است.' },",
)
