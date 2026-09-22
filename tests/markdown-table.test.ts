import { describe, expect, it } from 'vitest';
import { renderMarkdown } from '../src/ui/dialog';

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
    // raw pipes should not leak as paragraph text for the table body
    expect(html).not.toContain('| --- |');
  });

  it('still renders code fences and bold around tables', () => {
    const html = renderMarkdown('**Note**\n\n```\ndvc add\n```\n\n| a | b |\n| - | - |\n| 1 | 2 |');
    expect(html).toContain('<strong>Note</strong>');
    expect(html).toContain('<pre>');
    expect(html).toContain('<table');
  });
});
