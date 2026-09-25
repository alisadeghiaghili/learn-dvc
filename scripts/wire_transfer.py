from pathlib import Path

p = Path('src/levels/index.ts')
t = p.read_text(encoding='utf-8')
if 'transferLevels' not in t:
    t = t.replace(
        "import { advancedLevels } from './advanced';",
        "import { advancedLevels } from './advanced';\nimport { transferLevels } from './transfer';",
    )
    t = t.replace('  ...advancedLevels,', '  ...advancedLevels,\n  ...transferLevels,')
    p.write_text(t, encoding='utf-8')
    print('wired transferLevels')
else:
    print('transfer already wired')

print('import present', "from './transfer'" in p.read_text(encoding='utf-8'))
print('spread present', '...transferLevels' in p.read_text(encoding='utf-8'))
