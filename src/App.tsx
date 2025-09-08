/*import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'*/
import './App.css'
import AllViewAntdCharts from "./components/Trash/AllViewAntdCharts.tsx";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import AllViewXyflow from "./components/AllViewXyflow.tsx";
import Flow from "./components/Trash/EmptyViewXyflow.tsx";


const queryClient = new QueryClient()

function App() {
    //const [count, setCount] = useState(0)

    return (
        <QueryClientProvider client={queryClient}>
            {/*<AllViewAntdCharts/>*/}
            <AllViewXyflow/>
            {/*<Flow/>*/}
        </QueryClientProvider>
        /*<>
          <div>
            <a href="https://vite.dev" target="_blank">
              <img src={viteLogo} className="logo" alt="Vite logo" />
            </a>
            <a href="https://react.dev" target="_blank">
              <img src={reactLogo} className="logo react" alt="React logo" />
            </a>
          </div>
          <h1>Vite + React</h1>
          <div className="card">
            <button onClick={() => setCount((count) => count + 1)}>
              count is {count}
            </button>
            <p>
              Edit <code>src/App.tsx</code> and save to test HMR
            </p>
          </div>
          <p className="read-the-docs">
            Click on the Vite and React logos to learn more
          </p>
        </>*/
    )
}

export default App
