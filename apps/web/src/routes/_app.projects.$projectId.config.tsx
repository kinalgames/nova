import { createFileRoute } from '@tanstack/react-router'
import { ProjectConfigView } from '../views/ProjectConfigView'

export const Route = createFileRoute('/_app/projects/$projectId/config')({
  component: ProjectConfigView,
})
