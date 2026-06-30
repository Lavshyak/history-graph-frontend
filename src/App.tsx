import './App.css'
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {NodeDatasStateManagerContextWrapper} from "./components/wrappers/NodeDatasStateManagerContextWrapper.tsx";
import {EdgeDatasStateManagerContextWrapper} from "./components/wrappers/EdgeDatasStateManagerContextWrapper.tsx";
import AllViewXyflow from "./components/AllViewXyflow/AllViewXyflow.tsx";
import {GraphDataHasChangesContextWrapper} from "./components/wrappers/GraphDataHasChangesContextWrapper.tsx";
import {ReactFlowProvider} from "@xyflow/react";
//import {useState} from "react";


const queryClient = new QueryClient()

function App() {
    //const [pos, setPos] = useState(null)

    return (
        <QueryClientProvider client={queryClient}>
            <NodeDatasStateManagerContextWrapper>
                <EdgeDatasStateManagerContextWrapper>
                    <GraphDataHasChangesContextWrapper>
                        <ReactFlowProvider>
                            {/*<div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: '100%', height: '100%' }}>
                                {JSON.stringify(pos)}
                                <div style={{backgroundColor: 'white', width: '90%', height: '90%', alignSelf: 'center'}} onClick={(event)=>{
                                    setPos({l: event.clientX, t: event.clientY})
                                }}>
                                    {pos != null && <div style={{backgroundColor: 'red', position: 'absolute', left: pos.l, top: pos.t, width: '1rem', height: '1rem'}}></div>}
                                </div>
                            </div>*/}

                            <AllViewXyflow/>
                        </ReactFlowProvider>
                    </GraphDataHasChangesContextWrapper>
                </EdgeDatasStateManagerContextWrapper>
            </NodeDatasStateManagerContextWrapper>
        </QueryClientProvider>
    )
}

export default App
