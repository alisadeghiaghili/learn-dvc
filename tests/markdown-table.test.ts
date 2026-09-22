import { describe, expect, it } from 'vitest';
import { renderMarkdown } from '../src/ui/dialog';

const underHood = [
  'After `dvc add`:',
  '',
  '| Place | Content |',
  '| --- | --- |',
  '| Workspace | still has `data/data.xml` (linked to cache) |',
  '| `.dvc/cache/.../md5/xx/…` | the actual bytes, content-addressed |',
  '| `data/data.xml.dvc` | YAML: path + md5 — **what Git stores** |',
  '| `data/.gitignore` | ignores the raw path |',
  '',
  'Two systems, one workflow:',
  '',
  '- **Git** → code + pointers (small, reviewable)',
  '- **DVC cache/remote** → data payloads',
].join('\n');

describe('markdown tables', () => {
  it('renders GFM pipe tables as real HTML tables', () => {
    const md = [
      'After `dvc add`:',
      '',
      '| Place | Content |',
      '| --- | --- |',
      '| Workspace | still has `data/data.xml` |',
      '| `.dvc/cache` | the actual bytes |',
    ].join('\n');
    const html = renderMarkdown(md);
    expect(html).toContain('<table');
    expect(html).toContain('<th>Place</th>');
    expect(html).toContain('<th>Content</th>');
    expect(html).toContain('<td>');
    expect(html).toContain('<code>data/data.xml</code>');
    expect(html).toContain('the actual bytes');
    expect(html).not.toContain('| --- |');
  });

  it('renders the basics-2 under-the-hood slide as a table + list', () => {
    const html = renderMarkdown(underHood);
    expect(html).toContain('<table');
    expect(html).toContain('<th>Place</th>');
    expect(html).toContain('<td>Workspace</td>');
    expect(html).toContain('what Git stores');
    expect(html).toContain('<ul>');
    expect(html).toContain('<li>');
    expect(html).not.toContain('| Place |');
    expect(html).not.toContain('| --- |');
  });

  it('still renders code fences and bold around tables', () => {
    const html = renderMarkdown('**Note**\n\n```\ndvc add\n```\n\n| a | b |\n| - | - |\n| 1 | 2 |');
    expect(html).toContain('<strong>Note</strong>');
    expect(html).toContain('<pre>');
    expect(html).toContain('<table');
  });
});

