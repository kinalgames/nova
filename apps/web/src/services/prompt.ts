// Persona → system prompt composition. Pure by design: the store passes
// state in, the proxy receives ONE string — every provider adapter forwards
// it verbatim (Anthropic `system`, Gemini systemInstruction, OpenAI system
// message), so this module is the single place the assistant's voice is set.

export interface ReplyStyles {
  concise: boolean
  warm: boolean
  formal: boolean
  humor: boolean
}

export interface PersonaPromptOpts {
  /** what the user named the assistant — falls back to "Nova" when blank */
  assistantName: string
  /** the Settings → Assistant style toggles */
  styles: ReplyStyles
  /** the user's own system instructions (Settings → Assistant, free text) */
  customPrompt: string
  /** the active project's description — omitted for the default project */
  projectInstructions?: string
}

const STYLE_DIRECTIVES: Record<keyof ReplyStyles, string> = {
  concise: 'Keep replies concise and to the point; prefer bullet points over long prose.',
  warm: 'Use a warm, friendly, encouraging tone.',
  formal: 'Keep a professional, formal register; avoid slang.',
  humor: 'A light touch of humor is welcome when it fits — never at the expense of clarity.',
}

/**
 * Compose the system prompt for a live chat call.
 *
 * Section order is deliberate — identity first, then durable style, then the
 * user's own instructions (which may override style), then project context:
 * later sections carry more specific intent and models weight them that way.
 */
export function buildSystemPrompt(o: PersonaPromptOpts): string {
  const name = o.assistantName.trim() || 'Nova'
  const parts = [
    `You are ${name}, the user's personal AI assistant. Always reply in the language the user writes in.`,
  ]
  const directives = (Object.keys(STYLE_DIRECTIVES) as (keyof ReplyStyles)[])
    .filter((k) => o.styles[k])
    .map((k) => STYLE_DIRECTIVES[k])
  if (directives.length > 0) parts.push(directives.join(' '))
  const custom = o.customPrompt.trim()
  if (custom) parts.push(custom)
  const project = o.projectInstructions?.trim()
  if (project) parts.push(`Project instructions:\n${project}`)
  return parts.join('\n\n')
}
