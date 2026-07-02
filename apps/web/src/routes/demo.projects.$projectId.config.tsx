import { createFileRoute } from '@tanstack/react-router'
import { ProjectConfigView } from '../views/ProjectConfigView'

export const Route = createFileRoute('/demo/projects/$projectId/config')({
  component: ProjectConfigView,
})
