import { createFileRoute } from '@tanstack/react-router'
import { AppLayout } from './_app'

/** the demo world — same shell, seeded showcase data, its own namespace */
export const Route = createFileRoute('/demo')({
  component: AppLayout,
})
