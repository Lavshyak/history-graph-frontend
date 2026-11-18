import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

const isStrictMode = true

const reactNode : React.ReactNode = isStrictMode ? <StrictMode>
		<App />
	</StrictMode> : <App />

createRoot(document.getElementById('root')!).render(
	reactNode,
)
