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
      { id: 'pf-claude-acc', name: 'Personal', kind: 'account', credential: 'minh@studio.vn', status: 'active' },
      { id: 'pf-claude-key', name: 'Backup', kind: 'api_key', credential: 'sk-ant-••••••••  4f2a', status: 'active' },
    ],
    gemini: [],
    openai: [
      { id: 'pf-openai-key', name: 'Main key', kind: 'api_key', credential: 'sk-••••••••  9c1d', status: 'active' },
    ],
    ollama: [
      { id: 'pf-ollama', name: 'This machine', kind: 'api_key', credential: 'http://localhost:11434', status: 'active' },
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
      msg('c1-1', 'user', 'MINH', [
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
      msg('c1-3', 'user', 'MINH', [
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
      msg('c2-1', 'user', 'MINH', [
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
      msg('c3-1', 'user', 'MINH', [
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
      msg('c4-1', 'user', 'MINH', [{ type: 'text', text: 'Summarize the user survey for me.' }]),
    ],
  },
}
