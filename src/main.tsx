import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/ibm-plex-sans/400.css'
import '@fontsource/ibm-plex-sans/500.css'
import '@fontsource/ibm-plex-mono/400.css'
import '@fontsource/ibm-plex-mono/500.css'
// The global styles before any component: each component's own styles come after them, and prevail.
import './styles/themes.css'
import './styles/base.css'
import { App } from './app/App'
import { browserStorage, createStore } from './app/store'
import { StoreContext } from './app/useAppState'
import { createIssueStates } from './features/report/issues'
import { createOutbox } from './features/report/outbox'
import { postReport } from './features/report/send'
import { IssueStatesContext, OutboxContext } from './features/report/useReport'

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Root element #root not found')
}

createRoot(rootElement).render(
  <StrictMode>
    <StoreContext value={createStore(browserStorage())}>
      <OutboxContext value={createOutbox(browserStorage(), postReport)}>
        <IssueStatesContext value={createIssueStates(browserStorage())}>
          <App />
        </IssueStatesContext>
      </OutboxContext>
    </StoreContext>
  </StrictMode>,
)
