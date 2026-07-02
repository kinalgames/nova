// Typed i18n keys: t('…') is checked against the Vietnamese (source) catalog.
import vi from './vi.json'

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation'
    resources: { translation: typeof vi }
  }
}
