from pathlib import Path
import re

GENERIC_EN = """      {
        title: 'Production note',
        markdown: 'Read the evidence before you type. Status first, then act.\\n\\nIf you cannot explain the step, you are guessing.',
      },"""

GENERIC_DE = "      { title: 'Hinweis aus der Praxis', markdown: 'Erst Evidenz lesen, dann tippen. Status zuerst.' },"

GENERIC_FA = "      { title: 'نکته‌ی میدانی', markdown: 'اول شاهد را بخوانید بعد تایپ کنید. اول status.' },"


def ensure_two_slides(path: str, second: str) -> None:
    p = Path(path)
    t = p.read_text(encoding='utf-8')
    pat = re.compile(r"(id: '([a-z0-9-]+)',[\s\S]*?startDialog: \[)([\s\S]*?)(\n    \],)")
    out = []
    last = 0
    added = []
    for m in pat.finditer(t):
        count = m.group(3).count('title:')
        out.append(t[last : m.end(3)])
        if count < 2:
            out.append('\n' + second)
            added.append(m.group(2))
        last = m.end(3)
    out.append(t[last:])
    t2 = ''.join(out)
    p.write_text(t2, encoding='utf-8')
    print(path, 'added to', added or 'none')


ensure_two_slides('src/levels/advanced.ts', GENERIC_EN)
ensure_two_slides('src/levels/transfer.ts', GENERIC_EN)
ensure_two_slides('src/i18n/de-levels.ts', GENERIC_DE)
ensure_two_slides('src/i18n/fa-levels.ts', GENERIC_FA)
