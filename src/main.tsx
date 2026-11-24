import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
//import '@/app/styles/index.css'
import App from '@/app/App.tsx'
//import StressFlow from '@/exampleExperiments/StressFlow.tsx'

const isStrictMode = false

const reactNode : React.ReactNode = isStrictMode ? <StrictMode>
	{/*<StressFlow/>*/}
		<App />
	</StrictMode> : <App /> //<StressFlow/> //

createRoot(document.getElementById('root')!).render(
	reactNode,
)
