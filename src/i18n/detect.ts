export const LANGUAGES = ['fr', 'en'] as const
export type Language = (typeof LANGUAGES)[number]

const isLanguage = (code: string): code is Language =>
  (LANGUAGES as readonly string[]).includes(code)

/** The first of the device's languages the app speaks (navigator.languages, BCP 47 tags), English
 * otherwise. */
export function detectLanguage(languages: readonly string[]): Language {
  for (const tag of languages) {
    const code = tag.split('-')[0]!.toLowerCase()
    if (isLanguage(code)) return code
  }
  return 'en'
}
