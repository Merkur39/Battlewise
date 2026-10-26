import { createContext, use } from 'react'
import type { AppState } from './store'

/** What the Settings show before they are saved: the whole app takes them while the dialog is open. */
export type Preview = Partial<Pick<AppState, 'theme' | 'language'>>

export const PreviewContext = createContext<Preview>({})

export const usePreview = () => use(PreviewContext)
