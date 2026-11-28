import {StrictMode} from 'react'
import {createRoot} from 'react-dom/client'
//import '@/app/styles/index.css'
//import App from '@/app/App.tsx'
//import StressFlow from '@/exampleExperiments/StressFlow.tsx'

const isReactFlowExample = false

const isStrictMode = false

const AppElement1 = await (async () => {
    if (isReactFlowExample) {
        const module = await import('@/exampleExperiments/StressFlow.tsx');
        return module.default;
    } else {
        const module = await import('@/app/App.tsx');
        return module.default;
    }
})()

const appElement2 = isStrictMode ? <StrictMode>
    <AppElement1/>
</StrictMode> : <AppElement1/>

createRoot(document.getElementById('root')!).render(
    appElement2,
)
