import { createFileRoute } from '@tanstack/react-router'
import { ProjectView } from '../views/ProjectView'

export const Route = createFileRoute('/_app/projects/$projectId/')({
  component: ProjectView,
})
