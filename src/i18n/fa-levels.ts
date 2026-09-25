/** Persian level teaching copy. Never includes hint/solution/commands. */

import type { LevelCopy } from './types';

export const faLevels: Record<string, LevelCopy> = {
  'basics-1': {
    seriesTitle: 'Ù…Ø¨Ø§Ù†ÛŒ',
    name: 'Ø±Ø§Ù‡â€ŒØ§Ù†Ø¯Ø§Ø²ÛŒ DVC',
    objective:
      'DVC Ø±Ø§ Ø¯Ø§Ø®Ù„ ÛŒÚ© Ù…Ø®Ø²Ù† Git Ù…Ù‚Ø¯Ø§Ø±Ø¯Ù‡ÛŒ Ú©Ù†ÛŒØ¯ Ùˆ Ù…ØªØ§Ø¯ÛŒØªØ§ÛŒ DVC Ø±Ø§ commit Ú©Ù†ÛŒØ¯ ØªØ§ Ú©Ù„ ØªÛŒÙ… ÛŒÚ© setup Ù…Ø´ØªØ±Ú© Ø¯Ø§Ø´ØªÙ‡ Ø¨Ø§Ø´Ø¯.',
    learning: [
      'DVC Ù…Ú©Ù…Ù„ Git Ø¨Ø±Ø§ÛŒ Ø¯Ø§Ø¯Ù‡ Ø§Ø³ØªØ› Ø¬Ø§ÛŒÚ¯Ø²ÛŒÙ† Git Ù†ÛŒØ³Øª',
      'dvc init ÙÙ‚Ø· Ù…ØªØ§Ø¯ÛŒØªØ§ÛŒ .dvc/ Ù…ÛŒâ€ŒØ³Ø§Ø²Ø¯ â€” Ù‡Ù†ÙˆØ² Ù‡ÛŒÚ† Ø¯Ø§Ø¯Ù‡â€ŒØ§ÛŒ version Ù†Ø´Ø¯Ù‡',
      'Git Ù‡Ù…Ø§Ù† Ù…ØªØ§Ø¯ÛŒØªØ§ Ø±Ø§ version Ù…ÛŒâ€ŒÚ©Ù†Ø¯Ø› Ù‡Ù…â€ŒØªÛŒÙ…ÛŒâ€ŒÙ‡Ø§ Ù‡Ù…Ø§Ù† workflow Ø±Ø§ clone Ù…ÛŒâ€ŒÚ©Ù†Ù†Ø¯',
    ],
    fieldNotes: [
      'Ø¨ÙˆØª Ø§Ø³ØªØ±Ø§Ù¾ Ø±ÛŒÙ¾Ùˆ: git init â†’ dvc init â†’ Ø¨Ù„Ø§ÙØ§ØµÙ„Ù‡ commit Ú©Ø±Ø¯Ù† .dvc',
      'Ú©Ø§Ù†ÙÛŒÚ¯ remote Ø±Ø§ Ø¯Ø± .dvc/config Ù†Ú¯Ù‡ Ø¯Ø§Ø±ÛŒØ¯ ØªØ§ cloneÙ‡Ø§ Ù‡Ù…Ø§Ù† data store Ø±Ø§ Ø¨Ù‡ Ø§Ø±Ø« Ø¨Ø¨Ø±Ù†Ø¯',
      'Ø§Ú¯Ø± .dvc commit Ù†Ø´ÙˆØ¯ØŒ Ù‡Ø± Ù†ÙØ± workflow Ø¯Ø§Ø¯Ù‡â€ŒÛŒ Ù…ØªÙØ§ÙˆØªÛŒ Ø¯Ø§Ø±Ø¯',
    ],
    startDialog: [
      {
        title: 'Ú†Ø±Ø§ Git Ø¨Ù‡â€ŒØªÙ†Ù‡Ø§ÛŒÛŒ Ø¨Ø±Ø§ÛŒ Ø¯Ø§Ø¯Ù‡â€ŒÛŒ ML Ø´Ú©Ø³Øª Ù…ÛŒâ€ŒØ®ÙˆØ±Ø¯',
        markdown:
          'Git Ù‡Ø± Ù†Ø³Ø®Ù‡â€ŒÛŒ ÙØ§ÛŒÙ„ Ø±Ø§ Ø¯Ø± `.git` Ù†Ú¯Ù‡ Ù…ÛŒâ€ŒØ¯Ø§Ø±Ø¯. Ø¨Ø±Ø§ÛŒ Ø³ÙˆØ±Ø³â€ŒÚ©Ø¯ Ø®ÙˆØ¨ Ø§Ø³Øª.\n\nØ¨Ø±Ø§ÛŒ **Ø¯ÛŒØªØ§Ø³Øª Ùˆ Ù…Ø¯Ù„** Ø®Ø±Ø§Ø¨ Ù…ÛŒâ€ŒØ´ÙˆØ¯:\n\n- Û±Û° Ú¯ÛŒÚ¯ Ø¯Ø± ØªØ§Ø±ÛŒØ®Ú†Ù‡ Ã— Ù†Ø³Ø®Ù‡â€ŒÙ‡Ø§ÛŒ Ø²ÛŒØ§Ø¯ = clone ØºÛŒØ±Ù‚Ø§Ø¨Ù„ Ø§Ø³ØªÙØ§Ø¯Ù‡\n- diff Ø¨Ø§ÛŒÙ†Ø±ÛŒ Ú©Ù†Ø¯ Ùˆ Ù†Ø§Ø®ÙˆØ§Ù†Ø§Ø³Øª\n- Ø±ÛŒÙˆÛŒÙˆØ± Ø¯Ø§Ø¯Ù‡â€ŒÛŒ Ø¢Ù…ÙˆØ²Ø´ÛŒ Ø±Ø§ Ø¯Ø± Ø±ÛŒÙ¾ÙˆÛŒ Ú©Ø¯ Ù†Ù…ÛŒâ€ŒØ®ÙˆØ§Ù‡Ø¯\n\n**DVC** Ù…Ø³Ø¦Ù„Ù‡ Ø±Ø§ Ù…ÛŒâ€ŒØ´Ú©Ù†Ø¯: Git Ù†Ú¯Ù‡â€ŒØ¯Ø§Ø±Ù†Ø¯Ù‡â€ŒÛŒ *pointer* Ø§Ø³ØªØ› cache/remote Ù†Ú¯Ù‡â€ŒØ¯Ø§Ø±Ù†Ø¯Ù‡â€ŒÛŒ *Ø¨Ø§ÛŒØªâ€ŒÙ‡Ø§*.',
      },
      {
        title: '`dvc init` Ø¯Ù‚ÛŒÙ‚Ø§Ù‹ Ú†Ù‡ Ù…ÛŒâ€ŒÚ©Ù†Ø¯',
        markdown:
          'ÛŒÚ© Ù¾ÙˆØ´Ù‡â€ŒÛŒ `.dvc/` Ù…ÛŒâ€ŒØ³Ø§Ø²Ø¯ Ø¨Ø§:\n\n- `config` â€” Ù…Ø­Ù„ remoteÙ‡Ø§ Ùˆ cache Ø¨Ø±Ø§ÛŒ Ø§ÛŒÙ† Ù¾Ø±ÙˆÚ˜Ù‡\n- `.gitignore` â€” ØªØ§ cache Ø¯Ø§Ø®Ù„ÛŒ DVC Ù†Ø§Ø®ÙˆØ§Ø³ØªÙ‡ commit Ù†Ø´ÙˆØ¯\n\n**Ø¯Ø§Ø¯Ù‡ Ø¢Ù¾Ù„ÙˆØ¯ Ù†Ù…ÛŒâ€ŒÚ©Ù†Ø¯.** Ø´Ù…Ø§ data-versioning Ø±Ø§ Ø¨Ø±Ø§ÛŒ Ù¾Ø±ÙˆÚ˜Ù‡ *Ø±ÙˆØ´Ù†* Ù…ÛŒâ€ŒÚ©Ù†ÛŒØ¯.\n\nÙ…Ø¯Ù„ Ø°Ù‡Ù†ÛŒ: `git init` Ø¨Ø±Ø§ÛŒ Ú©Ø¯ â‰ˆ `dvc init` Ø¨Ø±Ø§ÛŒ workflow Ø¯Ø§Ø¯Ù‡.',
      },
      {
        title: 'Ú†Ø±Ø§ Ø¨Ø§ÛŒØ¯ `.dvc/` Ø±Ø§ Ø¨Ø§ Git commit Ú©Ù†ÛŒØ¯',
        markdown:
          'Ù¾ÙˆØ´Ù‡â€ŒÛŒ `.dvc/` Ú©ÙˆÚ†Ú© Ùˆ Ù…Ø®ØµÙˆØµ ØªÛŒÙ… Ø§Ø³Øª.\n\n```\ngit add .dvc\ngit commit -m "Initialize DVC"\n```\n\nØ¨Ø¯ÙˆÙ† Ø§ÛŒÙ†ØŒ clone Ø´Ù…Ø§Ø±Ù‡â€ŒÛŒ Û² Ú©Ø¯ Ø¯Ø§Ø±Ø¯ ÙˆÙ„ÛŒ **Ù¾Ø±ÙˆÚ˜Ù‡â€ŒÛŒ DVC Ù†Ø¯Ø§Ø±Ø¯** â€” `dvc pull` Ú†ÛŒØ¯Ù…Ø§Ù† cache Ø´Ù…Ø§ Ø±Ø§ Ù†Ù…ÛŒâ€ŒØ´Ù†Ø§Ø³Ø¯.\n\nØ¨Ù‡ Ø¨ÙˆØ±Ø¯ Ù†Ú¯Ø§Ù‡ Ú©Ù†ÛŒØ¯: Workspace Ù…ÛŒâ€ŒØªÙˆØ§Ù†Ø¯ Â«initializedÂ» Ø¨Ø§Ø´Ø¯ Ø¯Ø± Ø­Ø§Ù„ÛŒ Ú©Ù‡ commit Ø±Ø§Ù‡â€ŒØ§Ù†Ø¯Ø§Ø²ÛŒ Ø¯Ø± Git Ù‡Ù†ÙˆØ² Ù†ÛŒØ³Øª.',
      },
    ],
  },
  'basics-2': {
    seriesTitle: 'Ù…Ø¨Ø§Ù†ÛŒ',
    name: 'ØªØ±Ú© Ú©Ø±Ø¯Ù† ÛŒÚ© Ø¯ÛŒØªØ§Ø³Øª',
    objective:
      '`data/data.xml` Ø±Ø§ Ø·ÙˆØ±ÛŒ ØªØ±Ú© Ú©Ù†ÛŒØ¯ Ú©Ù‡ Ù…Ø­ØªÙˆØ§ Ø¯Ø± cache Ø¨Ø§Ø´Ø¯ØŒ Git ÙÙ‚Ø· pointer Ø±Ø§ Ø¨Ø¨ÛŒÙ†Ø¯ Ùˆ Ù…Ø³ÛŒØ± Ø®Ø§Ù… gitignore Ø´ÙˆØ¯.',
    learning: [
      'dvc add = Ù‡Ø´ + Ø´ÛŒØ¡ cache + pointer ÙØ§ÛŒÙ„ .dvc + gitignore',
      'Git ÙÙ‚Ø· pointer (md5) Ø±Ø§ commit Ù…ÛŒâ€ŒÚ©Ù†Ø¯ØŒ Ù†Ù‡ ÙØ§ÛŒÙ„ Ø¨Ø²Ø±Ú¯ Ø±Ø§',
      'Ø¨ÙˆØ±Ø¯: ÙØ§ÛŒÙ„ Workspace Ø¨Ù‡ pointer ØªØ¨Ø¯ÛŒÙ„ Ù…ÛŒâ€ŒØ´ÙˆØ¯ Ùˆ Ø´ÛŒØ¡ cache Ø¸Ø§Ù‡Ø± Ù…ÛŒâ€ŒØ´ÙˆØ¯',
    ],
    fieldNotes: [
      'Ø¯ÛŒØªØ§Ø³Øª/Ù…Ø¯Ù„/Ø¢Ø±ØªÛŒÙÚ©ØªÛŒ Ø±Ø§ ØªØ±Ú© Ú©Ù†ÛŒØ¯ Ú©Ù‡ Ø¨Ø§Ø²Ø³Ø§Ø²ÛŒâ€ŒØ§Ø´ Ø§Ø±Ø²Ø§Ù† Ù†ÛŒØ³Øª',
      'Ø±ÛŒÙˆÛŒÙˆÛŒ PR Ø¨Ø§ÛŒØ¯ diff Ù‡Ø§ÛŒ pointer (md5) Ø±Ø§ Ø¨Ø®ÙˆØ§Ù†Ø¯ØŒ Ù†Ù‡ Ù…Ú¯Ø§Ø¨Ø§ÛŒØª CSV',
      'CI Ø¯Ø§Ø¯Ù‡ Ø±Ø§ Ø¨Ø§ DVC Ù…ÛŒâ€ŒÚ©Ø´Ø¯Ø› Ø§ÛŒÙ…ÛŒØ¬â€ŒÙ‡Ø§ Ø³Ø¨Ú© Ù…ÛŒâ€ŒÙ…Ø§Ù†Ù†Ø¯',
    ],
    startDialog: [
      {
        title: '`dvc add` Ú†Ù‡ Ù…ÛŒâ€ŒÚ©Ù†Ø¯',
        markdown:
          'Ú†Ù‡Ø§Ø± Ø§Ø«Ø± Ø¯Ø± ÛŒÚ© ÙØ±Ù…Ø§Ù†:\n\n1. Ù‡Ø´ (md5) Ø±ÙˆÛŒ Ù…Ø­ØªÙˆØ§ÛŒ ÙØ§ÛŒÙ„\n2. Ø¨Ø§ÛŒØªâ€ŒÙ‡Ø§ Ø¯Ø± `.dvc/cache`\n3. ÙØ§ÛŒÙ„ pointer Ú©ÙˆÚ†Ú© `.dvc` (YAML)\n4. Ù…Ø³ÛŒØ± Ø®Ø§Ù… Ø¯Ø± `.gitignore`\n\nØ¨Ø¹Ø¯ Ø§Ø² Ø¢Ù† Git ÙÙ‚Ø· pointer Ø±Ø§ Ù…ÛŒâ€ŒØ¨ÛŒÙ†Ø¯.',
      },
    ],
  },
  'basics-3': {
    seriesTitle: 'Ù…Ø¨Ø§Ù†ÛŒ',
    name: 'Ø¯Ø§Ø¯Ù‡â€ŒÛŒ dirty Ùˆ status',
    objective: 'Ø¯Ø§Ø¯Ù‡ Ø±Ø§ ØªØºÛŒÛŒØ± Ø¯Ù‡ÛŒØ¯ØŒ `dvc status` Ø¨Ø®ÙˆØ§Ù†ÛŒØ¯ Ùˆ Ø¨Ø§ `dvc commit` ÙˆØ¶Ø¹ÛŒØª Ø¬Ø¯ÛŒØ¯ Ø±Ø§ Ø«Ø¨Øª Ú©Ù†ÛŒØ¯.',
    learning: [
      'dvc status ÙØ¶Ø§ÛŒ Ú©Ø§Ø±ÛŒ Ø±Ø§ Ø¨Ø§ pointer Ùˆ cache Ù…Ù‚Ø§ÛŒØ³Ù‡ Ù…ÛŒâ€ŒÚ©Ù†Ø¯',
      'modified ÛŒØ¹Ù†ÛŒ Ø¨Ø§ÛŒØªâ€ŒÙ‡Ø§ Ø¨Ø§ md5 Ø¯Ø§Ø®Ù„ .dvc Ù†Ù…ÛŒâ€ŒØ®ÙˆØ§Ù†Ø¯',
      'dvc commit Ù†Ø³Ø®Ù‡â€ŒÛŒ Ø¬Ø¯ÛŒØ¯ Ø¯Ø§Ø¯Ù‡ Ø±Ø§ Ù…ÛŒâ€ŒÙ¾Ø°ÛŒØ±Ø¯',
    ],
    fieldNotes: [
      'Ø¯Ø§Ø¯Ù‡â€ŒÛŒ dirty Ø¨Ø¹Ø¯ Ø§Ø² feature engineering Ø¹Ø§Ø¯ÛŒ Ø§Ø³Øª',
      'Ú©ÙˆØ±Ú©ÙˆØ±Ø§Ù†Ù‡ commit Ù†Ú©Ù†ÛŒØ¯ â€” Ø§ÙˆÙ„ statusØŒ Ø¨Ø¹Ø¯ commit ÛŒØ§ checkout',
    ],
    startDialog: [
      {
        title: 'dirty Ø®Ø·Ø§ Ù†ÛŒØ³Øª',
        markdown:
          'Ù…Ø«Ù„ `git status` Ø¨Ø±Ø§ÛŒ Ø¯Ø§Ø¯Ù‡: ÛŒÚ© ØªØºÛŒÛŒØ± commitâ€ŒÙ†Ø´Ø¯Ù‡ Ø¯Ø§Ø±ÛŒØ¯.\n\nÙ¾Ø°ÛŒØ±Ø´: `dvc commit`\nØ¯ÙˆØ± Ø±ÛŒØ®ØªÙ†: `dvc checkout`',
      },
    ],
  },
  'remote-1': {
    seriesTitle: 'RemoteÙ‡Ø§',
    name: 'Ù¾ÛŒÚ©Ø±Ø¨Ù†Ø¯ÛŒ remote',
    objective:
      'ÛŒÚ© remote Ø¨Ø±Ø§ÛŒ DVC Ø¨Ø³Ø§Ø²ÛŒØ¯ Ùˆ Ø¢Ù† Ø±Ø§ default Ú©Ù†ÛŒØ¯ ØªØ§ push/pull Ø¨Ø¯Ø§Ù†Ø¯ Ø§Ø´ÛŒØ§ Ú©Ø¬Ø§ Ù…ÛŒâ€ŒØ±ÙˆÙ†Ø¯.',
    learning: [
      'remote Ø¯Ø§Ø¯Ù‡â€ŒÛŒ DVC Ø¨Ø§ remote Ú¯ÛŒØª ÙØ±Ù‚ Ø¯Ø§Ø±Ø¯',
      '-d Ù…Ø³ÛŒØ± default Ø±Ø§ Ù…Ø´Ø®Øµ Ù…ÛŒâ€ŒÚ©Ù†Ø¯',
      'Ú©Ø§Ù†ÙÛŒÚ¯ Ø¯Ø± .dvc/config Ø²Ù†Ø¯Ú¯ÛŒ Ù…ÛŒâ€ŒÚ©Ù†Ø¯ Ùˆ Ø¨Ù‡ Ø§Ø´ØªØ±Ø§Ú© Ù…ÛŒâ€ŒØ±ÙˆØ¯',
    ],
    fieldNotes: [
      'S3/GCS/SSH/local â€” Ù…Ù‡Ù… store Ø´ÛŒØ¡â€ŒÙ…Ø­ÙˆØ± Ø§Ø³Øª',
      'Ø¢Ø¯Ø±Ø³ remote Ø¯Ø§Ø®Ù„ Ø±ÛŒÙ¾ÙˆØ› credentials Ù‡Ø±Ú¯Ø²',
    ],
    startDialog: [
      {
        title: 'Ø¯Ùˆ remoteØŒ Ø¯Ùˆ ÙˆØ¸ÛŒÙÙ‡',
        markdown:
          '**Git remote** = Ú©Ø¯ + pointer.\n**DVC remote** = Ø§Ø´ÛŒØ§ÛŒ Ø³Ù†Ú¯ÛŒÙ† Ø¯Ø§Ø¯Ù‡.\n\n`dvc remote add -d myremote /tmp/dvcstore`',
      },
    ],
  },
  'remote-2': {
    seriesTitle: 'RemoteÙ‡Ø§',
    name: 'push Ø¯Ø§Ø¯Ù‡ Ø¨Ù‡ remote',
    objective: 'Ø¯Ø§Ø¯Ù‡â€ŒÛŒ ØªØ±Ú©â€ŒØ´Ø¯Ù‡ Ø±Ø§ Ø¨Ø§ `dvc push` Ø¢Ù¾Ù„ÙˆØ¯ Ú©Ù†ÛŒØ¯ ØªØ§ ØªÛŒÙ… Ø¨Ù‡ Ø¢Ù† Ø¯Ø³ØªØ±Ø³ÛŒ Ø¯Ø§Ø´ØªÙ‡ Ø¨Ø§Ø´Ø¯.',
    learning: [
      'dvc push ÙÙ‚Ø· Ø§Ø´ÛŒØ§ÛŒ Ø¬Ø§Ù…Ø§Ù†Ø¯Ù‡â€ŒÛŒ cache Ø±Ø§ Ù…ÛŒâ€ŒÙØ±Ø³ØªØ¯',
      'Ù‡Ù…â€ŒØªÛŒÙ…ÛŒâ€ŒÙ‡Ø§ Ø¨Ù‡ Ù‡Ù…Ø§Ù† commit Ú¯ÛŒØª + pull Ù†ÛŒØ§Ø² Ø¯Ø§Ø±Ù†Ø¯',
    ],
    fieldNotes: [
      'Ø¨Ø¹Ø¯ Ø§Ø² Ù‡Ø± ÙˆØ¶Ø¹ÛŒØª Ø¯Ø§Ø¯Ù‡â€ŒØ§ÛŒ Ú©Ù‡ Ø¯ÛŒÚ¯Ø±Ø§Ù† Ù„Ø§Ø²Ù… Ø¯Ø§Ø±Ù†Ø¯ push Ú©Ù†ÛŒØ¯',
      'CI Ù…ÛŒâ€ŒÚ©Ø´Ø¯ØŒ Ø¨Ù‡â€ŒØ¬Ø§ÛŒ Ù¾Ø®ØªÙ† Ø¯ÛŒØªØ§Ø³Øª Ø¯Ø± Ø§ÛŒÙ…ÛŒØ¬',
    ],
    startDialog: [
      {
        title: 'push Ø¨Ø§ÛŒØª Ù…ÛŒâ€ŒÙØ±Ø³ØªØ¯ØŒ Ù†Ù‡ Ú¯ÛŒØª',
        markdown: 'Git push = pointer.\nDVC push = Ø§Ø´ÛŒØ§ Ø¯Ø± data store.',
      },
    ],
  },
  'remote-3': {
    seriesTitle: 'RemoteÙ‡Ø§',
    name: 'Ù…Ø§Ø´ÛŒÙ† ØªØ§Ø²Ù‡: pull Ø¯Ø§Ø¯Ù‡',
    objective: 'Ø±ÙˆÛŒ ÛŒÚ© Ù…Ø§Ø´ÛŒÙ† ØªØ§Ø²Ù‡ Ø¯Ø§Ø¯Ù‡ Ø±Ø§ Ø¨Ø§ `dvc pull` Ù…Ø§Ø¯ÛŒ Ú©Ù†ÛŒØ¯ØŒ Ø¨Ø¯ÙˆÙ† Ø¢Ù†â€ŒÚ©Ù‡ Ø¨Ø§ÛŒØªâ€ŒÙ‡Ø§ Ø¯Ø± ØªØ§Ø±ÛŒØ®Ú†Ù‡â€ŒÛŒ Ú¯ÛŒØª Ø¨Ø§Ø´Ù†Ø¯.',
    learning: [
      'git clone ÙÙ‚Ø· pointer Ù…ÛŒâ€ŒØ¢ÙˆØ±Ø¯',
      'dvc pull Ø¯Ø§Ø¯Ù‡ Ø±Ø§ Ù…ÛŒâ€ŒØ¢ÙˆØ±Ø¯',
      'Ø¨Ø¹Ø¯ Ø§Ø² Ø¢Ù† Workspace Ùˆ pointer Ù‡Ù…â€ŒØ±Ø§Ø³ØªØ§ Ù‡Ø³ØªÙ†Ø¯',
    ],
    fieldNotes: [
      'Ø¢Ù†â€ŒØ¨ÙˆØ±Ø¯ÛŒÙ†Ú¯ Ú†Ù†Ø¯ Ø¯Ù‚ÛŒÙ‚Ù‡: clone + pull',
      'Ú¯Ù… Ø´Ø¯Ù† Ù„Ù¾â€ŒØªØ§Ù¾ ÛŒØ¹Ù†ÛŒ Ø§Ø² Ø¯Ø³Øª Ø±ÙØªÙ† Ø¯Ø§Ø¯Ù‡ Ù†ÛŒØ³ØªØŒ Ø§Ú¯Ø± remote Ù¾Ø± Ø¨Ø§Ø´Ø¯',
    ],
    startDialog: [
      {
        title: 'Ú©Ù„ÙˆÙ† Ú©ÙˆÚ†Ú©ØŒ Ø¯Ø§Ø¯Ù‡ Ø¨Ø²Ø±Ú¯',
        markdown: '```\ngit clone â€¦\ndvc pull\n```\n\nØªÙ…Ø§Ù…. Ø¨Ø¯ÙˆÙ† Ø¯Ø§Ù†Ù„ÙˆØ¯ Û´Û° Ú¯ÛŒÚ¯ Ø§Ø² ØªØ§Ø±ÛŒØ®Ú†Ù‡â€ŒÛŒ Ú¯ÛŒØª.',
      },
    ],
  },
  'pipe-1': {
    seriesTitle: 'PipelineÙ‡Ø§',
    name: 'ØªØ¹Ø±ÛŒÙ stage',
    objective:
      'ÛŒÚ© stage Ø¨Ø§ `dvc stage add` Ø¨Ø³Ø§Ø²ÛŒØ¯ (deps, outs, cmd) ØªØ§ Ø¨Ø§Ø²ØªÙˆÙ„ÛŒØ¯Ù¾Ø°ÛŒØ±ÛŒ Ù‚Ø±Ø§Ø±Ø¯Ø§Ø¯ÛŒ Ø´ÙˆØ¯.',
    learning: [
      'stageÙ‡Ø§ Ø¯Ø± dvc.yaml Ø²Ù†Ø¯Ú¯ÛŒ Ù…ÛŒâ€ŒÚ©Ù†Ù†Ø¯',
      'deps Ø¨Ø§ ØªØºÛŒÛŒØ±ØŒ stage Ø±Ø§ invalidate Ù…ÛŒâ€ŒÚ©Ù†Ù†Ø¯',
      'outs Ø¨Ø¹Ø¯ Ø§Ø² Ø§Ø¬Ø±Ø§ÛŒ Ù…ÙˆÙÙ‚ ØªØ±Ú© Ù…ÛŒâ€ŒØ´ÙˆÙ†Ø¯',
    ],
    fieldNotes: [
      'Ù‡Ø± Ù…Ø±Ø­Ù„Ù‡â€ŒÛŒ Ú¯Ø±Ø§Ù† Ø¢Ù…ÙˆØ²Ø´ Ù„Ø§ÛŒÙ‚ ÛŒÚ© stage Ø§Ø³Øª',
      'Ú©Ø¯ Ø¯Ø± Ú¯ÛŒØªØ› I/O Ø§Ø² Ù…Ø³ÛŒØ± DVC',
    ],
    startDialog: [
      {
        title: 'dvc.yaml ÛŒÚ© Ù‚Ø±Ø§Ø±Ø¯Ø§Ø¯ Ø§Ø³Øª',
        markdown:
          '```\ndvc stage add -n prepare \\\n  -d data/data.xml -o data/prepared.csv \\\n  python src/prepare.py\n```',
      },
    ],
  },
  'pipe-2': {
    seriesTitle: 'PipelineÙ‡Ø§',
    name: 'stage Ø¢Ù…ÙˆØ²Ø´ + repro',
    objective: 'Ù…Ø±Ø§Ø­Ù„ prepare Ùˆ train Ø±Ø§ ÙˆØµÙ„ Ú©Ù†ÛŒØ¯ Ùˆ Ø¨Ø§ `dvc repro` Ø§Ø¬Ø±Ø§ Ú©Ù†ÛŒØ¯.',
    learning: [
      'dvc repro ÙÙ‚Ø· stageÙ‡Ø§ÛŒ dirty Ø±Ø§ Ø¨Ù‡â€ŒØªØ±ØªÛŒØ¨ ØªÙˆÙ¾ÙˆÙ„ÙˆÚ˜ÛŒÚ© Ø§Ø¬Ø±Ø§ Ù…ÛŒâ€ŒÚ©Ù†Ø¯',
      'dvc.lock Ø±Ø³ÛŒØ¯ Ø§Ø¬Ø±Ø§Ø³Øª',
    ],
    fieldNotes: ['Ø¨Ø¹Ø¯ Ø§Ø² Ù‡Ø± ØªØºÛŒÛŒØ± Ù…Ù‡Ù… repro Ú©Ù†ÛŒØ¯', 'lock Ø±Ø§ Ø¯Ø³ØªÛŒ ÙˆÛŒØ±Ø§ÛŒØ´ Ù†Ú©Ù†ÛŒØ¯'],
    startDialog: [
      {
        title: 'Ø³ÛŒØ³ØªÙ… build Ø¨Ø±Ø§ÛŒ ML',
        markdown: 'ÙÙ‚Ø· Ú†ÛŒØ²ÛŒ Ú©Ù‡ Ø¹ÙˆØ¶ Ø´Ø¯Ù‡ Ø¯ÙˆØ¨Ø§Ø±Ù‡ Ø§Ø¬Ø±Ø§ Ù…ÛŒâ€ŒØ´ÙˆØ¯.\n\n`dvc repro`',
      },
    ],
  },
  'pipe-3': {
    seriesTitle: 'PipelineÙ‡Ø§',
    name: 'ØªØºÛŒÛŒØ± Ù¾Ø§Ø±Ø§Ù…ØªØ± â†’ repro',
    objective: 'Ù‡Ø§ÛŒÙ¾Ø±Ù¾Ø§Ø±Ø§Ù…ØªØ± Ø±Ø§ Ø¯Ø± `params.yaml` Ø¹ÙˆØ¶ Ú©Ù†ÛŒØ¯ØŒ repro Ø¨Ø²Ù†ÛŒØ¯ Ùˆ metrics Ø±Ø§ Ù…Ù‚Ø§ÛŒØ³Ù‡ Ú©Ù†ÛŒØ¯.',
    learning: [
      'params.yaml Ø¨Ø±Ø§ÛŒ Ø§Ù†Ø³Ø§Ù† Ù‚Ø§Ø¨Ù„ Ø±ÛŒÙˆÛŒÙˆØ³Øª',
      '-p Ù¾Ø§Ø±Ø§Ù…ØªØ±Ù‡Ø§ Ø±Ø§ Ø¨Ù‡ stage Ú¯Ø±Ù‡ Ù…ÛŒâ€ŒØ²Ù†Ø¯',
      'metrics Ù†Ø´Ø§Ù† Ù…ÛŒâ€ŒØ¯Ù‡Ø¯ Ø§Ø¬Ø±Ø§ Ú†Ù‡ Ø¢ÙˆØ±Ø¯',
    ],
    fieldNotes: ['ØªØºÛŒÛŒØ± Ù¾Ø§Ø±Ø§Ù…ØªØ± Ø¯Ø± Ø¢Ø²Ù…Ø§ÛŒØ´ Ø¹Ø§Ø¯ÛŒ Ø§Ø³Øª', 'Ù‚Ø¨Ù„ Ø§Ø² merge Ø­ØªÙ…Ø§Ù‹ diff'],
    startDialog: [
      {
        title: 'Ù¾Ø§Ø±Ø§Ù…ØªØ±Ù‡Ø§ first-class Ù‡Ø³ØªÙ†Ø¯',
        markdown: '`lr` Ø±Ø§ Ø¯Ø± `params.yaml` Ø¹ÙˆØ¶ Ú©Ù†ÛŒØ¯ØŒ Ø¨Ø¹Ø¯ `dvc repro` Ùˆ `dvc metrics show`.',
      },
    ],
  },
  'exp-1': {
    seriesTitle: 'Ø¢Ø²Ù…Ø§ÛŒØ´â€ŒÙ‡Ø§',
    name: 'Ø§Ø¬Ø±Ø§ÛŒ ÛŒÚ© Ø¢Ø²Ù…Ø§ÛŒØ´',
    objective: 'Ø§ÙˆÙ„ÛŒÙ† Ø¢Ø²Ù…Ø§ÛŒØ´ Ø±Ø§ Ø¨Ø§ `dvc exp run` Ø±ÙˆÛŒ pipeline Ù…ÙˆØ¬ÙˆØ¯ Ø§Ø¬Ø±Ø§ Ú©Ù†ÛŒØ¯.',
    learning: ['exp run Ø¨Ø¯ÙˆÙ† Ø´Ù„ÙˆØºÛŒ Ø´Ø§Ø®Ù‡', 'Ù¾Ø§Ø±Ø§Ù…ØªØ± Ùˆ metrics Ø«Ø¨Øª Ù…ÛŒâ€ŒØ´ÙˆÙ†Ø¯'],
    fieldNotes: ['Ø¢Ø²Ù…Ø§ÛŒØ´ Ø¬Ø§ÛŒ Ø´Ø§Ø®Ù‡â€ŒÛŒ ÙˆØ­Ø´ÛŒ Ø±Ø§ Ù…ÛŒâ€ŒÚ¯ÛŒØ±Ø¯', 'Ù‡Ù…ÛŒØ´Ù‡ Ø¨Ø§ exp show Ù…Ù‚Ø§ÛŒØ³Ù‡ Ú©Ù†ÛŒØ¯'],
    startDialog: [
      {
        title: 'Ø¢Ø²Ù…Ø§ÛŒØ´ Ø¨Ø¯ÙˆÙ† Ø§Ù†ÙØ¬Ø§Ø± Ø´Ø§Ø®Ù‡',
        markdown: '`dvc exp run` â€” pipeline Ø¯Ø± Ø¨Ø§ÙØª Ø¢Ø²Ù…Ø§ÛŒØ´.',
      },
    ],
  },
  'exp-2': {
    seriesTitle: 'Ø¢Ø²Ù…Ø§ÛŒØ´â€ŒÙ‡Ø§',
    name: 'Ø¬Ø³Øªâ€ŒÙˆØ¬ÙˆÛŒ Ù¾Ø§Ø±Ø§Ù…ØªØ±',
    objective: 'Ø¨Ø§ `-S` Ù¾Ø§Ø±Ø§Ù…ØªØ± Ø±Ø§ override Ú©Ù†ÛŒØ¯ Ùˆ Ø¨Ø§ `dvc exp show` Ù…Ù‚Ø§ÛŒØ³Ù‡ Ú©Ù†ÛŒØ¯.',
    learning: ['-S Ù…Ù‚Ø¯Ø§Ø± Ù¾Ø§Ø±Ø§Ù…ØªØ± Ø±Ø§ Ø¨Ø±Ø§ÛŒ Ù‡Ù…Ø§Ù† Ø§Ø¬Ø±Ø§ Ù…ÛŒâ€ŒÙ†ÙˆÛŒØ³Ø¯', 'exp show Ø¬Ø¯ÙˆÙ„ params Ø¯Ø± Ø¨Ø±Ø§Ø¨Ø± metrics'],
    fieldNotes: ['sweep Ø§Ù„Ú¯ÙˆÛŒ Ø§Ø³ØªØ§Ù†Ø¯Ø§Ø±Ø¯ Ø¯Ø± Ø¯ÙˆØ±Ù‡â€ŒÙ‡Ø§ Ùˆ ØªÙˆÙ„ÛŒØ¯ Ø§Ø³Øª'],
    startDialog: [
      {
        title: 'Ø¨Ù‡â€ŒØ¬Ø§ÛŒ Ø­Ø¯Ø³ØŒ sweep',
        markdown: '`dvc exp run -S lr=0.05` Ùˆ Ø¯ÙˆØ³ØªØ§Ù†ØŒ Ø¨Ø¹Ø¯ `dvc exp show`.',
      },
    ],
  },
  'exp-3': {
    seriesTitle: 'Ø¢Ø²Ù…Ø§ÛŒØ´â€ŒÙ‡Ø§',
    name: 'Ø§Ø¹Ù…Ø§Ù„ Ø¨Ø±Ù†Ø¯Ù‡',
    objective: 'Ø¨Ø§ `dvc exp apply` Ø¨Ù‡ØªØ±ÛŒÙ† Ù¾ÛŒÚ©Ø±Ø¨Ù†Ø¯ÛŒ Ø¢Ø²Ù…Ø§ÛŒØ´ Ø±Ø§ Ø¨Ù‡ Workspace Ø¨ÛŒØ§ÙˆØ±ÛŒØ¯.',
    learning: ['exp apply Ù¾Ø§Ø±Ø§Ù…ØªØ±/metrics Ø¨Ø±Ù†Ø¯Ù‡ Ø±Ø§ promote Ù…ÛŒâ€ŒÚ©Ù†Ø¯', 'Ø¨Ø¹Ø¯ Ø¢Ø±ØªÛŒÙÚ©Øªâ€ŒÙ‡Ø§ Ø±Ø§ repro Ú©Ù†ÛŒØ¯'],
    fieldNotes: ['Ø¨Ø±Ø¯Ù‡ baseline Ø¬Ø¯ÛŒØ¯ Ù…ÛŒâ€ŒØ´ÙˆÙ†Ø¯ â€” Ø¯Ø± Ù†ÙˆØª Ú©Ù¾ÛŒ Ù†Ú©Ù†ÛŒØ¯'],
    startDialog: [
      {
        title: 'Ø§Ø² Ø§Ø¬Ø±Ø§ ØªØ§ baseline',
        markdown: '`dvc exp apply exp-xxxxxx` â€” Ø¨Ø¯ÙˆÙ† ØªØ§ÛŒÙ¾ Ø¯ÙˆØ¨Ø§Ø±Ù‡â€ŒÛŒ Ù…Ù‚Ø§Ø¯ÛŒØ±.',
      },
    ],
  },
  'field-1': {
    seriesTitle: 'ØªÙ…Ø±ÛŒÙ† Ù…ÛŒØ¯Ø§Ù†ÛŒ',
    name: 'Ø¨Ø§Ø²Ú¯Ø±Ø¯Ø§Ù†Ø¯Ù† Ù†Ø³Ø®Ù‡â€ŒÛŒ Ù‚Ø¯ÛŒÙ…ÛŒ Ø¯Ø§Ø¯Ù‡',
    objective:
      'Ø¨Ø§ `git checkout` Ùˆ `dvc checkout` ÛŒÚ© Ù†Ø³Ø®Ù‡â€ŒÛŒ Ù‚Ø¯ÛŒÙ…ÛŒ Ø¯Ø§Ø¯Ù‡ Ø¨Ø±Ú¯Ø±Ø¯Ø§Ù†ÛŒØ¯ â€” ØªÙ…Ø±ÛŒÙ† rollback ØªÙˆÙ„ÛŒØ¯.',
    learning: ['Ø¹ÙˆØ¶ Ú©Ø±Ø¯Ù† pointer Ø§Ø±Ø²Ø§Ù† Ø§Ø³Øª', 'dvc checkout Ø¨Ø§ÛŒØªâ€ŒÙ‡Ø§ Ø±Ø§ materialize Ù…ÛŒâ€ŒÚ©Ù†Ø¯'],
    fieldNotes: ['rollback Ø±Ø§ ØªÙ…Ø±ÛŒÙ† Ú©Ù†ÛŒØ¯ØŒ Ù‚Ø¨Ù„ Ø§Ø² Ø³Ø§Ø¹Øª Û² Ø¨Ø§Ù…Ø¯Ø§Ø¯'],
    startDialog: [
      {
        title: 'rollback Ø¯Ø± Ø¯Ùˆ ÙØ±Ù…Ø§Ù†',
        markdown: '```\ngit checkout HEAD~1 data/data.xml.dvc\ndvc checkout\n```',
      },
    ],
  },
  'field-2': {
    seriesTitle: 'ØªÙ…Ø±ÛŒÙ† Ù…ÛŒØ¯Ø§Ù†ÛŒ',
    name: 'Ø¯Ø§Ø¯Ù‡ Ø¹ÙˆØ¶ Ø´Ø¯ â†’ pipeline Ú©Ù‡Ù†Ù‡',
    objective: 'Ø¨Ø¹Ø¯ Ø§Ø² ØªØºÛŒÛŒØ± Ø¯Ø§Ø¯Ù‡ØŒ pipeline Ø±Ø§ Ø¨Ø§ `dvc repro` ØªØ§Ø²Ù‡ Ú©Ù†ÛŒØ¯.',
    learning: ['ØªØºÛŒÛŒØ± Ø¯Ø§Ø¯Ù‡ stageÙ‡Ø§ÛŒ ÙˆØ§Ø¨Ø³ØªÙ‡ Ø±Ø§ invalidate Ù…ÛŒâ€ŒÚ©Ù†Ø¯', 'repro Ø¬Ø¨Ø±Ø§Ù† Ù…ÛŒâ€ŒÚ©Ù†Ø¯'],
    fieldNotes: ['Ø¯Ø±ÛŒÙØª Ø¯Ø§Ø¯Ù‡ Ø±ÙˆØ²Ù…Ø±Ù‡ Ø§Ø³Øª â€” Ù¾Ø§Ø³Ø® repro Ø§Ø³Øª'],
    startDialog: [
      {
        title: 'ÙˆÙ‚ØªÛŒ Ø¯Ù†ÛŒØ§ Ù…ÛŒâ€ŒÚ†Ø±Ø®Ø¯',
        markdown: 'Ø¯Ø§Ø¯Ù‡ Ø¹ÙˆØ¶ Ù…ÛŒâ€ŒØ´ÙˆØ¯ â†’ stageÙ‡Ø§ dirty â†’ `dvc repro`.',
      },
    ],
  },
  'field-3': {
    seriesTitle: 'ØªÙ…Ø±ÛŒÙ† Ù…ÛŒØ¯Ø§Ù†ÛŒ',
    name: 'promote Ø¨Ø±Ù†Ø¯Ù‡ Ø³Ù¾Ø³ repro',
    objective: 'Ø¨Ø±Ù†Ø¯Ù‡â€ŒÛŒ Ø¢Ø²Ù…Ø§ÛŒØ´ Ø±Ø§ Ø§Ø¹Ù…Ø§Ù„ Ùˆ Ø¢Ø±ØªÛŒÙÚ©Øªâ€ŒÙ‡Ø§ Ø±Ø§ Ø¯ÙˆØ¨Ø§Ø±Ù‡ Ø¨Ø³Ø§Ø²ÛŒØ¯.',
    learning: ['apply + repro = baseline Ø¬Ø¯ÛŒØ¯'],
    fieldNotes: ['Ù…Ø³ÛŒØ± ØªÙˆÙ„ÛŒØ¯ Ø¨Ø¹Ø¯ Ø§Ø² ÛŒÚ© sweep Ø®ÙˆØ¨'],
    startDialog: [
      {
        title: 'promote Ùˆ Ø¨Ø³Ø§Ø²',
        markdown: 'Ø§ÙˆÙ„ `dvc exp apply`ØŒ Ø¨Ø¹Ø¯ `dvc repro`.',
      },
    ],
  },
  'capstone-1': {
    seriesTitle: 'Ú©Ù¾â€ŒØ§Ø³ØªÙˆÙ†',
    name: 'ØªÙ…Ø±ÛŒÙ† end-to-end',
    objective: 'Ø§Ø² Ø¯Ø§Ø¯Ù‡â€ŒÛŒ dirty ØªØ§ ÙˆØ¶Ø¹ÛŒØª Ù…Ø´ØªØ±Ú©: Ú©Ù„ workflow DVC Ø±Ø§ Ø¯Ø± ÛŒÚ© Ø³Ù†Ø§Ø±ÛŒÙˆ Ø±Ø¯ Ú©Ù†ÛŒØ¯.',
    learning: ['add/commit/push/pull Ø¨Ù‡â€ŒØ¹Ù†ÙˆØ§Ù† ÛŒÚ© Ø¯Ø§Ø³ØªØ§Ù†', 'pipeline Ùˆ exp Ø¯Ø± Ø¨Ø§ÙØª'],
    fieldNotes: ['Ø§ÛŒÙ† Ø±ÙˆØ² Ø¹Ø§Ø¯ÛŒ Ø¯Ø± ØªÛŒÙ… ML Ø§Ø³Øª'],
    startDialog: [
      {
        title: 'Ù‡Ù…Ù‡â€ŒÚ†ÛŒØ² Ú©Ù†Ø§Ø± Ù‡Ù…',
        markdown: 'ÙˆÙ‚Øª Ø¢Ù† Ø§Ø³Øª Ú©Ù‡ ØªÚ©Ù‡â€ŒÙ‡Ø§ Ø±Ø§ Ø¨Ù‡ ÛŒÚ© Ù„Ø§ÛŒÙ‡â€ŒÛŒ ØªÙˆÙ„ÛŒØ¯ ØªØ¨Ø¯ÛŒÙ„ Ú©Ù†ÛŒØ¯.',
      },
    ],
  },
  'field-5': {
    seriesTitle: 'ØªÙ…Ø±ÛŒÙ† Ù…ÛŒØ¯Ø§Ù†ÛŒ',
    name: 'registry / import',
    objective: 'ÙØ§ÛŒÙ„ Ø±Ø§ Ø§Ø² Ù¾Ø±ÙˆÚ˜Ù‡â€ŒÛŒ DVC Ø¯ÛŒÚ¯Ø± Ø¨Ú¯ÛŒØ±ÛŒØ¯ ÛŒØ§ import Ú©Ù†ÛŒØ¯ Ùˆ version Ú©Ù†ÛŒØ¯.',
    learning: ['dvc get Ú©Ù¾ÛŒ Ù…ÛŒâ€ŒÚ©Ù†Ø¯', 'dvc import ÙˆØ§Ø¨Ø³ØªÚ¯ÛŒ Ø±Ø§ version Ù…ÛŒâ€ŒÚ©Ù†Ø¯'],
    fieldNotes: ['Ø§Ù„Ú¯ÙˆÛŒ feature store Ùˆ model registry'],
    startDialog: [
      {
        title: 'get Ø¯Ø± Ø¨Ø±Ø§Ø¨Ø± import',
        markdown: '`dvc get` = Ú©Ù¾ÛŒ. `dvc import` = ÙˆØ§Ø¨Ø³ØªÚ¯ÛŒ versionâ€ŒØ´Ø¯Ù‡ (Ù…ÛŒâ€ŒÙ†ÙˆÛŒØ³Ø¯ .dvc).',
      },
    ],
  },
  'field-6': {
    seriesTitle: 'ØªÙ…Ø±ÛŒÙ† Ù…ÛŒØ¯Ø§Ù†ÛŒ',
    name: 'Ø­Ø§Ø¯Ø«Ù‡: Ú©Ø¯Ø§Ù… Ø¯Ø§Ø¯Ù‡ØŸ',
    objective: 'Ø¨Ù‡ Ù¾Ø±Ø³Ø´ Ø­Ø§Ø¯Ø«Ù‡ Ù¾Ø§Ø³Ø® Ø¯Ù‡ÛŒØ¯: Ú©Ø¯Ø§Ù… Ø¯ÛŒØªØ§Ø³Øª Ø§ÛŒÙ† Ù…Ø¯Ù„ Ø±Ø§ Ø³Ø§Ø®ØªÙ‡ØŸ',
    learning: [
      'commit Ú¯ÛŒØª â†’ md5 pointer â†’ cache/remote',
      'Ø§Ú¯Ø± pointerÙ‡Ø§ commit Ù†Ø´Ø¯Ù‡ Ø¨Ø§Ø´Ù†Ø¯ØŒ Ù¾Ø§Ø³Ø® ÙˆØ¬ÙˆØ¯ Ù†Ø¯Ø§Ø±Ø¯',
    ],
    fieldNotes: ['postmortem Ø¨Ù‡ Ø§ÛŒÙ† Ø²Ù†Ø¬ÛŒØ±Ù‡ Ù†ÛŒØ§Ø² Ø¯Ø§Ø±Ø¯ â€” Ø§Ø² Ù‚Ø¨Ù„ ØªÙ…Ø±ÛŒÙ† Ú©Ù†ÛŒØ¯'],
    startDialog: [
      {
        title: 'Ø³Ø§Ø¹Øª Û³ Ø¨Ø§Ù…Ø¯Ø§Ø¯ Ø¯Ø± Ø­Ø§Ø¯Ø«Ù‡',
        markdown: 'Â«Ú©Ø¯Ø§Ù… Ø¯Ø§Ø¯Ù‡ Ø§ÛŒÙ† Ù…Ø¯Ù„ Ø±Ø§ Ø³Ø§Ø®ØªØŸÂ» â€” Ø²Ù†Ø¬ÛŒØ±Ù‡ Ø¨Ø§ÛŒØ¯ Ø¨Ø§ÛŒØ³ØªØ¯.',
      },
    ],
  },
  'meta-1': {
    seriesTitle: 'ÙØ§ÛŒÙ„â€ŒÙ‡Ø§ÛŒ Ù…ØªØ§',
    name: 'Ø®ÙˆØ§Ù†Ø¯Ù† dvc.yaml Ùˆ dvc.lock',
    objective: 'dvc.yaml Ø±Ø§ Ø¨Ù‡â€ŒØ¹Ù†ÙˆØ§Ù† Ù‚Ø±Ø§Ø±Ø¯Ø§Ø¯ Ùˆ dvc.lock Ø±Ø§ Ø¨Ù‡â€ŒØ¹Ù†ÙˆØ§Ù† Ø±Ø³ÛŒØ¯ Ø§Ø¬Ø±Ø§ ØªÙ…Ø§ÛŒØ² Ø¯Ù‡ÛŒØ¯.',
    learning: ['yaml = ØªØ¹Ø±ÛŒÙ', 'lock = Ø±Ø³ÛŒØ¯ (md5/Ù¾Ø§Ø±Ø§Ù…ØªØ±Ù‡Ø§)'],
    fieldNotes: ['lock Ø±Ø§ Ø¯Ø³ØªÛŒ ÙˆÛŒØ±Ø§ÛŒØ´ Ù†Ú©Ù†ÛŒØ¯ â€” Ù‡Ù…ÛŒØ´Ù‡ repro'],
    startDialog: [
      {
        title: 'Ù‚Ø±Ø§Ø±Ø¯Ø§Ø¯ Ùˆ Ø±Ø³ÛŒØ¯',
        markdown: '`cat dvc.yaml` Ùˆ `cat dvc.lock` â€” ØªØ¹Ø±ÛŒÙ Ø¯Ø± Ø¨Ø±Ø§Ø¨Ø± Ø§Ø¬Ø±Ø§.',
      },
    ],
  },
  'meta-2': {
    seriesTitle: 'ÙØ§ÛŒÙ„â€ŒÙ‡Ø§ÛŒ Ù…ØªØ§',
    name: '.dvcignore',
    objective: 'Ù…Ø³ÛŒØ±Ù‡Ø§ Ø±Ø§ Ø¨Ø§ `.dvcignore` Ø­Ø°Ù Ú©Ù†ÛŒØ¯ ØªØ§ DVC Ø±ÙˆÛŒ Ø¯Ø±Ø®Øªâ€ŒÙ‡Ø§ÛŒ Ø¨Ø²Ø±Ú¯ Ø³Ø±ÛŒØ¹ Ø¨Ù…Ø§Ù†Ø¯.',
    learning: ['.dvcignore Ø¨Ø§ .gitignore ÙØ±Ù‚ Ø¯Ø§Ø±Ø¯', 'ÙÙ‚Ø· DVC Ø§ÛŒÙ† Ù…Ø³ÛŒØ±Ù‡Ø§ Ø±Ø§ Ù…ÛŒâ€ŒÙ¾Ø±Ø¯'],
    fieldNotes: ['Ù¾ÙˆØ´Ù‡â€ŒÙ‡Ø§ÛŒ scratch Ùˆ Ø¯Ø§Ø¯Ù‡â€ŒÛŒ Ù…ÙˆÙ‚Øª Ø±Ø§ Ø¨ÛŒØ±ÙˆÙ† Ù†Ú¯Ù‡ Ø¯Ø§Ø±ÛŒØ¯'],
    startDialog: [
      {
        title: 'Ú†Ù‡ Ú†ÛŒØ²ÛŒ Ø±Ø§ DVC Ù†Ø§Ø¯ÛŒØ¯Ù‡ Ù…ÛŒâ€ŒÚ¯ÛŒØ±Ø¯',
        markdown: '`.dvcignore` Ø¨Ø§ Ø§Ù„Ú¯ÙˆÛŒ Ù…Ø³ÛŒØ± â€” Ø³Ø±Ø¹Øª Ø±ÙˆÛŒ Ø¯Ø±Ø®Øªâ€ŒÙ‡Ø§ÛŒ Ø¨Ø²Ø±Ú¯.',
      },
    ],
  },
  'meta-3': {
    seriesTitle: 'ÙØ§ÛŒÙ„â€ŒÙ‡Ø§ÛŒ Ù…ØªØ§',
    name: 'update + Ù†Ø¸Ø± CML',
    objective: 'importÙ‡Ø§ Ø±Ø§ Ø¨Ø§ `dvc update` ØªØ§Ø²Ù‡ Ú©Ù†ÛŒØ¯ Ùˆ Ø¨Ø§Ø²Ø®ÙˆØ±Ø¯ CI Ø±Ø§ Ø¨Ø§ CML Ø¨Ù‡ PR Ø¨ÛŒØ§ÙˆØ±ÛŒØ¯.',
    learning: ['update Ù†Ø³Ø®Ù‡â€ŒÛŒ upstream Ø±Ø§ Ù…ÛŒâ€ŒÚ¯ÛŒØ±Ø¯', 'CML metrics/plot Ø±Ø§ Ø±ÙˆÛŒ PR Ù…ÛŒâ€ŒÚ¯Ø°Ø§Ø±Ø¯'],
    fieldNotes: ['Ø§Ø³Ú©Ù„Øª CI: clone â†’ pull â†’ repro â†’ cml comment'],
    startDialog: [
      {
        title: 'ØªØ§Ø²Ù‡ Ù†Ú¯Ù‡ Ø¯Ø§Ø±ØŒ Ù†Ø´Ø§Ù† Ø¨Ø¯Ù‡',
        markdown: '`dvc update` Ùˆ Ù†Ø¸Ø±Ù‡Ø§ÛŒ CML Ø¯Ø± PR.',
      },
    ],
  },
  'cmp-1': {
    seriesTitle: 'Ù…Ù‚Ø§ÛŒØ³Ù‡',
    name: 'params / metrics diff',
    objective: 'Workspace Ø±Ø§ Ø¨Ø§ HEAD Ø¨Ø§ params/metrics diff Ù…Ù‚Ø§ÛŒØ³Ù‡ Ú©Ù†ÛŒØ¯.',
    learning: ['diff = Ù†Ù…Ø§ÛŒ Ø±ÛŒÙˆÛŒÙˆ Ø¨Ø±Ø§ÛŒ ØªØºÛŒÛŒØ±Ø§Øª ML'],
    fieldNotes: ['Ù‚Ø¨Ù„ Ø§Ø² merge Ø­ØªÙ…Ø§Ù‹ diff Ø¨Ø®ÙˆØ§Ù†ÛŒØ¯'],
    startDialog: [
      {
        title: 'Ø±ÛŒÙˆÛŒÙˆØŒ Ù†Ù‡ Ø­Ø¯Ø³',
        markdown: '`dvc params diff` Â· `dvc metrics diff`',
      },
    ],
  },
  'cmp-2': {
    seriesTitle: 'Ù…Ù‚Ø§ÛŒØ³Ù‡',
    name: 'exp diff Ø¨Ø¹Ø¯ Ø§Ø² Ù¾Ø§Ø±Ø§Ù…ØªØ± ØªÙˆ Ø¯Ø± ØªÙˆ',
    objective: 'Ø¢Ø²Ù…Ø§ÛŒØ´â€ŒÙ‡Ø§ Ø±Ø§ Ø¨Ø¹Ø¯ Ø§Ø² Ø§Ø¬Ø±Ø§ÛŒ Ù¾Ø§Ø±Ø§Ù…ØªØ± ØªÙˆ Ø¯Ø± ØªÙˆ Ø¨Ø§ `dvc exp diff` Ù…Ù‚Ø§ÛŒØ³Ù‡ Ú©Ù†ÛŒØ¯.',
    learning: ['exp diff Ø¯Ø±ÛŒÙØª Ù¾Ø§Ø±Ø§Ù…ØªØ± Ùˆ metrics Ø±Ø§ Ù†Ø´Ø§Ù† Ù…ÛŒâ€ŒØ¯Ù‡Ø¯'],
    fieldNotes: ['Ú©Ù„ÛŒØ¯Ù‡Ø§ÛŒ ØªÙˆ Ø¯Ø± ØªÙˆ Ù…Ø«Ù„ train.lr Ø±Ø§ Ø¬Ø¯ÛŒ Ø¨Ú¯ÛŒØ±ÛŒØ¯'],
    startDialog: [
      {
        title: 'Ù¾Ø§Ø±Ø§Ù…ØªØ± ØªÙˆ Ø¯Ø± ØªÙˆ',
        markdown: 'Ø¯Ùˆ Ø§Ø¬Ø±Ø§ØŒ ÛŒÚ© Ù…Ø³ÛŒØ± `train.n_est` â€” Ø¨Ø¹Ø¯ `dvc exp diff`.',
      },
    ],
  },
  'reg-1': {
    seriesTitle: 'Ø±Ø¬ÛŒØ³ØªØ±ÛŒ',
    name: 'import Ø¯Ø§Ø¯Ù‡',
    objective: 'ÛŒÚ© Ø¯ÛŒØªØ§Ø³Øª Ø±Ø§ Ø§Ø² registry/URL import Ùˆ version Ú©Ù†ÛŒØ¯.',
    learning: ['import-url Ù…Ù†Ø¨Ø¹ Ø®Ø§Ø±Ø¬ÛŒ Ø±Ø§ ØªØ±Ú© Ù…ÛŒâ€ŒÚ©Ù†Ø¯'],
    fieldNotes: ['Ø¯Ø§Ø¯Ù‡â€ŒÛŒ Ø®Ø§Ø±Ø¬ÛŒ Ù‡Ù…Ø§Ù† Ø§Ù†Ø¶Ø¨Ø§Ø· pointer Ø±Ø§ Ù…ÛŒâ€ŒØ®ÙˆØ§Ù‡Ø¯'],
    startDialog: [
      {
        title: 'Ù…Ù†Ø§Ø¨Ø¹ Ø®Ø§Ø±Ø¬ÛŒ',
        markdown: '`dvc import-url` â€” URL Ø®Ø§Ø±Ø¬ÛŒ Ø¨Ù‡â€ŒØ¹Ù†ÙˆØ§Ù† Ø¯Ø§Ø¯Ù‡â€ŒÛŒ ØªØ±Ú©â€ŒØ´Ø¯Ù‡.',
      },
    ],
  },
  'reg-2': {
    seriesTitle: 'Ø±Ø¬ÛŒØ³ØªØ±ÛŒ',
    name: 'promote Ù…Ø¯Ù„',
    objective: 'Ù…Ø¯Ù„ Ø±Ø§ Ø¢Ø±ØªÛŒÙÚ©Øª Ø¨Ø¯Ø§Ù†ÛŒØ¯ Ùˆ Ø¨Ø§ git tag + pull promote Ú©Ù†ÛŒØ¯.',
    learning: ['Ø§Ù„Ú¯ÙˆÛŒ registry: tag + Ù…Ø¯Ù„ Ú©Ø´ÛŒØ¯Ù‡â€ŒØ´Ø¯Ù‡'],
    fieldNotes: ['ÙˆØ²Ù†Ù‡ Ø±Ø§ Ø§ÛŒÙ…ÛŒÙ„ Ù†Ú©Ù†ÛŒØ¯ â€” ÙˆØ¶Ø¹ÛŒØª Ø±Ø§ pull Ú©Ù†ÛŒØ¯'],
    startDialog: [
      {
        title: 'promote Ø¨Ù‡â€ŒØ¬Ø§ÛŒ Ø§ÛŒÙ…ÛŒÙ„',
        markdown: 'git tag + `dvc pull` Ø¨Ù‡â€ŒØ¬Ø§ÛŒ WeTransfer.',
      },
    ],
  },
  'camp-1': {
    seriesTitle: 'DVCLive',
    name: 'Ø§Ø¨Ø²Ø§Ø±Ú©â€ŒÚ¯Ø°Ø§Ø±ÛŒ Ø¨Ø§ DVCLive',
    objective: 'Ø¢Ù…ÙˆØ²Ø´ Ø±Ø§ Ø¨Ø§ DVCLive Ø§Ø¨Ø²Ø§Ø±Ú©â€ŒÚ¯Ø°Ø§Ø±ÛŒ Ú©Ù†ÛŒØ¯: Ù¾Ø§Ø±Ø§Ù…ØªØ±ØŒ metricsØŒ plot Ùˆ Ú¯Ø²Ø§Ø±Ø´ Ø®ÙˆØ¯Ú©Ø§Ø±.',
    learning: [
      'Live / log_metric / log_plot / make_report',
      'Ø§Ø³Ú©Ø§Ù„Ø± â†’ metricsØŒ Ø³Ø±ÛŒ â†’ plot',
    ],
    fieldNotes: ['Ù¾Ù„ Ø§Ø² Ù†ÙˆØªâ€ŒØ¨ÙˆÚ© Ø¨Ù‡ exp show/plots'],
    startDialog: [
      {
        title: 'DVCLive',
        markdown: '```python\nfrom dvclive import Live\nwith Live() as live:\n    live.log_metric("acc", 0.92)\n```',
      },
    ],
  },
  'camp-2': {
    seriesTitle: 'DVCLive',
    name: 'Ù‚Ø§Ù„Ø¨â€ŒÙ‡Ø§ÛŒ Ù†Ù…ÙˆØ¯Ø§Ø±',
    objective: 'Ù‚Ø§Ù„Ø¨â€ŒÙ‡Ø§ÛŒ Vega (linearØŒ confusion) Ø±Ø§ Ø¨Ø±Ø§ÛŒ `dvc plots show` Ø§Ø³ØªÙØ§Ø¯Ù‡ Ú©Ù†ÛŒØ¯.',
    learning: ['Ù‚Ø§Ù„Ø¨â€ŒÙ‡Ø§ Ø¯Ø± dvc.yaml Ø²ÛŒØ± plots:', 'show --template confusion'],
    fieldNotes: ['Ù…Ø§ØªØ±ÛŒØ³ Ø®Ø·Ø§ Ø¨Ø±Ø§ÛŒ Ø±ÛŒÙˆÛŒÙˆÛŒ stakeholder'],
    startDialog: [
      {
        title: 'Ù‚Ø§Ù„Ø¨â€ŒÙ‡Ø§',
        markdown: '`dvc plots show --template linear` Â· `--template confusion`',
      },
    ],
  },
  'camp-3': {
    seriesTitle: 'ØµÙ Ùˆ sweep',
    name: 'ØµÙ Ú©Ø±Ø¯Ù† sweep Ù¾Ø§Ø±Ø§Ù…ØªØ±',
    objective: 'Ø¢Ø²Ù…Ø§ÛŒØ´â€ŒÙ‡Ø§ Ø±Ø§ Ø¨Ø§ `dvc exp run --queue` Ù¾Ø§Ø±Ú© Ú©Ù†ÛŒØ¯ Ùˆ Ø¨Ø§ Ù‡Ù… Ø§Ø¬Ø±Ø§ Ú©Ù†ÛŒØ¯.',
    learning: ['--queue Ù¾Ø§Ø±Ú© Ù…ÛŒâ€ŒÚ©Ù†Ø¯', 'queue start / --run-all Ø§Ø¬Ø±Ø§ Ù…ÛŒâ€ŒÚ©Ù†Ø¯'],
    fieldNotes: ['Ø¨Ø±Ø§ÛŒ Ù‡Ø± Ù‡Ø§ÛŒÙ¾Ø±Ù¾Ø§Ø±Ø§Ù…ØªØ± ÛŒÚ© job Ø±Ø§ Ø¨ÛŒØ³ÛŒØª Ù†Ú©Ù†ÛŒØ¯'],
    startDialog: [
      {
        title: 'ØµÙ',
        markdown: '`dvc exp run --queue -S train.n_est=50` â€¦ Ø¨Ø¹Ø¯ `dvc queue start`.',
      },
    ],
  },
  'camp-4': {
    seriesTitle: 'Ø¹Ù…Ù‚ pipeline',
    name: 'stage foreach + ÙÙ„Ú¯â€ŒÙ‡Ø§ÛŒ Ù¾ÛŒØ´Ø±ÙØªÙ‡',
    objective: 'Ø¨Ø§ `--foreach` stage Ù…Ø§ØªØ±ÛŒØ³ÛŒ Ø¨Ø³Ø§Ø²ÛŒØ¯ Ùˆ ÙÙ„Ú¯â€ŒÙ‡Ø§ÛŒ Ù¾ÛŒØ´Ø±ÙØªÙ‡ Ø±Ø§ Ø¨ÙÙ‡Ù…ÛŒØ¯.',
    learning: ['--foreach ÛŒÚ© stage Ø±Ø§ Ø¨Ø§Ø² Ù…ÛŒâ€ŒÚ©Ù†Ø¯', 'no-cache / always-changed / freeze'],
    fieldNotes: ['Ù…Ø§ØªØ±ÛŒØ³ per-model Ø¨Ø¯ÙˆÙ† copy-paste'],
    startDialog: [
      {
        title: 'foreach',
        markdown: '`dvc stage add --foreach a,b â€¦` â€” ÛŒÚ© stageØŒ Ú†Ù†Ø¯ Ø§Ø¬Ø±Ø§.',
      },
    ],
  },
  'camp-5': {
    seriesTitle: 'Ù‡Ù…Ú©Ø§Ø±ÛŒ Ùˆ CI',
    name: '.dvcignore + update + CML',
    objective: 'Ù‚ÙˆØ§Ø¹Ø¯ ignoreØŒ Ø¨Ù‡â€ŒØ±ÙˆØ²Ø±Ø³Ø§Ù†ÛŒ import Ùˆ Ù†Ø¸Ø± CML Ø±Ø§ Ø¯Ø± Ø¨Ø§ÙØª ØªÛŒÙ… ØªØ±Ú©ÛŒØ¨ Ú©Ù†ÛŒØ¯.',
    learning: ['Ù‡Ù…Ú©Ø§Ø±ÛŒ Ø¨Ù‡ ignore + import ØªØ§Ø²Ù‡ + CI Ø¯ÛŒØ¯Ù‡â€ŒØ´Ø¯Ù‡ Ù†ÛŒØ§Ø² Ø¯Ø§Ø±Ø¯'],
    fieldNotes: ['Ú©ÛŒÙ„ÙˆÙ…ØªØ± Ø¢Ø®Ø± ØªØ§ workflow ØªÛŒÙ…ÛŒ'],
    startDialog: [
      {
        title: 'Ø§Ù†Ø¯Ú¯ÛŒÙ… ØªÛŒÙ…',
        markdown: '`.dvcignore` Â· `dvc update` Â· `dvc cml "â€¦"` â€” Ù‡Ù…Ù‡ Ø¨Ø§ Ù‡Ù….',
      },
    ],
  },
  'cache-1': {
    seriesTitle: 'Ø§Ù†Ø¶Ø¨Ø§Ø· cache',
    name: 'Ø§Ø´ÛŒØ§ÛŒ Ø¨ÛŒâ€ŒØ§Ø³ØªÙØ§Ø¯Ù‡ Ùˆ gc',
    objective:
      'ÛŒÚ© Ø´ÛŒØ¡ Ø¨ÛŒâ€ŒØ§Ø±Ø¬Ø§Ø¹ cache Ø¨Ø³Ø§Ø²ÛŒØ¯ (Ø¯Ø§Ø¯Ù‡â€ŒÛŒ dirty + Ù†Ø³Ø®Ù‡ Ø¬Ø¯ÛŒØ¯) Ùˆ Ø¨Ø§ `dvc gc` Ø¬Ø§ Ø®Ø§Ù„ÛŒ Ú©Ù†ÛŒØ¯ØŒ Ø¨Ø¯ÙˆÙ† Ø§Ø² Ø¯Ø³Øª Ø¯Ø§Ø¯Ù† pointer ÙØ¹Ù„ÛŒ.',
    learning: [
      'cache Ù…Ø­ØªÙˆØ§Ù†Ø´Ø§Ù† Ù‡Ø´â€ŒÙ‡Ø§ÛŒ Ù‚Ø¯ÛŒÙ…ÛŒ Ø±Ø§ ØªØ§ gc Ù†Ú¯Ù‡ Ù…ÛŒâ€ŒØ¯Ø§Ø±Ø¯',
      'dvc gc Ø§Ø´ÛŒØ§ÛŒ Ø¨Ø¯ÙˆÙ† Ø§Ø±Ø¬Ø§Ø¹ workspace/Git Ø±Ø§ Ø­Ø°Ù Ù…ÛŒâ€ŒÚ©Ù†Ø¯',
      'ÙÙ‚Ø· ÙˆÙ‚ØªÛŒ gc Ø§Ù…Ù† Ø§Ø³Øª Ú©Ù‡ remote Ù‡Ù†ÙˆØ² Ú†ÛŒØ²ÛŒ Ø±Ø§ Ø¯Ø§Ø±Ø¯ Ú©Ù‡ ØªÛŒÙ… Ù„Ø§Ø²Ù… Ø¯Ø§Ø±Ø¯',
    ],
    fieldNotes: [
      'CI runner: Ø¨Ø¹Ø¯ Ø§Ø² pull+repro Ù‡Ù…Ø§Ù† SHA Ú©Ù‡ shipping Ù…ÛŒâ€ŒÚ©Ù†ÛŒØ¯ gc Ú©Ù†ÛŒØ¯',
      'Ù„Ù¾â€ŒØªØ§Ù¾â€ŒÙ‡Ø§ Ø§Ø² md5 ÛŒØªÛŒÙ… Ù¾Ø± Ù…ÛŒâ€ŒØ´ÙˆÙ†Ø¯ â€” gc Ø±Ø§ Ø²Ù…Ø§Ù†â€ŒØ¨Ù†Ø¯ÛŒ Ú©Ù†ÛŒØ¯',
      'Ø§Ú¯Ø± Ù…Ø¯Ù„ release ÙÙ‚Ø· Ø¯Ø± cache Ù…Ø­Ù„ÛŒ Ø¨Ø§Ø´Ø¯ØŒ gc Ù…ÛŒâ€ŒØªÙˆØ§Ù†Ø¯ Ø¢Ø®Ø±ÛŒÙ† Ù†Ø³Ø®Ù‡ Ø±Ø§ Ø¨Ú©Ø´Ø¯',
    ],
    startDialog: [
      {
        title: 'cache Ø§Ù†Ø¨Ø§Ø± Ø§Ø³ØªØŒ Ù†Ù‡ Ø³Ø·Ù„ Ø²Ø¨Ø§Ù„Ù‡',
        markdown:
          'Ù‡Ø± `dvc add`/`commit` ÛŒÚ© Ø´ÛŒØ¡ **Ø¬Ø¯ÛŒØ¯** Ù…ÛŒâ€ŒÙ†ÙˆÛŒØ³Ø¯. Ù‚Ø¯ÛŒÙ…ÛŒâ€ŒÙ‡Ø§ Ø¨Ø±Ø§ÛŒ checkout ØªØ§Ø±ÛŒØ®Ú†Ù‡ Ù…ÛŒâ€ŒÙ…Ø§Ù†Ù†Ø¯.\n\n`dvc gc` Ø¬Ø§Ø±Ùˆ Ø§Ø³Øª â€” ÙÙ‚Ø· Ú†ÛŒØ²ÛŒ Ú©Ù‡ Ø§Ø±Ø¬Ø§Ø¹ Ø¯Ø§Ø±Ø¯ Ù…ÛŒâ€ŒÙ…Ø§Ù†Ø¯.',
      },
    ],
  },
  'cache-2': {
    seriesTitle: 'Ø§Ù†Ø¶Ø¨Ø§Ø· cache',
    name: 'Ø¬Ø¯ÙˆÙ„ ÙˆØ§Ù‚Ø¹ÛŒØª workspace / cache / remote',
    objective:
      'ÙØ§ÛŒÙ„ ØªØ±Ú©â€ŒØ´Ø¯Ù‡ Ø±Ø§ Ø­Ø°Ù Ú©Ù†ÛŒØ¯ØŒ `dvc status` Ø¨Ø®ÙˆØ§Ù†ÛŒØ¯ØŒ Ø¨Ø§ `dvc pull` Ø¨Ø±Ú¯Ø±Ø¯Ø§Ù†ÛŒØ¯ Ùˆ status ØªÙ…ÛŒØ² Ø¨Ú¯ÛŒØ±ÛŒØ¯.',
    learning: [
      'ÙØ§ÛŒÙ„ Ø¬Ø§Ù…Ø§Ù†Ø¯Ù‡ â‰  Ø¯Ø§Ø¯Ù‡ Ú¯Ù…â€ŒØ´Ø¯Ù‡ Ø§Ú¯Ø± cache/remote Ù‡Ø´ Ø±Ø§ Ø¯Ø§Ø´ØªÙ‡ Ø¨Ø§Ø´Ù†Ø¯',
      'dvc pull = fetch + checkout',
      'status Ù†Ù‚Ø´Ù‡â€ŒÛŒ ØµØ§Ø¯Ù‚ pointer â†” Ø¨Ø§ÛŒØª Ø§Ø³Øª',
    ],
    fieldNotes: ['Ø±ÙˆØ§Ù„: status â†’ pull â†’ status. Ø¨Ø¹Ø¯ Ø§Ú¯Ø± dirty Ø¨ÙˆØ¯ escalate'],
    startDialog: [
      {
        title: 'Ø³Ù‡ Ø¬Ø§ØŒ ÛŒÚ© Ø¬Ø¯ÙˆÙ„',
        markdown: 'Workspace / Cache / Remote â€” `dvc status` Ùˆ `dvc pull` Ø§ÛŒÙ† Ø¬Ø¯ÙˆÙ„ Ø±Ø§ Ù…ÛŒâ€ŒØ®ÙˆØ§Ù†Ù†Ø¯.',
      },
    ],
  },
  'remote-4': {
    seriesTitle: 'RemoteÙ‡Ø§',
    name: 'remote Ø¯ÙˆÙ… + ØªØ¹ÙˆÛŒØ¶ default',
    objective: 'remote Ù¾Ø´ØªÛŒØ¨Ø§Ù† Ø¨Ø³Ø§Ø²ÛŒØ¯ØŒ Ù„ÛŒØ³Øª Ø±Ø§ Ø¨Ø¨ÛŒÙ†ÛŒØ¯ØŒ default Ø±Ø§ Ø¹ÙˆØ¶ Ú©Ù†ÛŒØ¯ Ùˆ push Ú©Ù†ÛŒØ¯.',
    learning: [
      'Ú†Ù†Ø¯ remote (originØŒ backupØŒ teamØŒ region) Ø¹Ø§Ø¯ÛŒ Ø§Ø³Øª',
      'push/pull Ø¨Ø¯ÙˆÙ† -r Ø§Ø² default Ù…ÛŒâ€ŒØ®ÙˆØ§Ù†Ù†Ø¯',
      'Ú©Ø§Ù†ÙÛŒÚ¯ remote Ø¯Ø± .dvc/config Ø§Ø³Øª Ùˆ Ø¨Ù‡ Ø§Ø´ØªØ±Ø§Ú© Ù…ÛŒâ€ŒØ±ÙˆØ¯',
    ],
    fieldNotes: ['remote ØªÛŒÙ… Ø¨Ø±Ø§ÛŒ Ú©Ø§Ø± Ø±ÙˆØ²Ø§Ù†Ù‡ + backup Ø³Ø±Ø¯ Ø¨Ø±Ø§ÛŒ DR', 'credentials Ù‡Ø±Ú¯Ø² Ø¯Ø± .dvc/config'],
    startDialog: [
      {
        title: 'Ú†Ø±Ø§ Ø¨ÛŒØ´ Ø§Ø² ÛŒÚ© remote',
        markdown: 'Ø§Ù†Ø¨Ø§Ø± Ù‡Ù…Ú©Ø§Ø±ÛŒ â‰  Ø§Ù†Ø¨Ø§Ø± disaster recovery.',
      },
    ],
  },
  'remote-5': {
    seriesTitle: 'RemoteÙ‡Ø§',
    name: 'fetch Ø¯Ø± Ø¨Ø±Ø§Ø¨Ø± pull Ø±ÙˆÛŒ Ù…Ø§Ø´ÛŒÙ† ØªØ§Ø²Ù‡',
    objective: 'cache Ø®Ø§Ù„ÛŒØŒ remote Ù¾Ø±: `fetch` ÙÙ‚Ø· cache Ø±Ø§ Ù¾Ø± Ù…ÛŒâ€ŒÚ©Ù†Ø¯ØŒ `pull` ÙØ¶Ø§ÛŒ Ú©Ø§Ø±ÛŒ Ø±Ø§ Ù…Ø§Ø¯ÛŒ Ù…ÛŒâ€ŒÚ©Ù†Ø¯.',
    learning: [
      'fetch: remote â†’ cache',
      'pull: fetch + checkout',
      'CI Ù…ÛŒâ€ŒØªÙˆØ§Ù†Ø¯ prefetch Ú©Ù†Ø¯ Ø¨Ø¯ÙˆÙ† Ø®Ø±Ø§Ø¨ Ú©Ø±Ø¯Ù† tree',
    ],
    fieldNotes: ['CI Ù‚Ø¨Ù„ Ø§Ø² build prefetchØ› pull ÙÙ‚Ø· Ø¬Ø§ÛŒÛŒ Ú©Ù‡ Ø¨Ø§ÛŒØª Ù„Ø§Ø²Ù… Ø§Ø³Øª'],
    startDialog: [
      {
        title: 'Ø¯Ùˆ ÙØ¹Ù„ØŒ ÛŒÚ© Ø§Ù†Ø¨Ø§Ø±',
        markdown: '`fetch` Ø§Ù†Ø¨Ø§Ø± Ø±Ø§ Ù¾Ø± Ù…ÛŒâ€ŒÚ©Ù†Ø¯. `pull` Ø¨Ù‡ Ø¢Ø´Ù¾Ø²Ø®Ø§Ù†Ù‡ Ù‡Ù… ØªØ­ÙˆÛŒÙ„ Ù…ÛŒâ€ŒØ¯Ù‡Ø¯.',
      },
    ],
  },
  'pipe-4': {
    seriesTitle: 'PipelineÙ‡Ø§',
    name: 'wdir, always-changed, no-cache',
    objective: 'stage Ø±Ø§ Ø¨Ø§ `--wdir` Ùˆ `--always-changed` ØªØ¹Ø±ÛŒÙ Ú©Ù†ÛŒØ¯ØŒ no-cache Ø±Ø§ Ø¨ÙÙ‡Ù…ÛŒØ¯ØŒ repro + DAG.',
    learning: [
      '--wdir Ù¾ÙˆØ´Ù‡â€ŒÛŒ Ú©Ø§Ø±ÛŒ stage Ø±Ø§ Ø¬Ø§Ø¨Ù‡â€ŒØ¬Ø§ Ù…ÛŒâ€ŒÚ©Ù†Ø¯',
      '--always-changed repro Ø±Ø§ Ø§Ø¬Ø¨Ø§Ø±ÛŒ Ù…ÛŒâ€ŒÚ©Ù†Ø¯',
      'Ø®Ø±ÙˆØ¬ÛŒ cache:false Ù‡ÙˆÛŒØª Ø±Ø§ ØªØ±Ú© Ù…ÛŒâ€ŒÚ©Ù†Ø¯ Ø¨Ø¯ÙˆÙ† Ø¨Ø§ÛŒØª cache',
    ],
    fieldNotes: ['always-changed Ø¨Ø±Ø§ÛŒ API/scrape', 'no-cache Ø¨Ø±Ø§ÛŒ Ø®Ø±ÙˆØ¬ÛŒâ€ŒÙ‡Ø§ÛŒ Ø¹Ø¸ÛŒÙ… warehouse'],
    startDialog: [
      {
        title: 'ÙÙ„Ú¯â€ŒÙ‡Ø§ÛŒ stage Ø§Ø² ØªÙˆÙ„ÛŒØ¯',
        markdown: '`--wdir` Â· `--always-changed` Â· `--no-cache` â€” ØªØ²ÛŒÛŒÙ†ÛŒ Ù†ÛŒØ³ØªÙ†Ø¯.',
      },
    ],
  },
  'pipe-5': {
    seriesTitle: 'PipelineÙ‡Ø§',
    name: 'Ù…Ø§ØªØ±ÛŒØ³ foreach + DAG',
    objective: 'ÛŒÚ© stage Ø±Ø§ Ø¨Ø§ `--foreach` Ø¨Ù‡ Ù…Ø§ØªØ±ÛŒØ³ Ø¨Ø§Ø² Ú©Ù†ÛŒØ¯ØŒ Ù„ÛŒØ³Øª Ú©Ù†ÛŒØ¯ Ùˆ DAG Ø¨Ø®ÙˆØ§Ù†ÛŒØ¯.',
    learning: ['--foreach ÛŒÚ© Ù‚Ø§Ù„Ø¨ Ø±Ø§ N stage Ù…ÛŒâ€ŒÚ©Ù†Ø¯', 'Ù‡Ø± Ø®Ø§Ù†Ù‡ outs Ø®ÙˆØ¯Ø´ Ø±Ø§ Ø¯Ø§Ø±Ø¯', 'DAG Ù‚Ø±Ø§Ø±Ø¯Ø§Ø¯ Ø±ÛŒÙˆÛŒÙˆ Ø§Ø³Øª'],
    fieldNotes: ['Ù…Ø§ØªØ±ÛŒØ³ Ø¨Ø±Ø§ÛŒ Â«Ø§ÛŒÙ† Ù…Ø¯Ù„â€ŒÙ‡Ø§ Ø¨Ø§ÛŒØ¯ Ø¨Ø§ Ù‡Ù… Ø¨ÛŒØ§ÛŒÙ†Ø¯Â»', 'Ø¬Ø³Øªâ€ŒÙˆØ¬Ùˆ Ø¯Ø± `dvc exp`ØŒ Ù…Ø­ØµÙˆÙ„ Ø¯Ø± stage'],
    startDialog: [
      {
        title: 'foreach Ø¯Ø± Ø¨Ø±Ø§Ø¨Ø± Ø¢Ø²Ù…Ø§ÛŒØ´',
        markdown: '**foreach** = Ù…Ø§ØªØ±ÛŒØ³ Ù…Ø­ØµÙˆÙ„. **dvc exp** = Ø¬Ø³Øªâ€ŒÙˆØ¬Ùˆ.',
      },
    ],
  },
  'exp-4': {
    seriesTitle: 'Ø¢Ø²Ù…Ø§ÛŒØ´â€ŒÙ‡Ø§',
    name: 'Ø¯Ùˆ sweep + exp show',
    objective: 'Ø¯Ùˆ Ù…Ø¬Ù…ÙˆØ¹Ù‡â€ŒÙ¾Ø§Ø±Ø§Ù…ØªØ± Ø§Ø¬Ø±Ø§ Ú©Ù†ÛŒØ¯ Ùˆ Ø¨Ø§ `dvc exp show` Ù…Ù‚Ø§ÛŒØ³Ù‡ Ú©Ù†ÛŒØ¯.',
    learning: ['-S Ù‡Ø± set Ø±Ø§ Ø¢Ø²Ù…Ø§ÛŒØ´ Ø«Ø¨Øª Ù…ÛŒâ€ŒÚ©Ù†Ø¯', 'exp show Ø¬Ø¯ÙˆÙ„ Ø´Ø§Ù‡Ø¯ Ø§Ø³Øª', '--queue Ú©Ø§Ø± Ø±Ø§ Ù¾Ø§Ø±Ú© Ù…ÛŒâ€ŒÚ©Ù†Ø¯'],
    fieldNotes: ['sweep Ø¬Ù…Ø¹Ù‡: ØµÙ Ú©Ù†ÛŒØ¯ØŒ Ø´Ù†Ø¨Ù‡ show Ø¨Ø®ÙˆØ§Ù†ÛŒØ¯'],
    startDialog: [
      {
        title: 'Ø¬Ø³Øªâ€ŒÙˆØ¬Ùˆ Ø¨Ø¯ÙˆÙ† Ø¨ÛŒØ³ÛŒØª',
        markdown: 'sweep Ø¨Ø§ `-S` Ùˆ Ø¨Ø¹Ø¯ `dvc exp show`.',
      },
    ],
  },
  'exp-5': {
    seriesTitle: 'Ø¢Ø²Ù…Ø§ÛŒØ´â€ŒÙ‡Ø§',
    name: 'Ø§Ø¹Ù…Ø§Ù„ Ø¨Ø±Ù†Ø¯Ù‡ + Ø¨Ø§Ø²Ø¨ÛŒÙ†ÛŒ Ù¾Ø§Ø±Ø§Ù…ØªØ±',
    objective: 'sweepØŒ `exp show`ØŒ `exp apply`ØŒ `params show`ØŒ Ø¨Ø¹Ø¯ repro.',
    learning: ['apply Ù¾ÛŒÚ©Ø±Ø¨Ù†Ø¯ÛŒ Ø±Ø§ Ø¨Ù‡ workspace Ù…ÛŒâ€ŒÙ†ÙˆÛŒØ³Ø¯ â€” deploy Ù†ÛŒØ³Øª', 'Ø¨Ø¹Ø¯Ø´ repro/push Ø¨Ø±Ø§ÛŒ ØªÙˆÙ„ÛŒØ¯', 'params show Ø¨Ø§Ø²Ø¨ÛŒÙ†ÛŒ Ø§Ø³Øª'],
    fieldNotes: ['PR Ø¨Ø§ÛŒØ¯ exp id Ùˆ Ø¯Ù„ÛŒÙ„ Ø±Ø§ Ø¨Ù†ÙˆÛŒØ³Ø¯', 'apply Ø¨Ø¯ÙˆÙ† repro Ù…Ø¯Ù„ Ø±Ø§ Ú©Ù‡Ù†Ù‡ Ù…ÛŒâ€ŒÚ¯Ø°Ø§Ø±Ø¯'],
    startDialog: [
      {
        title: 'Ø¨Ø±Ø¯Ù‡ release Ù†ÛŒØ³Øª',
        markdown: '`exp apply` â†’ `dvc repro` â†’ `dvc push`.',
      },
    ],
  },
  'cmp-3': {
    seriesTitle: 'Ø±ÛŒÙˆÛŒÙˆ Ùˆ Ù…Ù‚Ø§ÛŒØ³Ù‡',
    name: 'ØªÙ…Ø±ÛŒÙ† params + metrics diff',
    objective: 'Ù‡Ø§ÛŒÙ¾Ø±Ù¾Ø§Ø±Ø§Ù…ØªØ± Ø±Ø§ Ø¹ÙˆØ¶ Ú©Ù†ÛŒØ¯ØŒ `params diff`ØŒ reproØŒ `metrics diff` â€” Ø¨Ø³ØªÙ‡â€ŒÛŒ Ø±ÛŒÙˆÛŒÙˆÛŒ ML.',
    learning: ['params diff = Ù†ÛŒØª', 'metrics diff = Ø§Ø«Ø±', 'Ø­Ø¯Ø§Ù‚Ù„Ù Ø±ÛŒÙˆÛŒÙˆÛŒ ML Ù‡Ù…ÛŒÙ† Ø¯Ùˆ Ø§Ø³Øª'],
    fieldNotes: ['Ù‡Ø± Ø¯Ùˆ diff Ø±Ø§ Ø¯Ø± PR Ø¨Ú¯Ø°Ø§Ø±ÛŒØ¯. Ø±ÛŒÙˆÛŒÙˆØ± Ù†ÙˆØªâ€ŒØ¨ÙˆÚ© Ø¨Ø§Ø² Ù†Ú©Ù†Ø¯'],
    startDialog: [
      {
        title: 'Ø±ÛŒÙˆÛŒÙˆÛŒ Ø¨Ø§Ù„Øº',
        markdown: '`dvc params diff` + `dvc metrics diff`.',
      },
    ],
  },
  'cmp-4': {
    seriesTitle: 'Ø±ÛŒÙˆÛŒÙˆ Ùˆ Ù…Ù‚Ø§ÛŒØ³Ù‡',
    name: 'plots show + diff',
    objective: 'repro Ú©Ù†ÛŒØ¯ ØªØ§ Ø³Ø±ÛŒ Ø¨ÛŒØ§ÛŒØ¯ØŒ Ø¨Ø§ Ù‚Ø§Ù„Ø¨ Vega Ø±Ù†Ø¯Ø± Ú©Ù†ÛŒØ¯ØŒ `plots diff` Ø¨Ú¯ÛŒØ±ÛŒØ¯.',
    learning: ['plot Ø¢Ø±ØªÛŒÙÚ©Øª Ø±ÛŒÙˆÛŒÙˆØ³Øª', 'Ù‚Ø§Ù„Ø¨ Ù†Ø­ÙˆÙ‡â€ŒÛŒ Ø®ÙˆØ§Ù†Ø¯Ù† Ø±Ø§ Ú©Ø¯ Ù…ÛŒâ€ŒÚ©Ù†Ø¯', 'plots diff Ø¯ÙˆÙ‚Ù„Ùˆ metrics diff Ø§Ø³Øª'],
    fieldNotes: ['CML ØªØµÙˆÛŒØ± plot Ø±Ø§ Ø¨Ù‡ PR Ù…ÛŒâ€ŒØ²Ù†Ø¯'],
    startDialog: [
      {
        title: 'Ù†Ù…ÙˆØ¯Ø§Ø± ØªØ²ÛŒÛŒÙ† Ù†ÛŒØ³Øª',
        markdown: '`dvc plots show` / `dvc plots diff`.',
      },
    ],
  },
  'meta-4': {
    seriesTitle: 'Ù…ØªØ§ Ùˆ ÙØ§ÛŒÙ„â€ŒÙ‡Ø§ÛŒ Ù‚Ø±Ø§Ø±Ø¯Ø§Ø¯',
    name: 'freeze Ø¢Ú¯Ø§Ù‡Ø§Ù†Ù‡â€ŒÛŒ ÛŒÚ© stage',
    objective: '`train` Ø±Ø§ freeze Ú©Ù†ÛŒØ¯ØŒ Ø±ÙØªØ§Ø± Ø±Ø§ Ø¨Ø¨ÛŒÙ†ÛŒØ¯ØŒ Ø¨Ø¹Ø¯ Ø¢Ú¯Ø§Ù‡Ø§Ù†Ù‡ unfreeze.',
    learning: ['freeze Ø¯Ø± Ø¨Ø±Ø§Ø¨Ø± repro Ù†Ø§Ø´ÛŒ Ø§Ø² invalidate', 'unfreeze Ø±ÙˆÛŒØ¯Ø§Ø¯ ØªÙˆÙ„ÛŒØ¯ Ø§Ø³Øª', 'stage ÛŒØ®â€ŒØ²Ø¯Ù‡ Ø¯Ø± DAG Ù…ÛŒâ€ŒÙ…Ø§Ù†Ø¯'],
    fieldNotes: ['Ù…Ø¯Ù„ Ø·Ù„Ø§ÛŒÛŒ Ø±Ø§ freeze Ú©Ù†ÛŒØ¯ Ù…ÙˆÙ‚Ø¹ Ø¢Ø²Ù…Ø§ÛŒØ´ Ù¾Ø§ÛŒÛŒÙ†â€ŒØ¯Ø³Øª', 'unfreeze Ø¨Ø§ Ø±ÛŒÙˆÛŒÙˆ + repro + push'],
    startDialog: [
      {
        title: 'Ù…ÛŒØ® Ø¨Ø§ ØªØ¨Ø¹Ø§Øª',
        markdown: 'freeze Ù…Ø­Ø§ÙØ¸Øª Ù…ÛŒâ€ŒÚ©Ù†Ø¯Ø› Ø§Ù…Ø§ staleness Ø±Ø§ Ù‡Ù… Ù¾Ù†Ù‡Ø§Ù† Ù…ÛŒâ€ŒÚ©Ù†Ø¯.',
      },
    ],
  },
  'meta-5': {
    seriesTitle: 'Ù…ØªØ§ Ùˆ ÙØ§ÛŒÙ„â€ŒÙ‡Ø§ÛŒ Ù‚Ø±Ø§Ø±Ø¯Ø§Ø¯',
    name: 'lock Ø±Ø³ÛŒØ¯ Ø§Ø³Øª',
    objective: 'Ù¾Ø§Ø±Ø§Ù…ØªØ± Ø±Ø§ Ø¨Ø´Ú©Ù†ÛŒØ¯ØŒ reproØŒ yaml Ø¯Ø± Ø¨Ø±Ø§Ø¨Ø± lock â€” ØªØ¹Ø±ÛŒÙ Ø¯Ø± Ø¨Ø±Ø§Ø¨Ø± Ø±Ø³ÛŒØ¯ Ø§Ø¬Ø±Ø§.',
    learning: ['dvc.yaml = Ù‚Ø±Ø§Ø±Ø¯Ø§Ø¯', 'dvc.lock = Ø±Ø³ÛŒØ¯', 'ÙˆÛŒØ±Ø§ÛŒØ´ Ø¯Ø³ØªÛŒ lock Ø¯Ø±ÙˆØº Ø§Ø³Øª'],
    fieldNotes: ['yaml Ø±ÛŒÙˆÛŒÙˆÛŒ Ø§Ù†Ø³Ø§Ù†ÛŒ Ù…ÛŒâ€ŒØ®ÙˆØ§Ù‡Ø¯Ø› lock Ø§Ø² CI repro Ù…ÛŒâ€ŒØ¢ÛŒØ¯'],
    startDialog: [
      {
        title: 'Ù‚Ø±Ø§Ø±Ø¯Ø§Ø¯ ÛŒØ§ Ø±Ø³ÛŒØ¯',
        markdown: '`cat dvc.yaml` Â· `cat dvc.lock`.',
      },
    ],
  },
  'reg-3': {
    seriesTitle: 'Ø±Ø¬ÛŒØ³ØªØ±ÛŒ Ùˆ Ø¨Ø§Ø²Ø§Ø³ØªÙØ§Ø¯Ù‡',
    name: 'import Ùˆ status ØªÙ…ÛŒØ²',
    objective: 'Ø¢Ø±ØªÛŒÙÚ©Øª upstream Ø±Ø§ Ø¨Ø§ Ù†Ø³Ø®Ù‡â€ŒÛŒ pinned import Ú©Ù†ÛŒØ¯ Ùˆ status Ø±Ø§ ØªÙ…ÛŒØ² Ù†Ú¯Ù‡ Ø¯Ø§Ø±ÛŒØ¯.',
    learning: ['import Ù†Ø³Ø®Ù‡â€ŒÛŒ upstream Ø±Ø§ Ù…ÛŒØ®Ú©ÙˆØ¨ Ù…ÛŒâ€ŒÚ©Ù†Ø¯', 'update ÛŒÚ© bump Ø¹Ù…Ø¯ÛŒ Ø§Ø³Øª', 'Ù†Ù‡ zip Ø¯Ø± Ú†Øª'],
    fieldNotes: ['Ø®Ø±ÙˆØ¬ÛŒ feature store Ù…ÛŒâ€ŒØ´ÙˆØ¯ importØŒ Ù†Ù‡ Ú©Ù¾ÛŒ'],
    startDialog: [
      {
        title: 'Ù‚Ø±Ø¶ Ø¨Ú¯ÛŒØ±ØŒ Ø§Ù†Ø¨Ø§Ø± Ù†Ú©Ù†',
        markdown: '`dvc get` = Ú©Ù¾ÛŒ. `dvc import` = pin + Ù…Ø³ÛŒØ± update.',
      },
    ],
  },
  'camp-6': {
    seriesTitle: 'Ù‡Ù…Ú©Ø§Ø±ÛŒ Ùˆ CI',
    name: 'Ø§Ø³Ú©Ù„Øª CI: pullØŒ reproØŒ comment',
    objective: 'Ø­Ù„Ù‚Ù‡â€ŒÛŒ Ø§Ø³ØªØ§Ù†Ø¯Ø§Ø±Ø¯ CI: pullØŒ reproØŒ Ø®ÙˆØ§Ù†Ø¯Ù† metricsØŒ Ù†Ø¸Ø± CMLØŒ commit Ø±Ø³ÛŒØ¯.',
    learning: ['CI: clone â†’ pull â†’ repro â†’ cml comment', 'Ø¨Ø§ÛŒØª Ø³Ù†Ú¯ÛŒÙ† Ø¯Ø± remote Ø¯Ø§Ø¯Ù‡', 'CML metrics Ø±Ø§ Ù‚Ø§Ø¨Ù„ Ø±ÛŒÙˆÛŒÙˆ Ù…ÛŒâ€ŒÚ©Ù†Ø¯'],
    fieldNotes: ['Ù‡Ù…Ø§Ù† YAML Ø§Ù„Ú¯ÙˆÙ‡Ø§ÛŒ GitHub Actions'],
    startDialog: [
      {
        title: 'Ù…Ø°Ù‡Ø¨ CI Ø¯Ø± Ø³Ù‡ Ø®Ø·',
        markdown: '```\ndvc pull\ndvc repro\ndvc cml "â€¦"\n```',
      },
    ],
  },
  'camp-7': {
    seriesTitle: 'Ù‡Ù…Ú©Ø§Ø±ÛŒ Ùˆ CI',
    name: 'metrics Ù‡Ø§ÛŒ DVCLive ØªØ§ exp show',
    objective: 'Ø§Ø¬Ø±Ø§ Ø±Ø§ Ø¨Ø§ DVCLive Ø§Ø¨Ø²Ø§Ø±Ú©â€ŒÚ¯Ø°Ø§Ø±ÛŒ Ú©Ù†ÛŒØ¯ Ùˆ Ø¯Ø± Ø¬Ø¯ÙˆÙ„ Ø¢Ø²Ù…Ø§ÛŒØ´ Ø¨Ø¨ÛŒÙ†ÛŒØ¯.',
    learning: ['DVCLive Ù¾Ù„ Ú©Ø¯ Ø¢Ù…ÙˆØ²Ø´ Ø¨Ù‡ metrics/plot Ø§Ø³Øª', 'Ø§Ø³Ú©Ø§Ù„Ø± metricsØŒ Ø³Ø±ÛŒ plot'],
    fieldNotes: ['ÛŒÚ© Live() Ø¯Ø± train.py Ø¨Ù‡ØªØ± Ø§Ø² Ø¯Ù‡ echo Ø§Ø³Øª'],
    startDialog: [
      {
        title: 'Ù…Ù†Ø­Ù†ÛŒ loss Ú©Ù¾ÛŒâ€ŒÙ¾ÛŒØ³Øª Ù†Ú©Ù†ÛŒØ¯',
        markdown: 'DVCLive Ø¨Ù‡ Ù‡Ù…Ø§Ù† Ø´Ú©Ù„ÛŒ Ù…ÛŒâ€ŒÙ†ÙˆÛŒØ³Ø¯ Ú©Ù‡ DVC Ù…ÛŒâ€ŒÙÙ‡Ù…Ø¯.',
      },
    ],
  },
  'collab-1': {
    seriesTitle: 'Ù‡Ù…Ú©Ø§Ø±ÛŒ Ùˆ CI',
    name: 'Ø§Ù†Ø¶Ø¨Ø§Ø· PR Ù…Ø¨ØªÙ†ÛŒ Ø¨Ø± pointer',
    objective: 'Ù…Ø³ÛŒØ± Ú©Ø§Ù…Ù„ PR Ø¯Ø§Ø¯Ù‡: dirty â†’ status â†’ add/commit â†’ git commit ÙÙ‚Ø· pointer.',
    learning: ['Ø±ÛŒÙˆÛŒÙˆÛŒ PR ÛŒØ¹Ù†ÛŒ md5 pointer + lockØŒ Ù†Ù‡ Ú¯ÛŒÚ¯Ø§Ø¨Ø§ÛŒØª', 'Ø¨Ø¯ÙˆÙ† dvc commitØŒ pointer Ø¯Ø±ÙˆØº Ù…ÛŒâ€ŒÚ¯ÙˆÛŒØ¯'],
    fieldNotes: ['CI Ø¨Ø§ÛŒØ¯ fail Ú©Ù†Ø¯ Ø§Ú¯Ø± Ú©Ø³ÛŒ Ù…Ø³ÛŒØ± Ø¯Ø§Ø¯Ù‡â€ŒÛŒ ØªØ±Ú©â€ŒØ´Ø¯Ù‡ Ø±Ø§ staged Ú©Ù†Ø¯'],
    startDialog: [
      {
        title: 'ØªÙ†Ù‡Ø§ PR Ø§Ù…Ù† Ø¯Ø§Ø¯Ù‡',
        markdown: 'Status â†’ add â†’ commit â†’ git add ÙÙ‚Ø· ÙØ§ÛŒÙ„â€ŒÙ‡Ø§ÛŒ pointer â†’ commit.',
      },
    ],
  },
  'collab-2': {
    seriesTitle: 'Ù‡Ù…Ú©Ø§Ø±ÛŒ Ùˆ CI',
    name: 'Ø­Ø§Ø¯Ø«Ù‡: Ú©Ø¯Ø§Ù… Ø¯Ø§Ø¯Ù‡ØŒ Ú©Ø¯Ø§Ù… Ù…Ø¯Ù„ØŸ',
    objective: 'Ù¾Ø±Ø³Ø´ Ø­Ø§Ø¯Ø«Ù‡ Ø±Ø§ Ø¨Ø§ Ø´Ø§Ù‡Ø¯ Ù¾Ø§Ø³Ø® Ø¯Ù‡ÛŒØ¯: pointer â†’ git â†’ remote â†’ checkout ØªÙ…ÛŒØ².',
    learning: ['commit release â†’ md5 pointer â†’ cache/remote', 'Ø¨Ø¯ÙˆÙ† pointer Ú©Ø§Ù…ÛŒØªâ€ŒØ´Ø¯Ù‡ØŒ Ù¾Ø§Ø³Ø® Ù†ÛŒØ³Øª'],
    fieldNotes: ['Ø§ÛŒÙ† Ú†Ú©â€ŒÙ„ÛŒØ³Øª postmortem Ø¨Ø±Ø§ÛŒ Â«Ù…Ø¯Ù„ Ø¨Ø¯ Ø¯Ø± prodÂ» Ø§Ø³Øª'],
    startDialog: [
      {
        title: 'Ú†Ú©â€ŒÙ„ÛŒØ³Øª Ø³Ø§Ø¹Øª Û² Ø¨Ø§Ù…Ø¯Ø§Ø¯',
        markdown: 'Commit â†’ pointer â†’ md5 â†’ Ø±ÙˆÛŒ remoteØŸ â†’ checkout + `dvc checkout`.',
      },
    ],
  },
  'collab-3': {
    seriesTitle: 'Ù‡Ù…Ú©Ø§Ø±ÛŒ Ùˆ CI',
    name: 'ØªØ­ÙˆÛŒÙ„ Ø¨Ù‡ Ù‡Ù…â€ŒØªÛŒÙ…ÛŒ: push Ùˆ commit pointer',
    objective:
      'ØªØºÛŒÛŒØ± Ø¯Ø§Ø¯Ù‡ Ø±Ø§ Ø·ÙˆØ±ÛŒ Ù…Ù†ØªØ´Ø± Ú©Ù†ÛŒØ¯ Ú©Ù‡ Ù‡Ù…â€ŒØªÛŒÙ…ÛŒ Ø¨Ø§Ø²ØªÙˆÙ„ÛŒØ¯ Ú©Ù†Ø¯: pushØŒ commit pointerØŒ Ùˆ status ØªÙ…ÛŒØ² Ø¨Ø¹Ø¯ Ø§Ø² pull.',
    learning: [
      'ØªØ­ÙˆÛŒÙ„ = Ø§Ø´ÛŒØ§ÛŒ remote + commit pointer Ø¯Ø± Ú¯ÛŒØªØŒ Ù†Ù‡ zip',
      'push Ø¨Ø¯ÙˆÙ† commit pointer Ø¨Ø§ÛŒØªâ€ŒÙ‡Ø§ Ø±Ø§ Ø¨ÛŒâ€ŒØµØ§Ø­Ø¨ Ù…ÛŒâ€ŒÚ©Ù†Ø¯',
      'status Ø¨Ø¹Ø¯ Ø§Ø² pull Ø¢Ø²Ù…ÙˆÙ† Ù¾Ø°ÛŒØ±Ø´ Ø§Ø³Øª',
    ],
    fieldNotes: ['ØªØ¹Ø±ÛŒÙ Done Ø¨Ø±Ø§ÛŒ Ú©Ø§Ø± Ø¯Ø§Ø¯Ù‡: pull Ù…ÙˆÙÙ‚ Ø±ÙˆÛŒ Ù…Ø§Ø´ÛŒÙ† ØªÙ…ÛŒØ²'],
    startDialog: [
      {
        title: 'Ù‚Ø±Ø§Ø±Ø¯Ø§Ø¯ ØªØ­ÙˆÛŒÙ„',
        markdown: 'ØªØºÛŒÛŒØ± Ù…Ø´ØªØ±Ú© Ø§Ø³Øª ÙˆÙ‚ØªÛŒ: Ø¨Ø§ÛŒØª Ø±ÙˆÛŒ remote + pointer Ø¯Ø± Ú¯ÛŒØª + `dvc pull` Ø¬ÙˆØ§Ø¨ Ø¯Ù‡Ø¯.',
      },
    ],
  },
  'api-1': {
    seriesTitle: 'Ù‡Ù…Ú©Ø§Ø±ÛŒ Ùˆ CI',
    name: 'Ø®ÙˆØ§Ù†Ø¯Ù† Ø¯Ø§Ø¯Ù‡ Ø¨Ø¯ÙˆÙ† checkout (dvc.api)',
    objective: 'Ø³Ø·Ø­ API Ø¯Ø§Ø¯Ù‡ Ø±Ø§ Ø¯Ø± Ø´Ø¨ÛŒÙ‡â€ŒØ³Ø§Ø² Ø¨ÛŒØ§Ø²Ù…Ø§ÛŒÛŒØ¯ Ùˆ Ù‚Ø±Ø§Ø±Ø¯Ø§Ø¯ pointer Ø±Ø§ Ø¨Ø±Ø±Ø³ÛŒ Ú©Ù†ÛŒØ¯.',
    learning: ['dvc.api Ø¯Ø§Ø¯Ù‡â€ŒÛŒ ØªØ±Ú©â€ŒØ´Ø¯Ù‡ Ø±Ø§ Ø¯Ø± Ø§Ù¾/Ù†ÙˆØªâ€ŒØ¨ÙˆÚ© Ù…ÛŒâ€ŒØ®ÙˆØ§Ù†Ø¯', 'API Ø¬Ø§ÛŒ checkout ÙØ§ÛŒÙ„ Ø±ÙˆÛŒ Ø¯ÛŒØ³Ú© Ø±Ø§ Ù†Ù…ÛŒâ€ŒÚ¯ÛŒØ±Ø¯'],
    fieldNotes: ['Ø¯Ø§Ø´Ø¨ÙˆØ±Ø¯ Ø¨Ø§ dvc.api + commit pinnedØŒ Ù†Ù‡ Ø¯Ø§Ù†Ù„ÙˆØ¯ Ø¯Ø³ØªÛŒ'],
    startDialog: [
      {
        title: 'Ù‚Ø±Ø¶ Ú¯Ø±ÙØªÙ† Ø¨Ø§ÛŒØª Ø¯Ø± Ú©Ø¯',
        markdown: '`dvc.api` Ø¨Ø±Ø§ÛŒ Ø§Ù¾. `dvc checkout` Ø¨Ø±Ø§ÛŒ ÙØ¶Ø§ÛŒ Ú©Ø§Ø±ÛŒ.',
      },
    ],
  },
  'cmp-5': {
    seriesTitle: 'Ø±ÛŒÙˆÛŒÙˆ Ùˆ Ù…Ù‚Ø§ÛŒØ³Ù‡',
    name: 'Ø¨Ø³ØªÙ‡â€ŒÛŒ Ú©Ø§Ù…Ù„ Ø±ÛŒÙˆÛŒÙˆÛŒ ML',
    objective: 'ÛŒÚ© ØªØºÛŒÛŒØ±ØŒ Ú©Ù„ Ø¨Ø³ØªÙ‡: params diffØŒ metrics diffØŒ plots diff Ø¨Ø¹Ø¯ Ø§Ø² repro.',
    learning: ['PR Ø¬Ø¯ÛŒ ML ÛŒØ¹Ù†ÛŒ Ù†ÛŒØª + Ø§Ø«Ø± + Ù…Ù†Ø­Ù†ÛŒ', 'Ø¨Ø¯ÙˆÙ† metrics/plots Ø±ÛŒÙˆÛŒÙˆØ± Ù…Ù‡Ø± Ù„Ø§Ø³ØªÛŒÚ©ÛŒ Ù…ÛŒâ€ŒØ²Ù†Ø¯'],
    fieldNotes: ['Ø¨Ø¯Ù†Ù‡â€ŒÛŒ PR Ø¨Ø§ Ø³Ù‡ Ø¬Ø§: params / metrics / plots'],
    startDialog: [
      {
        title: 'Ø­Ø¯Ø§Ù‚Ù„ PR Ø¬Ø¯ÛŒ',
        markdown: 'params diff â†’ repro â†’ metrics diff â†’ plots diff.',
      },
    ],
  },
  'collab-4': {
    seriesTitle: 'Ù‡Ù…Ú©Ø§Ø±ÛŒ Ùˆ CI',
    name: 'ØªØ¹Ø§Ø±Ø¶ lock/pointer Ø¯Ø± PR Ø¯Ø§Ø¯Ù‡',
    objective: 'ØªØ¹Ø§Ø±Ø¶ PR Ø±Ø§ Ø­Ù„ Ú©Ù†ÛŒØ¯: Ù¾Ø§Ø±Ø§Ù…ØªØ± Ø¹ÙˆØ¶ Ø´Ø¯Ù‡ØŒ lock Ú©Ù‡Ù†Ù‡. reproØŒ commit Ø±Ø³ÛŒØ¯ØŒ status ØªÙ…ÛŒØ².',
    learning: ['yaml Ù†ÛŒØªØŒ lock Ø±Ø³ÛŒØ¯', 'lock Ø±Ø§ Ø¯Ø³ØªÛŒ merge Ù†Ú©Ù†ÛŒØ¯'],
    fieldNotes: ['Ø±ÙˆØ§Ù„: status â†’ repro â†’ commit â†’ status'],
    startDialog: [{ title: 'Ø¯Ùˆ Ù†ÙØ±ØŒ ÛŒÚ© Ù‚Ø±Ø§Ø±Ø¯Ø§Ø¯', markdown: 'reproØŒ Ø¨Ø¹Ø¯ Ø±Ø³ÛŒØ¯ Ø¬Ø¯ÛŒØ¯ Ø±Ø§ commit Ú©Ù†ÛŒØ¯.' }],
  },
  'reg-4': {
    seriesTitle: 'Ø±Ø¬ÛŒØ³ØªØ±ÛŒ Ùˆ Ø¨Ø§Ø²Ø§Ø³ØªÙØ§Ø¯Ù‡',
    name: 'pin Ú©Ø±Ø¯Ù† upstream Ùˆ update',
    objective: 'import Ø±Ø§ Ø¨Ø§ pin Ø¨Ø®ÙˆØ§Ù†ÛŒØ¯ØŒ Ø¨Ø¹Ø¯ Ø¹Ù…Ø¯Ø§Ù‹ `dvc update`.',
    learning: ['import Ù…Ø³ÛŒØ± + md5 Ø±Ø§ Ù…ÛŒØ®Ú©ÙˆØ¨ Ù…ÛŒâ€ŒÚ©Ù†Ø¯', 'update Ø±ÙˆÛŒØ¯Ø§Ø¯ Ø±ÛŒÙˆÛŒÙˆ Ø§Ø³Øª'],
    fieldNotes: ['bump Ø±Ø§ Ø¨Ø§ changelog Ø¯Ø± PR Ø¨Ú¯Ø°Ø§Ø±ÛŒØ¯'],
    startDialog: [{ title: 'Ù‚Ø±Ø¶ Ø¨Ø§ Ø±Ø³ÛŒØ¯', markdown: 'get Ú©Ù¾ÛŒ Â· import pin Â· update Ø¬Ø§Ø¨Ù‡â€ŒØ¬Ø§ÛŒÛŒ pin.' }],
  },
  'capstone-2': {
    seriesTitle: 'Ù‡Ù…Ú©Ø§Ø±ÛŒ Ùˆ CI',
    name: 'Ú†Ú©â€ŒÙ¾ÙˆÛŒÙ†Øª Ù¾Ø§ÛŒØ§Ù†ÛŒ end-to-end',
    objective: 'ØªÙ…Ø±ÛŒÙ† ÙØ§Ø±Øºâ€ŒØ§Ù„ØªØ­ØµÛŒÙ„ÛŒ: dirty â†’ status â†’ add/commit â†’ push â†’ git commit ÙÙ‚Ø· pointer.',
    learning: ['end-to-end ÛŒÚ© Ø±ÙˆØ§ÛŒØª Ø§Ø³Øª', 'Ø¨Ø¯ÙˆÙ† push/pointer Ù‡Ù…â€ŒØªÛŒÙ…ÛŒ Ø¨Ø¹Ø¯ÛŒ Ù…ÛŒâ€ŒØ´Ú©Ù†Ø¯'],
    fieldNotes: ['Ú¯ÛŒØª Ø¢Ù†â€ŒØ¨ÙˆØ±Ø¯ÛŒÙ†Ú¯ Ú©Ø§Ø± Ø¯Ø§Ø¯Ù‡'],
    startDialog: [{ title: 'ÙØ§Ø±Øºâ€ŒØ§Ù„ØªØ­ØµÛŒÙ„ÛŒ', markdown: 'ÙØ±Ù…Ø§Ù† Ø¬Ø¯ÛŒØ¯ Ù†ÛŒØ³Øª. **ÛŒÚ© Ø¯Ø§Ø³ØªØ§Ù† Ù…Ù†Ø³Ø¬Ù….**' }],
  },
  'mastery-1': {
    seriesTitle: 'Ù‡Ù…Ú©Ø§Ø±ÛŒ Ùˆ CI',
    name: 'Ø¨Ø§Ø²ÛŒØ§Ø¨ÛŒ ÙØ§Ø¬Ø¹Ù‡: restore Ø§Ø² remote',
    objective: 'Ù…Ø§Ø´ÛŒÙ† Ú¯Ù…â€ŒØ´Ø¯Ù‡ Ø±Ø§ Ø´Ø¨ÛŒÙ‡â€ŒØ³Ø§Ø²ÛŒ Ú©Ù†ÛŒØ¯: ÙØ¶Ø§ÛŒ Ú©Ø§Ø±ÛŒ Ø±Ø§ Ø®Ø§Ù„ÛŒØŒ Ø§Ø² remote Ø¨Ø§ fetch+pull Ø¨Ø±Ú¯Ø±Ø¯Ø§Ù†ÛŒØ¯.',
    learning: ['DR ÛŒØ¹Ù†ÛŒ remote + pointer Ú©Ø§Ù…ÛŒØªâ€ŒØ´Ø¯Ù‡', 'fetch cache Ø±Ø§ Ù¾Ø± Ù…ÛŒâ€ŒÚ©Ù†Ø¯Ø› pull Ø¯Ø±Ø®Øª Ú©Ø§Ø±ÛŒ Ø±Ø§ Ø¨Ø±Ù…ÛŒâ€ŒÚ¯Ø±Ø¯Ø§Ù†Ø¯'],
    fieldNotes: ['ØªÙ…Ø±ÛŒÙ† DR ÙØµÙ„ÛŒ: Ù…Ø§Ø´ÛŒÙ† ØªØ§Ø²Ù‡ØŒ cloneØŒ pullØŒ metrics'],
    startDialog: [{ title: 'ÙˆÙ‚ØªÛŒ Ù„Ù¾â€ŒØªØ§Ù¾ Ù…ÛŒâ€ŒÙ…ÛŒØ±Ø¯', markdown: 'Ú¯ÛŒØª ØªØ§Ø±ÛŒØ®Ú†Ù‡ pointer Ø±Ø§ Ø¯Ø§Ø±Ø¯. remote Ø¯Ø§Ø¯Ù‡ Ø¨Ø§ÛŒØª Ø±Ø§.' }],
  },
  'mastery-2': {
    seriesTitle: 'Ù‡Ù…Ú©Ø§Ø±ÛŒ Ùˆ CI',
    name: 'ØªØµÙ…ÛŒÙ… Git-LFS Ø¯Ø± Ø¨Ø±Ø§Ø¨Ø± DVC',
    objective: 'Ø§Ø¨Ø²Ø§Ø± Ø¯Ø±Ø³Øª Ø±Ø§ Ø¨Ø§ Ø´Ø§Ù‡Ø¯ Ø§Ù†ØªØ®Ø§Ø¨ Ú©Ù†ÛŒØ¯: LFS vs DVCØŒ Ø¨Ø¹Ø¯ tracking Ø¯Ø§Ø¯Ù‡â€ŒÛŒ ML Ø¨Ø§ DVC.',
    learning: ['LFS = blob Ø¯Ø± remote Ú¯ÛŒØªØ› DVC = pointer + store Ø´ÛŒØ¡ + pipeline', 'ØªÙ‚Ø±ÛŒØ¨Ø§Ù‹ Ù‡Ù…ÛŒØ´Ù‡ Ø¨Ø±Ø§ÛŒ ML: DVC'],
    fieldNotes: ['Ø¬Ø¯ÙˆÙ„ ØªØµÙ…ÛŒÙ… Ø¯Ø± wiki ØªÛŒÙ…ØŒ Ù†Ù‡ ÙÙˆÙ„Ú©Ù„ÙˆØ± Ú†Øª'],
    startDialog: [{ title: 'Ø¯Ø±Ø³Øª Ùˆ Ú©Ø³Ù„â€ŒÚ©Ù†Ù†Ø¯Ù‡ Ø§Ù†ØªØ®Ø§Ø¨ Ú©Ù†', markdown: 'repro/exp/cache/pipeline â†’ DVC.' }],
  },
  'mastery-3': {
    seriesTitle: 'Ù‡Ù…Ú©Ø§Ø±ÛŒ Ùˆ CI',
    name: 'CI secrets + pull + comment',
    objective: 'Ø¨Ø¯Ù†Ù‡â€ŒÛŒ CI ØªÙˆÙ„ÛŒØ¯ÛŒ: pullØŒ reproØŒ metricsØŒ CMLØŒ commit Ø±Ø³ÛŒØ¯.',
    learning: ['credential Ø¯Ø± CI secretsØŒ Ù‡Ø±Ú¯Ø² Ø¯Ø± .dvc/config', 'Ø¨Ø¯Ù†Ù‡â€ŒÛŒ CI ÛŒØ¹Ù†ÛŒ pull â†’ repro â†’ comment'],
    fieldNotes: ['OIDC/role auth Ø¨Ù‡ØªØ± Ø§Ø² Ú©Ù„ÛŒØ¯Ù‡Ø§ÛŒ Ø¨Ù„Ù†Ø¯Ù…Ø¯Øª'],
    startDialog: [{ title: 'CI Ú©Ù‡ ØªÛŒÙ… Ø§Ù…Ù†ÛŒØª ØªØ£ÛŒÛŒØ¯ Ù…ÛŒâ€ŒÚ©Ù†Ø¯', markdown: 'Secret Ø¯Ø± vault. Ú©Ø§Ù†ÙÛŒÚ¯ remote Ø¯Ø± Ú¯ÛŒØª. Ø¨Ø§ÛŒØª Ø¯Ø± remote Ø¯Ø§Ø¯Ù‡.' }],
  },
  'mastery-4': {
    seriesTitle: 'Ù‡Ù…Ú©Ø§Ø±ÛŒ Ùˆ CI',
    name: 'promote Ø¢Ø±ØªÛŒÙÚ©Øª: Ù…Ø¯Ù„ ØªØ§ release',
    objective: 'Ø¢Ø²Ù…Ø§ÛŒØ´ Ø¨Ø±Ù†Ø¯Ù‡ Ø±Ø§ Ø¨Ù‡ release ØªØ¨Ø¯ÛŒÙ„ Ú©Ù†ÛŒØ¯: applyØŒ reproØŒ pushØŒ Ø±ÙˆØ§ÛŒØª Ø¯Ø± Ú¯ÛŒØª.',
    learning: ['release = apply + repro + push + git commit', 'exp apply ÛŒØ¹Ù†ÛŒ deploy Ù†ÛŒØ³Øª'],
    fieldNotes: ['Ú†Ú©â€ŒÙ„ÛŒØ³Øª: apply â†’ repro â†’ push â†’ commit â†’ tag'],
    startDialog: [{ title: 'Ø§Ø² Ø¨Ø±Ù†Ø¯Ù‡ ØªØ§ release', markdown: 'exp â†’ show â†’ apply â†’ repro â†’ push â†’ git commit.' }],
  },
  'mastery-5': {
    seriesTitle: 'Ø±ÛŒÙˆÛŒÙˆ Ùˆ Ù…Ù‚Ø§ÛŒØ³Ù‡',
    name: 'Ø±ÛŒÙˆÛŒÙˆÛŒ plot Ù…Ø§ØªØ±ÛŒØ³ Ø®Ø·Ø§',
    objective: 'Ù‚Ø§Ù„Ø¨ confusion Ø±Ø§ Ø±Ù†Ø¯Ø± Ùˆ plots diff Ø¨Ú¯ÛŒØ±ÛŒØ¯ â€” Ø±ÛŒÙˆÛŒÙˆÛŒ Ø·Ø¨Ù‚Ù‡â€ŒØ¨Ù†Ø¯ÛŒ Ø¨Ø¯ÙˆÙ† Ù†ÙˆØªâ€ŒØ¨ÙˆÚ©.',
    learning: ['Ù‚Ø§Ù„Ø¨ Ù†Ø­ÙˆÙ‡â€ŒÛŒ Ø®ÙˆØ§Ù†Ø¯Ù† Ø±Ø§ Ú©Ø¯ Ù…ÛŒâ€ŒÚ©Ù†Ø¯', 'plots diff Ø¯ÙˆÙ‚Ù„Ùˆ metrics diff Ø§Ø³Øª'],
    fieldNotes: ['release Ø·Ø¨Ù‚Ù‡â€ŒØ¨Ù†Ø¯ÛŒ Ù‡Ù…ÛŒØ´Ù‡ confusion matrix Ø¯Ø§Ø±Ø¯'],
    startDialog: [{ title: 'Ù…Ø§ØªØ±ÛŒØ³ Ø±Ø§ Ø¨Ø®ÙˆØ§Ù†ØŒ Ù†Ù‡ Ù…ÛŒØ§Ù†Ú¯ÛŒÙ† Ø±Ø§', markdown: '`dvc plots show --template confusion`.' }],
  },
  'mastery-6': {
    seriesTitle: 'Ù…ØªØ§ Ùˆ Ù‚Ø±Ø§Ø±Ø¯Ø§Ø¯',
    name: 'Ø¯Ø§Ø¯Ù‡â€ŒÛŒ Ø®Ø§Ø±Ø¬ÛŒ + Ù‚Ø±Ø§Ø±Ø¯Ø§Ø¯ no-cache',
    objective: 'stage Ø¨Ø§ Ø®Ø±ÙˆØ¬ÛŒ external/no-cacheØŒ Ù„ÛŒØ³ØªØŒ reproØŒ Ùˆ DAG Ø¨Ù‡â€ŒØ¹Ù†ÙˆØ§Ù† Ù‚Ø±Ø§Ø±Ø¯Ø§Ø¯.',
    learning: ['external/no-cache Ù‡ÙˆÛŒØª Ø±Ø§ ØªØ±Ú© Ù…ÛŒâ€ŒÚ©Ù†Ø¯ Ø¨Ø¯ÙˆÙ† Ø¨Ø§ÛŒØª Ø§Ù†Ø¨Ø§Ø±', 'DAG Ù‚Ø±Ø§Ø±Ø¯Ø§Ø¯ Ø¯Ø§Ø¯Ù‡ Ù¾ÛŒØ´ Ø§Ø² merge Ø§Ø³Øª'],
    fieldNotes: ['Ø¬Ø¯ÙˆÙ„â€ŒÙ‡Ø§ÛŒ warehouse Ø®Ø±ÙˆØ¬ÛŒ external Ù‡Ø³ØªÙ†Ø¯ØŒ Ù†Ù‡ Ø´ÛŒØ¡ cache'],
    startDialog: [{ title: 'ÙˆÙ‚ØªÛŒ Ø¨Ø§ÛŒØª Ø¬Ø§ÛŒ Ø¯ÛŒÚ¯Ø±ÛŒ Ø§Ø³Øª', markdown: '`-O` / cache:false **Ù†Ø§Ù…** Ø±Ø§ ØªØ±Ú© Ù…ÛŒâ€ŒÚ©Ù†Ø¯ØŒ Ù†Ù‡ Ø§Ù†Ø¨Ø§Ø± Ø±Ø§.' }],
  },
  'mastery-7': {
    seriesTitle: 'RemoteÙ‡Ø§',
    name: 'auth Ù…Ø³ÛŒØ± Ø¨Ø¯ÙˆÙ† Ù†Ø´ØªÛŒ secret',
    objective: 'remote ØªÛŒÙ… Ø±Ø§ Ù¾ÛŒÚ©Ø±Ø¨Ù†Ø¯ÛŒ Ú©Ù†ÛŒØ¯: non-secret Ø¯Ø± configØŒ secret Ø§Ø² env/CI â€” credentials Ù‡Ø±Ú¯Ø² commit Ù†Ø´ÙˆØ¯.',
    learning: ['URL Ùˆ non-secret Ø¯Ø± .dvc/config', 'secret Ø§Ø² env/CI/role', 'remote modify Ø³ÛŒØ§Ø³Øª auth Ø±Ø§ Ú©Ø¯ Ù…ÛŒâ€ŒÚ©Ù†Ø¯'],
    fieldNotes: ['.dvc/config Ø±Ø§ Ø¯Ø± PR Ø¨Ø¨ÛŒÙ†ÛŒØ¯ â€” Ú©Ù„ÛŒØ¯ Ø¨Ù„Ù†Ø¯Ù…Ø¯Øª Ù†Ù‡', 'OIDC/role Ø¨Ù‡ØªØ± Ø§Ø² access_key_id Ø¯Ø± CI'],
    startDialog: [{ title: 'credential ÙØ§ÛŒÙ„ Ù¾Ø±ÙˆÚ˜Ù‡ Ù†ÛŒØ³Øª', markdown: 'URL/Ù¾Ø±ÙˆÙØ§ÛŒÙ„ Ø±Ø§ Ø¨Ù‡ Ø§Ø´ØªØ±Ø§Ú© Ø¨Ú¯Ø°Ø§Ø±ÛŒØ¯. `secret_access_key` Ù‡Ø±Ú¯Ø².' }],
  },
  'mastery-8': {
    seriesTitle: 'Ù‡Ù…Ú©Ø§Ø±ÛŒ Ùˆ CI',
    name: 'Transfer: ØªØºÛŒÛŒØ± Ø¯Ø§Ø¯Ù‡ Ø¨Ø¯ÙˆÙ† Ø¯Ø³ØªÙˆØ±Ø§Ù„Ø¹Ù…Ù„',
    objective: 'Ø¨Ø¯ÙˆÙ† Ù„ÛŒØ³Øª Ù…Ø±Ø§Ø­Ù„. Ø¯Ø§Ø¯Ù‡ dirtyØŒ pointer commitØŒ Ø§Ø´ÛŒØ§ push.',
    learning: ['Ø¢Ø²Ù…ÙˆÙ† transfer: Ù…Ø³ÛŒØ± Ø±Ø§ Ø®ÙˆØ¯ØªØ§Ù† Ø·Ø±Ø§Ø­ÛŒ Ú©Ù†ÛŒØ¯', 'Done = status ØªÙ…ÛŒØ² + pointer Ø¯Ø± Ú¯ÛŒØª + Ø¨Ø§ÛŒØª Ø±ÙˆÛŒ remote'],
    fieldNotes: ['Ú¯ÛŒØª Ø¢Ù†â€ŒØ¨ÙˆØ±Ø¯ÛŒÙ†Ú¯/Ø§Ø³ØªØ®Ø¯Ø§Ù… Ù…Ù‡Ù†Ø¯Ø³ Ø¯Ø§Ø¯Ù‡'],
    startDialog: [{ title: 'Ø¢Ø²Ù…Ø§ÛŒØ´Ú¯Ø§Ù‡ Ø¨Ø§Ø²', markdown: 'Ø§ÛŒÙ† level **Ø¯Ø³ØªÙˆØ±Ø§Ù„Ø¹Ù…Ù„ Ù†Ù…ÛŒâ€ŒØ¯Ù‡Ø¯**. Ù‡Ø¯Ù ÛŒÚ© ÙˆØ¶Ø¹ÛŒØª Ø§Ø³Øª.' }],
  },
'xfer-1': {
    seriesTitle: 'انتقال',
    name: 'پزشکی قانونی pointer: اثبات درک',
    objective: 'فرمان جدید نیست. pointer را بخوانید، گیت و DVC را توضیح دهید، صحت را با status/diff اثبات کنید.',
    learning: ['فایل pointer قرارداد است: path + md5', 'اگر نمی‌توانید .dvc را توضیح دهید، مهارت مال شما نیست'],
    fieldNotes: ['پرسش‌های حادثه از همین‌جا شروع می‌شود'],
    startDialog: [{ title: 'توضیح بده وگرنه مال تو نیست', markdown: 'این level **شاهد** می‌خواهد، نه فلگ جدید.' }],
  },
  'xfer-2': {
    seriesTitle: 'انتقال',
    name: 'تحویل زیر فشار — بدون حلقه‌ی گم‌شده',
    objective: 'تحویل: dirty → شاهد → pointer → remote → تاریخچه.',
    learning: ['بدون push/commit pointer هم‌تیمی بعدی می‌شکند', 'status قبل از commit قابل مذاکره نیست'],
    fieldNotes: ['تعریف Done برای کار داده'],
    startDialog: [{ title: 'شبکه‌ی ایمنی نیست', markdown: 'شما مهندس on-call هستید. تحویل را تمام کنید.' }],
  },
  'xfer-3': {
    seriesTitle: 'انتقال',
    name: 'طراحی pipeline بدون دستورالعمل',
    objective: 'stage آموزش را خودتان طراحی کنید: deps، params، outs، metrics. بعد repro + DAG.',
    learning: ['deps = باطل‌سازی، params = اهرم‌ها، metrics = شاهد', 'deps جامانده یعنی باگ خاموش تولید'],
    fieldNotes: ['تمرین مصاحبه: اول طراحی، بعد تایپ'],
    startDialog: [{ title: 'شما طراحی می‌کنید', markdown: 'اول فکر، بعد تایپ. بعد repro + dag.' }],
  },
  'xfer-4': {
    seriesTitle: 'انتقال',
    name: 'چرخه‌ی آزمایش + بازیابی خطا',
    objective: 'اجرای بد و خوب، انتخاب با شاهد، تا params/آرتیفکت/status هم‌راستا شوند.',
    learning: ['اجرای بد هم داده است', 'apply تمام نمی‌شود تا params + repro + status'],
    fieldNotes: ['اجرای ناموفق را قبل از exp show پاک نکنید'],
    startDialog: [{ title: 'تلاش اول عمداً غلط است', markdown: 'اول هایپرپارامتر بد. بعد بهتر.' }],
  },
  'xfer-5': {
    seriesTitle: 'انتقال',
    name: 'مرز ریویوی PR: شاهد یا رد',
    objective: 'بسته‌ی شاهد ML PR را بسازید. بدون حرکت metric ادغام نکنید.',
    learning: ['مرز ریویو: params + metrics + plots diff', 'بدون حرکت metric یعنی نه'],
    fieldNotes: ['این قالب ریویوی تیم شما باید باشد'],
    startDialog: [{ title: 'شما ریویور هستید', markdown: 'سه diff. اگر اثر نیست، level قبول نیست.' }],
  },
  'xfer-6': {
    seriesTitle: 'انتقال',
    name: 'حادثه: ترمیم زنجیره‌ی شکسته',
    objective: 'فایل رفته است. زنجیره pointer → cache/remote → workspace را بازسازی کنید.',
    learning: ['فایل گم‌شده ≠ داده گم‌شده', 'fetch در برابر pull ترتیب ترمیم است'],
    fieldNotes: ['این runbook ساعت ۲ بامداد است'],
    startDialog: [{ title: 'فایل نیست', markdown: '`data/data.xml` از دیسک رفته. **بدون وحشت ترمیم کنید.' }],
  },
  'xfer-7': {
    seriesTitle: 'انتقال',
    name: 'یکپارچگی lock: رسید هرگز دروغ نمی‌گوید',
    objective: 'lock کهنه بسازید، فقط با repro درست کنید، بعد yaml و lock را هم‌داستان اثبات کنید.',
    learning: ['lock را دستی ویرایش نکنید', 'lock کهنه = رسید دروغ برای هر clone'],
    fieldNotes: ['CI باید fail کند اگر lock بعد از repro dirty بود'],
    startDialog: [{ title: 'رسید باید راست بگوید', markdown: 'پارامتر را عوض کنید. با `repro` درست کنید.' }],
  },
};
