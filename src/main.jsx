import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

const rootElement = document.getElementById('root')

if (rootElement && !document.getElementById('bg-blobs')) {
  const bgBlobs = document.createElement('div')
  bgBlobs.id = 'bg-blobs'

  for (let index = 0; index < 5; index += 1) {
    const blob = document.createElement('div')
    blob.className = `bg-blob bg-blob-${index + 1}`
    bgBlobs.appendChild(blob)
  }

  rootElement.parentNode?.insertBefore(bgBlobs, rootElement)
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
