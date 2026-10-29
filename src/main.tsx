import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import { AccountApp } from './components/AccountApp'

createRoot(document.getElementById('root')!).render(<StrictMode><AccountApp /></StrictMode>)
