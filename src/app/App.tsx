import '@/app/styles/App.css'
import {QueryClientProvider} from '@tanstack/react-query'
import {ReactFlowProvider} from '@xyflow/react'
import {ForceRerenderProvider} from '@/app/providers/ForceRerenderProvider.tsx'
import {NodeDatasStateManagerProvider} from '@/app/providers/NodeDatasStateManagerProvider.tsx'
import {EdgeDatasStateManagerProvider} from '@/app/providers/EdgeDatasStateManagerProvider.tsx'
import {GraphDataHasChangesProvider} from '@/app/providers/GraphDataHasChangesProvider.tsx'
import {queryClient} from '@/app/query-client.ts'
import {GraphEditorPage} from '@/pages/GraphEditor/GraphEditorPage.tsx'
import useRenderCountLogging from "@/shared/dev/useRenderCountLogging.ts";
import {useMemo} from "react";
import {InitGenContext as InitGenContext1, type InitGenContextNotUndefinedValueType} from "@/app/InitGenContext.ts";



function App() {
    useRenderCountLogging('App', false)
    //const [pos, setPos] = useState(null)

    const initGenContextValue = useMemo<InitGenContextNotUndefinedValueType|undefined>(() => {
        const pathname = window.location.pathname; // /products
        if (pathname === "/gen") {
            const params = new URLSearchParams(window.location.search)
            const sort = (() => {
                const raw = params.get("sort")
                if (!raw || raw === 'x' || raw === 'p')
                    return 'prettify'
                if (raw === 'desc')
                    return 'desc'
                throw new Error("invalid value of sort URL param")
            })()

            const getCount = (paramName: string) => {
                const raw = params.get(paramName)
                if (!raw) return 0
                const parsed = Number.parseInt(raw)
                if (!parsed || Number.isNaN(parsed) || parsed < 0 || parsed > 100000) throw new Error("invalid value of n URL param")
                return parsed
            }

            const cn = getCount("cn")
            const ce = getCount("ce")
            const sn = getCount("sn")
            const se = getCount("se")

            return {
                sort: sort,
                createdNodesCount: cn,
                createdEdgesCount: ce,
                sourceNodesCount: sn,
                sourceEdgesCount: se,
            }
        } else {
            return undefined
        }
    }, [])


    return (
        <ForceRerenderProvider>
            <QueryClientProvider client={queryClient}>
                <InitGenContext1 value={initGenContextValue}>
                    <NodeDatasStateManagerProvider>
                        <EdgeDatasStateManagerProvider>
                            <GraphDataHasChangesProvider>
                                <ReactFlowProvider>
                                    {/*<div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: '100%', height: '100%' }}>
                                {JSON.stringify(pos)}
                                <div style={{backgroundColor: 'white', width: '90%', height: '90%', alignSelf: 'center'}} onClick={(event)=>{
                                    setPos({l: event.clientX, t: event.clientY})
                                }}>
                                    {pos != null && <div style={{backgroundColor: 'red', position: 'absolute', left: pos.l, top: pos.t, width: '1rem', height: '1rem'}}></div>}
                                </div>
                            </div>*/}

                                    <GraphEditorPage/>
                                </ReactFlowProvider>
                            </GraphDataHasChangesProvider>
                        </EdgeDatasStateManagerProvider>
                    </NodeDatasStateManagerProvider>
                </InitGenContext1>
            </QueryClientProvider>
        </ForceRerenderProvider>
    )
}

export default App
