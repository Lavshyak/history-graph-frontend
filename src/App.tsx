import './App.css'
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {NodeDatasStateManagerContextWrapper} from "./components/wrappers/NodeDatasStateManagerContextWrapper.tsx";
import {EdgeDatasStateManagerContextWrapper} from "./components/wrappers/EdgeDatasStateManagerContextWrapper.tsx";
import AllViewXyflow from "./components/AllViewXyflow/AllViewXyflow.tsx";
import {GraphDataHasChangesContextWrapper} from "./components/wrappers/GraphDataHasChangesContextWrapper.tsx";


const queryClient = new QueryClient()

function App() {

    return (
        <QueryClientProvider client={queryClient}>
            <NodeDatasStateManagerContextWrapper>
                <EdgeDatasStateManagerContextWrapper>
                    <GraphDataHasChangesContextWrapper>
                        <AllViewXyflow/>
                    </GraphDataHasChangesContextWrapper>
                </EdgeDatasStateManagerContextWrapper>
            </NodeDatasStateManagerContextWrapper>
        </QueryClientProvider>
    )
}

export default App
