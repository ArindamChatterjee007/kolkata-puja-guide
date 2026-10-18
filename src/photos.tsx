import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/outfit/400.css'
import '@fontsource/outfit/500.css'
import '@fontsource/outfit/600.css'
import '@fontsource/noto-sans-bengali/400.css'
import '@fontsource/noto-sans-bengali/500.css'
import '@fontsource/noto-sans-bengali/600.css'
import './index.css'
import './photos.css'
import { PhotosApp } from './photos/PhotosApp'

createRoot(document.getElementById('photos-root')!).render(
  <StrictMode>
    <PhotosApp />
  </StrictMode>,
)
