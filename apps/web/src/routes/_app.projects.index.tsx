import { createFileRoute } from '@tanstack/react-router'
import { ProjectsView } from '../views/ProjectsView'

export const Route = createFileRoute('/_app/projects/')({
  component: ProjectsView,
})
