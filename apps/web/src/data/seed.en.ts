// English demo seed bundle — mirrors seed.vi.ts structurally, translated.

import type { Block, Message } from '../state/types'
import type { SeedData } from './seed'

const msg = (
  id: string,
  role: Message['role'],
  who: string,
  blocks: Block[],
  extra: Partial<Message> = {},
): Message => ({ id, role, who, blocks, ...extra })

export const seedEn: SeedData = {
  projects: [
    {
      id: 'chung',
      name: 'General',
      description: 'Conversations that belong to no project live here.',
      accent: 'var(--faint)',
      isDefault: true,
    },
    {
      id: 'aurora',
      name: 'Aurora',
      description:
        'Aurora launches in Q3. The audience is deep workers who hate distraction. Confident voice, never showy. Always reference Positioning-v2.md when discussing messaging.',
      accent: 'var(--accent)',
    },
  ],
  convs: [
    { id: 'c1', title: 'Competitor benchmark comparison', projectId: 'aurora', demo: true },
    { id: 'c2', title: 'Landing page opening', projectId: 'aurora' },
    { id: 'c3', title: 'Six-week content calendar', projectId: 'aurora' },
    { id: 'c4', title: 'Survey analysis', projectId: 'chung' },
  ],
  profiles: {
    claude: [
      { id: 'pf-claude-acc', name: 'Personal', kind: 'account', credential: 'thanh@kinal.co', status: 'active', demo: true },
      { id: 'pf-claude-key', name: 'Backup', kind: 'api_key', credential: 'sk-ant-••••••••  4f2a', status: 'active', demo: true },
    ],
    gemini: [],
    openai: [
      { id: 'pf-openai-key', name: 'Main key', kind: 'api_key', credential: 'sk-••••••••  9c1d', status: 'active', demo: true },
    ],
    ollama: [
      { id: 'pf-ollama', name: 'This machine', kind: 'api_key', credential: 'http://localhost:11434', status: 'active', demo: true },
    ],
  },
  projectFiles: [
    { id: 'pjf-plan', kind: 'md', name: 'plan.md', meta: '2.1 KB · just updated' },
    { id: 'pjf-brief', kind: 'pdf', name: 'Brief-Aurora.pdf', meta: '1.2 MB · 8 pages' },
    { id: 'pjf-survey', kind: 'csv', name: 'Survey.csv', meta: '18 KB · 412 rows' },
  ],
  samples: {
    md: {
      type: 'text/markdown',
      body: '# Aurora launch plan\n\n## Activation gap\n- 72-hour activation: 29% (target 38%)\n- Cause: multi-step signup\n- Action: merge into one step before launch\n\n## Six weeks\nPositioning → Production → Launch & measure.\n',
    },
    csv: {
      type: 'text/csv',
      body: 'user,activated 72h,channel\nu_0142,yes,email\nu_0143,no,ads\nu_0144,yes,referral\n',
    },
    code: {
      type: 'text/x-python',
      body: 'import pandas as pd\n\nsurvey = pd.read_csv("survey.csv")\nbench  = pd.read_json("bench.json")\nact = survey["activated_72h"].mean()\nprint(f"activation: {act:.0%}")\n',
    },
    pdf: {
      type: 'text/plain',
      body: 'Aurora — Brief\nProduct launch · Q3 2026\n\nAurora is a single-flow AI workspace for deep workers.\n',
    },
    image: { type: 'text/plain', body: 'moodboard.png — sample image (demo).\n' },
  },
  previewMeta: {
    pdf: '8 pages · 1.2 MB',
    code: 'Python · 1.4 KB',
    csv: '412 rows · 18 KB',
    md: 'Markdown · 2.1 KB',
  },
  previewNames: {
    pdf: 'Brief-Aurora.pdf',
    code: 'analyze.py',
    csv: 'Survey.csv',
    md: 'plan.md',
  },
  previewDocs: {
    pdf: {
      title: 'Aurora — Brief',
      meta: 'Product launch · Q3 2026',
      lead: 'Aurora is a single-thread AI workspace for deep workers — every conversation, document and tool gathered in one focused place.',
      page: 'page 1 / 8',
    },
    code: { print: 'activation' },
    csv: {
      head: ['user', 'activated 72h', 'channel'],
      rows: [
        { id: 'u_0142', ok: true, okText: 'yes', channel: 'email' },
        { id: 'u_0143', ok: false, okText: 'no', channel: 'ads' },
        { id: 'u_0144', ok: true, okText: 'yes', channel: 'referral' },
      ],
    },
    md: {
      title: 'Aurora launch plan',
      gapHeading: 'Activation gap',
      bullets: [
        { pre: '72-hour activation: ', strong: '29%', tail: ' (target 38%)' },
        { pre: 'Cause: multi-step sign-up' },
        { pre: 'Action: collapse to one step before launch' },
      ],
      sixHeading: 'Six weeks',
      sixBody: 'Positioning → Production → Launch & measure.',
    },
  },
  replies: {
    templates: [
      {
        match: /code|function|bug|error|component|api|typescript|react/i,
        replies: [
          "I'd extract that into a pure function so it's easy to test, then add guards for the edge cases. Want me to include unit tests?",
          "The root cause is state being recomputed on every render. I'd wrap it in useMemo and trim the dependencies down to what actually changes — the jank disappears.",
          "I suggest splitting the interface first, writing a red test, then implementing. That keeps every change small and safe.",
        ],
      },
      {
        match: /write|email|post|article|content|draft|copy/i,
        replies: [
          "Here's a draft that keeps the voice confident without overselling: open with one value line, three key points, close with a clear call to action.",
          "I trimmed it to three sentences, one idea each, no filler. Short versions actually get read — want me to keep this length?",
        ],
      },
      {
        match: /plan|schedule|timeline|roadmap|step/i,
        replies: [
          "I'd split it into three phases: Positioning → Production → Launch & measure. Each phase gets one hard milestone so the schedule can't slip.",
          'The biggest task goes first because it blocks everything else. I ordered by dependency, not by inspiration — here is the suggested sequence.',
        ],
      },
      {
        match: /analy|data|report|metric|benchmark|survey/i,
        replies: [
          "Cross-check done: your key metric trails the leaders, and the cause sits in the multi-step onboarding. I'll fold the summary into the doc.",
          'One outlier is dragging the mean — the median reflects reality better here. Want me to plot the distribution?',
        ],
      },
    ],
    fallbacks: [
      "Got it. I'll stay within the {project} project context and carry this part forward for you.",
      "Sure, on it. Where something is uncertain I'll ask instead of guessing.",
      'Understood. Here is the direction I suggest, with brief reasoning so you can decide quickly.',
    ],
    smartSuffix: 'I also weighed a few alternatives and picked the tradeoff that serves you best.',
    instructionsNote: "(Following the instructions of the {project} project.)",
  },
  quiet: {
    user: 'Write the Risks section for the plan — tight, with mitigations.',
    intro: 'The four biggest risks and their mitigations:',
    risks: [
      { t: 'Diluted message.', d: 'Commit to a single positioning line.' },
      { t: 'Late content.', d: 'Review in batches, hard deadlines.' },
      { t: 'Scattered channels.', d: 'Pick exactly two channels.' },
      { t: 'Vague measurement.', d: 'Define “activation” up front.' },
    ],
  },
  threads: {
    c1: [
      msg('c1-1', 'user', 'THANH', [
        {
          type: 'text',
          text: 'Check whether this moodboard fits the Aurora positioning. Reference the brief too.',
        },
        {
          type: 'files',
          items: [
            { kind: 'image', name: 'moodboard.png', image: true, open: 'image' },
            { kind: 'pdf', name: 'Brief-Aurora.pdf', meta: '1.2 MB · 8 pages', open: 'pdf' },
          ],
        },
      ]),
      msg('c1-2', 'assistant', 'NOVA', [
        {
          type: 'text',
          size: 'lead',
          text: 'The moodboard leans warm and handcrafted — a **half fit**. Aurora’s positioning stresses “focused, minimal”, so I suggest fewer motifs and more whitespace. Matches and mismatches are in my notes.',
        },
        {
          type: 'actions',
          items: [
            { icon: 'copy', label: 'Copy', action: 'copy' },
            { icon: 'open', label: 'View moodboard', action: 'image' },
          ],
        },
      ]),
      msg('c1-3', 'user', 'THANH', [
        {
          type: 'text',
          text: 'Now compare the competitor benchmarks against my survey and save a summary to *plan.md*.',
        },
      ]),
      msg(
        'c1-4',
        'assistant',
        'NOVA',
        [
          {
            type: 'trace',
            summary: 'Nova searched the web and updated your document',
            meta: '5 tools · 6.4 seconds',
            steps: [
              { kind: 'think', text: 'I need the latest benchmark numbers before comparing. Searching first.' },
              { kind: 'tool', node: 'accent', title: 'Searched the web', detail: '— competitor launch benchmarks', tool: 'web_search', toolIcon: 'search', query: '"competitor launch benchmarks 2026"', result: '6 results', resultTone: 'success' },
              { kind: 'tool', node: 'danger', title: '⚠ One page failed to load', detail: '— tried another source', tool: 'web_fetch', toolIcon: 'fetch', query: 'openview.dev/report', result: 'timeout · retried ✓', resultTone: 'danger' },
              { kind: 'quote', node: 'accent', title: 'Read a web page', detail: '— techreview.io', quote: '“The leading competitor reaches 38% activation within the first 72 hours…”' },
              { kind: 'tool', node: 'accent', title: 'Opened your document', detail: '— Survey.csv', tool: 'read_file', toolIcon: 'file', result: '412 rows', resultTone: 'success' },
              { kind: 'code', node: 'accent', title: 'Ran the numbers', detail: '— merge & compare', code: ['$ python analyze.py --merge survey.csv bench.json', '✓ our activation: 29% (target 38%)'] },
              { kind: 'tool', node: 'accent', title: 'Saved to your document', detail: '— plan.md', tool: 'write_file', toolIcon: 'write', result: 'written · 2.1 KB', resultTone: 'success' },
              { kind: 'done', node: 'check', title: 'Done', detail: '· 6.4 seconds' },
            ],
          },
          {
            type: 'text',
            size: 'lead',
            text: 'Done. I compared the survey against 6 competitors and saved a summary to *plan.md*. Key gaps:',
          },
          {
            type: 'text',
            size: 'lead',
            text: '— Our 72-hour activation is **29%**, below the leader’s **38%**.\n— Cause: multi-step signup. The best competitor needs just one.\n— Suggestion: merge signup + first-run setup into one screen before launch week.',
          },
          {
            type: 'table',
            head: ['Cohort', '72h activation', 'Onboarding'],
            rows: [
              [{ text: 'Ours' }, { text: '29%', tone: 'danger' }, { text: 'Multi-step' }],
              [{ text: 'Leader' }, { text: '38%', tone: 'success' }, { text: 'One step' }],
              [{ text: 'Industry avg' }, { text: '33%' }, { text: '2–3 steps' }],
            ],
          },
          {
            type: 'sources',
            items: [
              { n: 1, label: 'techreview.io', open: 'pdf' },
              { n: 2, label: 'openview.dev', open: 'pdf' },
            ],
          },
          {
            type: 'actions',
            items: [
              { icon: 'copy', label: 'Copy', action: 'copy' },
              { icon: 'retry', label: 'Retry', action: 'retry' },
              { icon: 'open', label: 'Open plan.md', action: 'md' },
            ],
          },
          {
            type: 'files',
            label: 'FILES NOVA USED',
            items: [
              { kind: 'md', name: 'plan.md', meta: '2.1 KB · just updated', open: 'md' },
              { kind: 'code', name: 'analyze.py', meta: '1.4 KB', open: 'code' },
              { kind: 'csv', name: 'Survey.csv', meta: '18 KB · 412 rows', open: 'csv' },
            ],
          },
        ],
        { approval: { tool: 'bash', command: 'python analyze.py --merge survey.csv bench.json' } },
      ),
    ],
    c2: [
      msg('c2-1', 'user', 'THANH', [
        { type: 'text', text: 'Write the opening section for the Aurora landing page.' },
      ]),
      msg('c2-2', 'assistant', 'NOVA', [
        {
          type: 'text',
          size: 'lead',
          text: 'I would open with one positioning line, then three short benefits. Do you want the voice confident or friendly?',
        },
      ]),
    ],
    c3: [
      msg('c3-1', 'user', 'THANH', [
        { type: 'text', text: 'Plan six weeks of content before launch.' },
      ]),
      msg('c3-2', 'assistant', 'NOVA', [
        {
          type: 'text',
          size: 'lead',
          text: 'I split it into three phases: Positioning → Production → Launch, one anchor theme per week.',
        },
      ]),
    ],
    c4: [
      msg('c4-1', 'user', 'THANH', [{ type: 'text', text: 'Summarize the user survey for me.' }]),
    ],
  },
}
