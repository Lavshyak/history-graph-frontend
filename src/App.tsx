import './App.css'
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import AllViewXyflow, {
    EdgeDatasStateManagerContextWrapper, GraphHasChangesContextWrapper,
    NodeDatasStateManagerContextWrapper
} from "./components/AllViewXyflow/AllViewXyflow.tsx";


const queryClient = new QueryClient()

function App() {

    return (
        <QueryClientProvider client={queryClient}>
            <NodeDatasStateManagerContextWrapper>
                <EdgeDatasStateManagerContextWrapper>
                    <GraphHasChangesContextWrapper>
                        <AllViewXyflow/>
                    </GraphHasChangesContextWrapper>
                </EdgeDatasStateManagerContextWrapper>
            </NodeDatasStateManagerContextWrapper>
        </QueryClientProvider>
    )
}

export default App
