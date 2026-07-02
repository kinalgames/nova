import { createFileRoute } from '@tanstack/react-router'
import { ProjectsView } from '../views/ProjectsView'

export const Route = createFileRoute('/demo/projects/')({
  component: ProjectsView,
})
