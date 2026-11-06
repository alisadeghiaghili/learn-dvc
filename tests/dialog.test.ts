// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { escapeHtml, renderMarkdown, showModal } from '../src/ui/dialog';

describe('escapeHtml', () => {
  it('escapes the four characters that can break out of HTML text or attributes', () => {
    expect(escapeHtml('<a href="x">Tom & Jerry</a>')).toBe('&lt;a href=&quot;x&quot;&gt;Tom &amp; Jerry&lt;/a&gt;');
  });
});

describe('renderMarkdown', () => {
  it('renders paragraphs with soft line breaks', () => {
    expect(renderMarkdown('one\ntwo\n\nthree')).toBe('<p>one<br/>two</p><p>three</p>');
  });

  it('renders bold and inline code and escapes everything else', () => {
    expect(renderMarkdown('use **`dvc add`** & <b>not html</b>')).toBe(
      '<p>use <strong><code>dvc add</code></strong> &amp; &lt;b&gt;not html&lt;/b&gt;</p>',
    );
  });

  it('turns markdown links into safe external anchors', () => {
    expect(renderMarkdown('[docs](https://dvc.org/doc)')).toBe(
      '<p><a href="https://dvc.org/doc" target="_blank" rel="noopener noreferrer">docs</a></p>',
    );
  });

  it('keeps trusted anchor tags as real markup', () => {
    const html = renderMarkdown('Support: <a href="https://x.test" target="_blank">me</a> please');
    expect(html).toBe('<p>Support: <a href="https://x.test" target="_blank">me</a> please</p>');
  });

  it('groups consecutive bullet and numbered items into one list and ends it at a blank line', () => {
    expect(renderMarkdown('- a\n* b\n1. c\n\nafter')).toBe('<ul><li>a</li><li>b</li><li>c</li></ul><p>after</p>');
  });

  it('closes a list when a prose line follows and starts a list after a paragraph', () => {
    expect(renderMarkdown('intro\n- x\ntail')).toBe('<p>intro</p><ul><li>x</li></ul><p>tail</p>');
  });

  it('renders fenced code verbatim, dropping the language tag and escaping markup', () => {
    expect(renderMarkdown('before\n```bash\ndvc add <file> && echo "**x**"\n```\nafter')).toBe(
      '<p>before</p><pre>dvc add &lt;file&gt; &amp;&amp; echo &quot;**x**&quot;\n</pre><p>after</p>',
    );
  });

  it('renders tables with header and body rows', () => {
    const html = renderMarkdown('| Cmd | What |\n|---|---|\n| `a` | **b** |\n| c | d |');
    const host = document.createElement('div');
    host.innerHTML = html;
    expect([...host.querySelectorAll('th')].map((x) => x.textContent)).toEqual(['Cmd', 'What']);
    const rows = [...host.querySelectorAll('tbody tr')].map((tr) => [...tr.querySelectorAll('td')].map((td) => td.innerHTML));
    expect(rows).toEqual([
      ['<code>a</code>', '<strong>b</strong>'],
      ['c', 'd'],
    ]);
  });

  it('does not treat a lone pipe line without a separator row as a table', () => {
    const html = renderMarkdown('a | b');
    expect(html).toBe('<p>a | b</p>');
  });
});

describe('showModal', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      cb(0);
      return 1;
    });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });

  it('shows an accessible dialog with the escaped title and the body markup', () => {
    const { el } = showModal({ title: 'A & B', bodyHtml: '<p>hello</p>' });
    expect(document.body.contains(el)).toBe(true);
    const modal = el.querySelector('.modal')!;
    expect(modal.getAttribute('role')).toBe('dialog');
    expect(modal.getAttribute('aria-modal')).toBe('true');
    expect(modal.getAttribute('aria-label')).toBe('A & B');
    expect(modal.querySelector('h2')!.innerHTML).toBe('A &amp; B');
    expect(modal.querySelector('.markdown')!.innerHTML).toBe('<p>hello</p>');
  });

  it('moves focus to the dialog so keyboard users land inside it', () => {
    const { el } = showModal({ title: 't', bodyHtml: '' });
    const modal = el.querySelector<HTMLElement>('.modal')!;
    expect(modal.tabIndex).toBe(-1);
    expect(document.activeElement).toBe(modal);
  });

  it('prefers titleHtml over the plain title for the heading', () => {
    const { el } = showModal({ title: 'plain', titleHtml: '<em>rich</em>', bodyHtml: '' });
    expect(el.querySelector('h2')!.innerHTML).toBe('<em>rich</em>');
  });

  it('offers a Close button by default that removes the dialog and notifies onClose', () => {
    const onClose = vi.fn();
    const { el } = showModal({ title: 't', bodyHtml: '', onClose });
    const buttons = el.querySelectorAll('button');
    expect(buttons).toHaveLength(1);
    expect(buttons[0]!.textContent).toBe('Close');
    buttons[0]!.click();
    expect(document.body.contains(el)).toBe(false);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('runs a custom action and then dismisses the dialog', () => {
    const first = vi.fn();
    const second = vi.fn();
    const { el } = showModal({
      title: 't',
      bodyHtml: '',
      actions: [
        { label: 'Later', className: 'ghost', onClick: first },
        { label: 'Go', className: 'primary', onClick: second },
      ],
    });
    const buttons = [...el.querySelectorAll('button')];
    expect(buttons.map((b) => [b.textContent, b.className])).toEqual([
      ['Later', 'ghost'],
      ['Go', 'primary'],
    ]);
    buttons[1]!.click();
    expect(second).toHaveBeenCalledTimes(1);
    expect(first).not.toHaveBeenCalled();
    expect(document.body.contains(el)).toBe(false);
  });

  it('closes when the backdrop is clicked but not when the dialog body is', () => {
    const onClose = vi.fn();
    const { el } = showModal({ title: 't', bodyHtml: '<p id="inner">x</p>', onClose });
    el.querySelector<HTMLElement>('#inner')!.click();
    expect(document.body.contains(el)).toBe(true);
    expect(onClose).not.toHaveBeenCalled();
    el.click();
    expect(document.body.contains(el)).toBe(false);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('close() is available programmatically', () => {
    const onClose = vi.fn();
    const { el, close } = showModal({ title: 't', bodyHtml: '', onClose });
    close();
    expect(document.body.contains(el)).toBe(false);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('the celebrate variant hides the heading visually and styles the overlay', () => {
    const { el } = showModal({ title: 'Level done', bodyHtml: '', variant: 'celebrate' });
    expect(el.classList.contains('overlay-celebrate')).toBe(true);
    expect(el.querySelector('.modal')!.classList.contains('modal-celebrate')).toBe(true);
    expect(el.querySelector('h2')!.className).toBe('visually-hidden');
  });
});
