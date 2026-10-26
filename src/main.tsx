import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/ibm-plex-sans/400.css'
import '@fontsource/ibm-plex-sans/500.css'
import '@fontsource/ibm-plex-mono/400.css'
import '@fontsource/ibm-plex-mono/500.css'
import { App } from './app/App'
import { browserStorage, createStore } from './app/store'
import { StoreContext } from './app/useAppState'
import './styles/themes.css'
import './styles/base.css'

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Root element #root not found')
}

createRoot(rootElement).render(
  <StrictMode>
    <StoreContext value={createStore(browserStorage())}>
      <App />
    </StoreContext>
  </StrictMode>,
)
