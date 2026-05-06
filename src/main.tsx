import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

if ('__TAURI_INTERNALS__' in window) {
  import('@/services/seed-products')
    .then(({ seedProducts }) => seedProducts())
    .then((rows) => console.log('Seeded products:', rows.length))
    .catch(console.error)
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
