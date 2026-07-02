import { createFileRoute } from '@tanstack/react-router'
import { ProjectView } from '../views/ProjectView'

export const Route = createFileRoute('/demo/projects/$projectId/')({
  component: ProjectView,
})
