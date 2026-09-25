from pathlib import Path
import re

fa = Path('src/i18n/fa.ts')
t = fa.read_text(encoding='utf-8')
t = t.replace("title: 'داده‌ی تغییریافته (dirty)'", "title: 'داده کثیف'")
t = t.replace("title: 'بازیابی نسخه در فضای کاری'", "title: 'materialize نسخه'")
t = re.sub(r"partyMode: '[^']*'", "partyMode: '*** جشن گرفتیم *** کاغذ رنگی می‌ریزد — دکمه‌های اشتراک پایین.'", t, count=1)
fa.write_text(t, encoding='utf-8')
for i,line in enumerate(t.splitlines(),1):
    if any(k in line for k in ['partyMode', 'داده کثیف', 'materialize نسخه']):
        print(i, line)
print('dirty-old', 'داده‌ی تغییریافته' in t)
print('materialize-old', 'بازیابی نسخه در فضای کاری' in t)
