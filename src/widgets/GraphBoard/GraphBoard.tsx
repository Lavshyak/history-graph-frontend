import * as React from 'react'
import { useCallback, useContext, useRef, useState } from 'react'
import '@xyflow/react/dist/style.css'
import {
	Button,
	Divider,
	Flex,
	Space,
	Splitter,
	Switch,
	Typography,
} from 'antd'
import { ContextMenu } from '@/widgets/ContextMenu/ContextMenu.tsx'
import '@/widgets/GraphBoard/graphBoard.css'
import sort from '@/shared/assets/sort.svg'
import sortGraph from '@/shared/assets/sortGraph.svg'
import SortAndSearchPanel from '@/widgets/SortAndSearchPanel/SortAndSearchPanel.tsx'

import {
	Background,
	ControlButton,
	Controls,
	type FinalConnectionState,
	MarkerType,
	ReactFlow,
	useReactFlow,
	type XYPosition,
} from '@xyflow/react'

import type { ContextMenuParams } from '@/widgets/ContextMenu/ContextMenuParams.ts'
import type { NodeDataIdType } from '@/model/node/nodeData.ts'
import type { XfEdge, XfNode } from '@/shared/types/xyflow.ts'
import ConnectionLine from '@/entities/ConnectionLine/ConnectionLine.tsx'
import { EdgeDatasStateManagerContext } from '@/model/graph/edgeDatasStateManagerContext.ts'
import { EdgeLabelLayoutProvider } from '@/entities/EdgeLabelLayout/EdgeLabelLayoutProvider.tsx'
import { EditableContext } from '@/entities/EdgeLabelLayout/contexts.ts'
import { EventNode } from '@/entities/EventNode/EventNode.tsx'
import FloatingEdge from '@/entities/FloatingEdge/FloatingEdge.tsx'
import { ForceRerenderContext } from '@/model/graph/forceRerenderContext.ts'
import { GraphDataHasChangesContext } from '@/model/graph/graphDataHasChangesContext.ts'
import { NodeDatasStateManagerContext } from '@/model/graph/nodeDatasStateManagerContext.ts'
import { useEventHandling } from '@/shared/hooks/useEventHandling.ts'
import { useGetHistoryGetall } from '@/api/generated/hooks/HistoryHooks/useGetHistoryGetall.ts'

import { useToggleStore } from '@/shared/UiStore/useToggleStore.ts'
import { prettifyGraph } from '@/model/graph/prettifyGraph.ts'
import GraphChangesSummary from '@/widgets/GraphChangesSummary/GraphChangesSummary.tsx'
import { useXfNodesLocalState } from '@/widgets/GraphBoard/hooks/useXfNodesLocalState.ts'
import { useXfEdgesLocalState } from '@/widgets/GraphBoard/hooks/useXfEdgesLocalState.ts'
import { useOnNodeContextMenuCallback } from '@/widgets/GraphBoard/hooks/useOnNodeContextMenuCallback.ts'
import { useOnNodesChangeRaf } from '@/widgets/GraphBoard/hooks/useOnNodesChangeRaf.ts'
import { useRafThrottledPan } from '@/widgets/GraphBoard/hooks/useRafThrottledPan.ts'
import { useInitializeEffect } from '@/widgets/GraphBoard/hooks/useInitializeEffect.ts'
import useRenderCountLogging from '@/shared/dev/useRenderCountLogging.ts'
import RenderCountView from '@/shared/dev/RenderCountView.tsx'

const connectionLineStyle = {
	stroke: '#b1b1b7',
}

const nodeTypesForXyflow = {
	EventNode: EventNode,
}

const edgeTypes = {
	FloatingEdge: FloatingEdge,
}

const defaultEdgeOptions = {
	markerEnd: {
		type: MarkerType.ArrowClosed,
		color: '#b1b1b7',
	},
}

