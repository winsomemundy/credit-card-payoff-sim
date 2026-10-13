import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import '@winsomemundy/design-system/tokens.css'
import '@winsomemundy/design-system/bundle.css'
import './theme.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
