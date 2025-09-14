import './App.css'
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import AllViewXyflow from "./components/AllViewXyflow/AllViewXyflow.tsx";


const queryClient = new QueryClient()

function App() {

    return (
        <QueryClientProvider client={queryClient}>
            <AllViewXyflow/>
        </QueryClientProvider>
    )
}

export default App
