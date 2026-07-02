import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import vi from './vi.json'
import en from './en.json'

export type Language = 'vi' | 'en'

/** the persisted language choice lives outside the settings slice so it is
 *  available before React (and any store) mounts */
export const LANG_KEY = 'nova.lang'

function detectInitial(): Language {
  try {
    const stored = localStorage.getItem(LANG_KEY)
    if (stored === 'vi' || stored === 'en') return stored
  } catch {
    /* ignore */
  }
  // Vietnamese is the product default; first-run detection only switches to
  // English for clearly non-Vietnamese browsers
  if (typeof navigator !== 'undefined' && navigator.language) {
    return navigator.language.toLowerCase().startsWith('vi') ? 'vi' : 'en'
  }
  return 'vi'
}

void i18n.use(initReactI18next).init({
  resources: { vi: { translation: vi }, en: { translation: en } },
  lng: detectInitial(),
  fallbackLng: 'vi',
  interpolation: { escapeValue: false },
})

export function setLanguage(lng: Language) {
  void i18n.changeLanguage(lng)
  try {
    localStorage.setItem(LANG_KEY, lng)
  } catch {
    /* ignore */
  }
}

export default i18n
