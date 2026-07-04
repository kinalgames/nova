// Test fixture — the seeded showcase data as a REAL-world store slice, so the
// unit suite no longer depends on the demo route/runtime. Built from the same
// seed the demo used, so existing assertions (c1/c2/c3, Aurora, message text)
// keep matching. When demo is deleted, this fixture is what tests seed instead.

import { getSeed } from '../data/seed'
import { fromLinear } from '../state/thread'
import type { NovaState } from '../state/types'

const noPresets = { code: false, design: false, research: false, writing: false, data: false }

/** the demo showcase as a Partial<NovaState> for storeInit injection */
export function demoFixture(): Partial<NovaState> {
  const seed = getSeed()
  return {
    projects: seed.projects.map((d) => ({
      ...d,
      presets:
        d.id === 'aurora'
          ? { code: false, design: true, research: true, writing: true, data: false }
          : noPresets,
      files: d.id === 'aurora' ? seed.projectFiles : [],
    })),
    // real data has no demo flag — strip it so send-routing treats these as
    // ordinary conversations
    conversations: seed.convs.map((conv, i) => {
      const { demo: _demo, ...c } = conv
      void _demo // strip the seed's demo flag — fixture rows are ordinary convs
      return { ...c, updatedAt: Date.now() - [2, 26, 96, 290][i % 4] * 3_600_000 }
    }),
    activeConv: 'c1',
    threads: Object.fromEntries(
      Object.entries(seed.threads).map(([id, ms]) => [id, fromLinear(ms)]),
    ),
    profiles: structuredClone(seed.profiles),
    staged: {
      c1: [
        { id: 'demo-img', kind: 'image', name: 'moodboard.png', size: '820 KB' },
        { id: 'demo-pdf', kind: 'pdf', name: 'Brief-Aurora.pdf', size: '1.2 MB' },
      ],
    },
  }
}
