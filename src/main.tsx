import React from 'react'
import ReactDOM from 'react-dom/client'
import './i18n'  // Import i18n configuration before App
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
