import '@/app/styles/App.css'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactFlowProvider } from '@xyflow/react'
import { ForceRerenderProvider } from '@/app/providers/ForceRerenderProvider.tsx'
import { NodeDatasStateManagerProvider } from '@/app/providers/NodeDatasStateManagerProvider.tsx'
import { EdgeDatasStateManagerProvider } from '@/app/providers/EdgeDatasStateManagerProvider.tsx'
import { GraphDataHasChangesProvider } from '@/app/providers/GraphDataHasChangesProvider.tsx'
import { queryClient } from '@/app/query-client.ts'
import { GraphEditorPage } from '@/pages/GraphEditor/GraphEditorPage.tsx'
import useRenderCountLogging from "@/shared/dev/useRenderCountLogging.ts";

function App() {
	useRenderCountLogging('App', true)
	//const [pos, setPos] = useState(null)

	return (
		<ForceRerenderProvider>
			<QueryClientProvider client={queryClient}>
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

								<GraphEditorPage />
							</ReactFlowProvider>
						</GraphDataHasChangesProvider>
					</EdgeDatasStateManagerProvider>
				</NodeDatasStateManagerProvider>
			</QueryClientProvider>
		</ForceRerenderProvider>
	)
}

export default App
