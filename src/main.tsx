import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/ibm-plex-sans/400.css'
import '@fontsource/ibm-plex-sans/500.css'
import '@fontsource/ibm-plex-mono/400.css'
import '@fontsource/ibm-plex-mono/500.css'
// The global styles before any component: each component's own styles come after them, and prevail.
import './styles/themes.css'
import './styles/base.css'
import { Root } from './app/Root'
import { browserStorage, createStore } from './app/store'
import { StoreContext } from './app/useAppState'
import { listenForInstallPrompt } from './features/install/prompt'
import { InstallPromptContext } from './features/install/useInstall'
import { createIssueStates } from './features/report/issues'
import { createOutbox } from './features/report/outbox'
import { postReport } from './features/report/send'
import { IssueStatesContext, OutboxContext } from './features/report/useReport'

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Root element #root not found')
}

// Before the first render: the browser may offer its prompt as soon as the page loads.
const installPrompt = listenForInstallPrompt(window)

createRoot(rootElement).render(
  <StrictMode>
    <StoreContext value={createStore(browserStorage())}>
      <OutboxContext value={createOutbox(browserStorage(), postReport)}>
        <IssueStatesContext value={createIssueStates(browserStorage())}>
          <InstallPromptContext value={installPrompt}>
            <Root />
          </InstallPromptContext>
        </IssueStatesContext>
      </OutboxContext>
    </StoreContext>
  </StrictMode>,
)
