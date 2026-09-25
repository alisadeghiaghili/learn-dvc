from pathlib import Path

p = Path('src/style.css')
css = p.read_text(encoding='utf-8')

# UI chrome alignment must follow writing direction
for old, new in [
    (
        """  border-radius: 10px;
  padding: 10px 12px;
  text-align: left;
}""",
        """  border-radius: 10px;
  padding: 10px 12px;
  text-align: start;
}""",
    ),
    (
        """  padding: 12px;
  margin-bottom: 12px;
  text-align: left;
}""",
        """  padding: 12px;
  margin-bottom: 12px;
  text-align: start;
}""",
    ),
    (
        """  background: var(--ink);
  text-align: left;
  width: 100%;
}""",
        """  background: var(--ink);
  text-align: start;
  width: 100%;
}""",
    ),
    (
        """  padding: 8px 10px;
  text-align: left;
  vertical-align: top;
}""",
        """  padding: 8px 10px;
  text-align: start;
  vertical-align: top;
}""",
    ),
    (
        """  content: '';
  position: absolute;
  left: 0;
}""",
        """  content: '';
  position: absolute;
  inset-inline-start: 0;
}""",
    ),
    (
        """  position: absolute;
  top: 0;
  left: 0;
  height: 100%;""",
        """  position: absolute;
  top: 0;
  inset-inline-start: 0;
  height: 100%;""",
    ),
]:
    if old not in css:
        print('MISS', old.splitlines()[0][:60])
    css = css.replace(old, new)

# any remaining padding-left in list indentation
css = css.replace('padding-left: 16px', 'padding-inline-start: 16px')
css = css.replace('padding-left: 18px', 'padding-inline-start: 18px')

# remove duplicate rtl audit block if we appended twice
marker = "/* —— RTL audit: UI chrome follows writing mode; code/terminal stay LTR —— */"
if css.count(marker) > 1:
    # keep first only
    first = css.find(marker)
    second = css.find(marker, first + 1)
    css = css[:second]
    print('removed duplicate audit block')

p.write_text(css, encoding='utf-8')
print('css updated')
print('padding-left left:', css.count('padding-left:'))
print('text-align: left count:', css.count('text-align: left'))
print('left: 0 count:', css.count('left: 0'))
