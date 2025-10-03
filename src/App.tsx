import './App.css'
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import AllViewXyflow from "./components/AllViewXyflow/AllViewXyflow.tsx";
import {EdgesAndNodesStatesContextWrapper} from "./components/EdgesAndNodesStatesContextWrapper.tsx";


const queryClient = new QueryClient()

function App() {

    return (
        <QueryClientProvider client={queryClient}>
            <EdgesAndNodesStatesContextWrapper>
                <AllViewXyflow/>
            </EdgesAndNodesStatesContextWrapper>
        </QueryClientProvider>
    )
}

export default App
