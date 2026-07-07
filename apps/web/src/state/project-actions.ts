// Project CRUD (fake store — no backend) + the "start a new chat scoped to
// a project" action. Plain functions closing over the current s/set/goTo,
// exactly as they lived inline in deriveValues before.

import type { PresetId } from '../data/defs'
import { describeUpload } from '../services/files'
import type { NovaState } from './types'
import { ACCENT_DEFAULT, uid, type Updater } from './store-helpers'

export function createProjectActions(
  set: (u: Updater) => void,
  goTo: (to: string, params?: Record<string, string>) => void,
) {
  const createProject = (name: string, description: string, accent?: string) => {
    const id = uid()
    set((x) => ({
      projects: [
        ...x.projects,
        {
          id,
          name,
          description,
          accent: accent ?? ACCENT_DEFAULT,
          presets: { ...x.presetDefault },
          files: [],
        },
      ],
    }))
    goTo('/projects/$projectId', { projectId: id })
  }

  const editProject = (id: string, patch: { name?: string; description?: string; accent?: string }) =>
    set((x) => ({ projects: x.projects.map((p) => (p.id === id ? { ...p, ...patch } : p)) }))

  const addProjectFile = (projectId: string, file: File) => {
    const { kind, size, url } = describeUpload(file)
    const item = { id: uid(), kind, name: file.name, meta: size, url }
    set((x) => ({
      projects: x.projects.map((p) =>
        p.id === projectId ? { ...p, files: [...(p.files ?? []), item] } : p,
      ),
    }))
  }

  const removeProjectFile = (projectId: string, fileId: string) =>
    set((x) => ({
      projects: x.projects.map((p) =>
        p.id === projectId
          ? { ...p, files: (p.files ?? []).filter((f) => f.id !== fileId) }
          : p,
      ),
    }))

  const deleteProject = (id: string) => {
    set((x) => ({
      projects: x.projects.filter((p) => p.id !== id),
      // never orphan conversations — reassign them to the default project
      conversations: x.conversations.map((c) =>
        c.projectId === id ? { ...c, projectId: 'chung' } : c,
      ),
    }))
    goTo('/projects')
  }

  const moveConv = (convId: string, projectId: string) =>
    set((x) => ({
      conversations: x.conversations.map((c) => (c.id === convId ? { ...c, projectId } : c)),
    }))

  const toggleProjectPreset = (projectId: string, pid: PresetId) =>
    set((x) => ({
      projects: x.projects.map((p) =>
        p.id === projectId ? { ...p, presets: { ...p.presets, [pid]: !p.presets[pid] } } : p,
      ),
    }))

  const startChat = (projectId: string) => {
    // a conversation is born on the FIRST MESSAGE, not on intent — “new chat”
    // only opens the home composer scoped to the project, so empty Untitled
    // rows never pile up in the sidebar
    set({
      homeProject: projectId,
      respState: 'done',
      errorDetail: null,
      errorRequestId: null,
      errorAction: null,
      errorConv: null,
      palette: false,
      drawerOpen: false,
    } satisfies Partial<NovaState>)
    goTo('/new')
  }

  return {
    createProject,
    editProject,
    addProjectFile,
    removeProjectFile,
    deleteProject,
    moveConv,
    toggleProjectPreset,
    startChat,
  }
}
