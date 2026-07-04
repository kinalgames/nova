// Test fixture — the showcase content as a REAL-world store slice. The unit
// suite renders the real route tree seeded with this state: a signed-in user
// with configured providers browsing their own conversations. Data lives in
// test/showcase.ts (test-owned; the product ships no sample data).

import { fromLinear } from '../state/thread'
import type { NovaState } from '../state/types'
import { showcaseConvs, showcaseProfiles, showcaseProjects, showcaseThreads } from './showcase'

/** the deterministic assistant reply the hermetic /v1/chat responder streams
 *  (setup.ts) — send-tests assert against this exact text */
export const MOCK_REPLY = 'Đã xử lý xong yêu cầu của bạn.'

/** the showcase as a Partial<NovaState> for storeInit injection */
export function showcaseFixture(): Partial<NovaState> {
  return {
    projects: structuredClone(showcaseProjects),
    conversations: showcaseConvs.map((c, i) => ({
      ...c,
      updatedAt: Date.now() - [2, 26, 96, 290][i % 4] * 3_600_000,
    })),
    activeConv: 'c1',
    threads: Object.fromEntries(
      Object.entries(showcaseThreads).map(([id, ms]) => [id, fromLinear(structuredClone(ms))]),
    ),
    profiles: structuredClone(showcaseProfiles),
    staged: {
      c1: [
        { id: 'demo-img', kind: 'image', name: 'moodboard.png', size: '820 KB' },
        { id: 'demo-pdf', kind: 'pdf', name: 'Brief-Aurora.pdf', size: '1.2 MB' },
      ],
    },
  }
}
