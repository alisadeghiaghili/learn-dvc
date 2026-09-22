import './style.css';
import { App } from './ui/app';
import { allLevels } from './levels';
import { showModal, renderMarkdown } from './ui/dialog';

const root = document.querySelector('#app');
if (!root) throw new Error('#app root missing');

const app = new App(root as HTMLElement);

const params = new URLSearchParams(window.location.search);
if (!params.has('NODEMO')) {
  showModal({
    title: 'LearnDVC',
    bodyHtml: renderMarkdown(
      [
        'Interactive **Data Version Control** tutorial — sandbox + guided levels.',
        '',
        'The board shows **Workspace → Cache → Remote**. That is the material flow DVC manages.',
        '',
        `- Basics: \`init\`, \`add\`, pointers, status\n- Remotes: \`remote add\`, \`push\`, \`pull\`\n- Pipelines: \`stage add\`, \`repro\`, params/metrics\n- Experiments: \`exp run\`, \`exp show\`, \`exp apply\``,
        '',
        'Meta: `levels`, `curriculum`, `concepts`, `lesson`, `hint`, `steps`, `show solution`.',
        '',
        `**${allLevels.length}** levels included. Open Levels to begin, or stay in sandbox.`,
        '',
        '**What is LearnDVC?**',
        'A browser lab bench for DVC: you type real-shaped `dvc` / `git` commands and watch pointers, cache objects, and remotes move. No install required for the tutorial core.',
        '',
        '**Publisher**',
        'Published and maintained by **Ali Sadeghi Aghili** — programmer, data engineer / scientist, ML engineer. [linktr.ee/aliaghili](https://linktr.ee/aliaghili)',
        '',
        '- [GitHub — source & issues](https://github.com/alisadeghiaghili/learn-dvc)',
        '',
        'Buy Me a Coffee (supports the publisher):',
        '',
        '<a href="https://www.buymeacoffee.com/alisadeghil" target="_blank" rel="noopener noreferrer"><img src="https://img.buymeacoffee.com/button-api/?text=Buy%20me%20a%20coffee&emoji=&slug=alisadeghil&button_colour=2a3a4a&font_colour=ffffff&font_family=Cookie&outline_colour=ffffff&coffee_colour=FFDD00" alt="Buy me a coffee" /></a>',
        '',
        'Toolbar: **Lesson** (replay level intro) · **GitHub** · **Buy me a coffee**.',
      ].join('\n'),
    ),
    actions: [
      {
        label: 'Sandbox',
        className: 'ghost',
        onClick: () => undefined,
      },
      {
        label: 'Open levels',
        className: 'primary',
        onClick: () => {
          const btn = document.querySelector<HTMLButtonElement>('[data-action="levels"]');
          btn?.click();
        },
      },
    ],
  });
}

// expose for debugging in console
(window as unknown as { learnDvcApp: App }).learnDvcApp = app;