export function GraphBoard() {
	useRenderCountLogging('GraphBoard')

	const nodeDatasStateManager = useContext(NodeDatasStateManagerContext)
	const edgeDatasStateManager = useContext(EdgeDatasStateManagerContext)
	const graphHasChanges = useContext(GraphDataHasChangesContext)
	const { forceRerender } = useContext(ForceRerenderContext)

	const [isEditable, setIsEditable] = useState<boolean>(true)
	const { isOpenPanelSortAndSearch } = useToggleStore(state => state)
	const { toggleOpenPanelSearchAndSort, toggleSortGraph } = useToggleStore(
		state => state,
	)

	const recommendedNodePositionsOnAdd = useRef(
		new Map<NodeDataIdType, XYPosition>(),
	).current

	const {
		xfNodes,
		addXfNode,
		applyXfNodeChanges,
		setXfNodePositions,
	} = useXfNodesLocalState(recommendedNodePositionsOnAdd, nodeDatasStateManager)

	const { xfEdges, addXfEdge, removeXfEdge, applyXfEdgeChanges } =
		useXfEdgesLocalState(edgeDatasStateManager)

	const getAllQuery = useGetHistoryGetall()
	const reactFlowInstance = useReactFlow()

	const isInitialized = useRef(false)
	const sortLayoutRequestId = useRef(0)

	const onNodesChangeRaf = useOnNodesChangeRaf(applyXfNodeChanges)
	const handleSortGraph = useCallback(async () => {
		const nextIsSortGraph = !useToggleStore.getState().isSortGraph
		toggleSortGraph(nextIsSortGraph)
		const requestId = ++sortLayoutRequestId.current

		const positions = await prettifyGraph(
			xfNodes.map(node => node.id),
			xfEdges.map(edge => ({
				id: edge.id,
				source: edge.source,
				target: edge.target,
			})),
			nextIsSortGraph,
		)

		if (requestId !== sortLayoutRequestId.current) return
		setXfNodePositions(
			new Map(
				positions.map(({ nodeId, position }) => [nodeId, position] as const),
			),
		)
		requestAnimationFrame(() => {
			void reactFlowInstance.fitView()
		})
	}, [
		toggleSortGraph,
		xfNodes,
		xfEdges,
		setXfNodePositions,
		reactFlowInstance,
	])

	const reactFlowComponentRef = useRef<HTMLDivElement>(null)
	const [menu, setMenu] = useState<ContextMenuParams | null>(null)
	const onNodeContextMenu = useOnNodeContextMenuCallback(
		reactFlowComponentRef,
		reactFlowInstance,
		setMenu,
	)

	// Свой пан вместо встроенного (panOnDrag={false}): xyflow обновляет стор на
	// каждое событие мыши, что на тысячах связей вешает главный поток на
	// быстром движении. Здесь вьюпорт применяется раз в кадр.
	useRafThrottledPan(reactFlowComponentRef)

	// Close the context menu if it's open whenever the window is clicked.
	const onPaneClick = useCallback(() => setMenu(null), [setMenu])

	useEventHandling(
		nodeDatasStateManager.nodesStateEvents.nodeAddedEvent,
		({ nodeDataId }) => {
			addXfNode(nodeDataId)
		},
	)

	useEventHandling(
		edgeDatasStateManager.edgesStateEvents.edgeAddedEvent,
		({ edgeDataId }) => {
			addXfEdge(edgeDataId)
		},
	)

	useEventHandling(
		edgeDatasStateManager.edgesStateEvents.edgeRemovedEvent,
		({ edgeDataId }) => {
			removeXfEdge(edgeDataId)
		},
	)

	const reactFlowInstanceRef = useRef(reactFlowInstance)
	reactFlowInstanceRef.current = reactFlowInstance
	const fitView = () => reactFlowInstanceRef.current.fitView()
	useInitializeEffect(
		isInitialized,
		getAllQuery,
		recommendedNodePositionsOnAdd,
		nodeDatasStateManager,
		edgeDatasStateManager,
		fitView,
	)

	const onConnectEnd = useCallback(
		(event: MouseEvent | TouchEvent, connectionState: FinalConnectionState) => {
			if (connectionState.fromNode && connectionState.toNode) {
				edgeDatasStateManager.addEdgeFromCreated({
					id: crypto.randomUUID(),
					label: 'not defined',
					fromId: connectionState.fromNode.id,
					toId: connectionState.toNode.id,
				})
			}
		},
		[edgeDatasStateManager],
	)

	return (
		<Splitter
			className='all-view-splitter'
			style={{ boxShadow: '0 0 10px rgba(0, 0, 0, 0.1)' }}
		>
			<Splitter.Panel
				collapsible={{ start: true, end: true, showCollapsibleIcon: true }}
				min='20%'
				defaultSize='80%'
			>
				<div style={{}}>
					<RenderCountView />

					<Flex vertical>
						<div style={{ alignItems: 'stretch' }}>
							<div style={{ color: 'black', backgroundColor: 'white' }}>
								<div style={{ height: '70vh', width: '100%' }}>
									<EditableContext.Provider value={isEditable}>
										<EdgeLabelLayoutProvider>
											<ReactFlow
												ref={reactFlowComponentRef}
												nodes={xfNodes as XfNode[]}
												edges={xfEdges as XfEdge[]}
												onNodesChange={onNodesChangeRaf}
												onEdgesChange={applyXfEdgeChanges}
												minZoom={0.04} // максимальное отдаление
												maxZoom={3} // максимальное приближение
												fitView
												nodeTypes={nodeTypesForXyflow}
												edgeTypes={edgeTypes}
												defaultEdgeOptions={defaultEdgeOptions}
												connectionLineComponent={ConnectionLine}
												connectionLineStyle={connectionLineStyle}
												onPaneContextMenu={onNodeContextMenu}
												onPaneClick={onPaneClick}
												// Панорамируем сами, по кадрам (useRafThrottledPan).
												panOnDrag={false}
												onConnectEnd={onConnectEnd}
												connectOnClick={false}
											>
												<RenderCountView />
												<Controls showInteractive={true}>
													<ControlButton
														title='Sort'
														onClick={() =>
															toggleOpenPanelSearchAndSort(
																!isOpenPanelSortAndSearch,
															)
														}
													>
														<img src={sort} alt='sort' width={16} />
													</ControlButton>
													<ControlButton
														title='Sort'
														onClick={handleSortGraph}
													>
														<img src={sortGraph} alt='sortGraph' width={16} />
													</ControlButton>
												</Controls>
												<Background />
												{menu && (
													<ContextMenu
														onClick={onPaneClick}
														{...menu}
														onMouseLeave={() => setMenu(null)}
													/>
												)}
												{isOpenPanelSortAndSearch && <SortAndSearchPanel />}
											</ReactFlow>
										</EdgeLabelLayoutProvider>
									</EditableContext.Provider>
								</div>
							</div>
							<div
								style={{
									backgroundColor: 'white',
									color: 'black',
									position: 'relative',
									left: 0,
									borderTop: '1px solid black',
									padding: '10px',
								}}
							>
								<Space size={50}>
									<div>
										editable:{' '}
										<Switch
											onChange={checked => {
												setIsEditable(checked)
											}}
											checked={isEditable}
										/>
									</div>
									<Button disabled={!graphHasChanges || !isEditable}>
										push changes
									</Button>
								</Space>
							</div>
							<Divider style={{ borderColor: 'green' }} />
							<div style={{ color: 'white' }}>
								Total nodes {xfNodes.length}, edges {xfEdges.length}
							</div>
							<Divider style={{ borderColor: 'green' }} />
							<Divider style={{ borderColor: 'green' }} />
							<button
								onClick={() =>
									getAllQuery.refetch().then(() => console.log('refetched'))
								}
							>
								update
							</button>
							<button onClick={() => forceRerender()}>force rerender</button>
							<RenderCountView />
						</div>
					</Flex>
				</div>
			</Splitter.Panel>
			<Splitter.Panel collapsible>
				<RenderCountView />
				<GraphChangesSummary />
			</Splitter.Panel>
		</Splitter>
	)
}

export default GraphBoard
