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
        'Meta commands: `levels`, `hint`, `show goal`, `show solution`, `reset`, `undo`, `sandbox`, `help`.',
        '',
        `**${allLevels.length}** levels included. Open Levels to begin, or stay in sandbox.`,
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
