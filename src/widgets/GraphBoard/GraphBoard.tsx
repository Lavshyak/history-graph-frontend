import * as React from 'react'
import {useCallback, useContext, useRef, useState} from 'react'
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
import { useStore } from 'zustand/react'
import { ContextMenu } from '@/widgets/ContextMenu/ContextMenu.tsx'
import '@/widgets/GraphBoard/graphBoard.css'
import sort from '@/shared/assets/sort.svg'
import sortGraph from '@/shared/assets/sortGraph.svg'
import SortAndSearchPanel from '@/widgets/SortAndSearchPanel/SortAndSearchPanel.tsx'

import {
	ControlButton,
	Controls,
	type FinalConnectionState,
	type NodeChangeset,
	type OnNodesChange,
	useReactFlow, ViewportPortal,
	type XYPosition,
} from '@xyflow/react'

import type { ContextMenuParams } from '@/widgets/ContextMenu/ContextMenuParams.ts'
import type { NodeDataIdType } from '@/model/node/nodeData.ts'
import type { XfNode } from '@/shared/types/xyflow.ts'
import { EdgeDatasStateManagerContext } from '@/model/graph/edgeDatasStateManagerContext.ts'
import { XfEdgesContext } from '@/model/graph/xfEdgesContext.ts'
import { EdgeLabelLayoutProvider } from '@/entities/EdgeLabelLayout/EdgeLabelLayoutProvider.tsx'
import { EditableContext } from '@/entities/EdgeLabelLayout/contexts.ts'
import { ForceRerenderContext } from '@/model/graph/forceRerenderContext.ts'
import { GraphDataHasChangesContext } from '@/model/graph/graphDataHasChangesContext.ts'
import { NodeDatasStateManagerContext } from '@/model/graph/nodeDatasStateManagerContext.ts'
import { useEventHandling } from '@/shared/hooks/useEventHandling.ts'
import { useGetHistoryGetall } from '@/api/generated/hooks/HistoryHooks/useGetHistoryGetall.ts'

import { useToggleStore } from '@/shared/UiStore/useToggleStore.ts'
import { prettifyGraph } from '@/model/graph/prettifyGraph.ts'
import GraphChangesSummary from '@/widgets/GraphChangesSummary/GraphChangesSummary.tsx'
import { useXfNodesLocalStore } from '@/widgets/GraphBoard/hooks/useXfNodesLocalState.ts'
import { useXfEdgesLocalState } from '@/widgets/GraphBoard/hooks/useXfEdgesLocalState.ts'
import { GraphFlowCanvas } from '@/widgets/GraphBoard/GraphFlowCanvas.tsx'
import { useOnNodeContextMenuCallback } from '@/widgets/GraphBoard/hooks/useOnNodeContextMenuCallback.ts'
import { useOnNodesChangeRaf } from '@/widgets/GraphBoard/hooks/useOnNodesChangeRaf.ts'
import { useInitializeEffect } from '@/widgets/GraphBoard/hooks/useInitializeEffect.ts'
import useRenderCountLogging from '@/shared/dev/useRenderCountLogging.ts'
import RenderCountView from '@/shared/dev/RenderCountView.tsx'
import {CombinedEdgesOur, EdgePathChangedEventContext} from "@/entities/CombinedEdgesOur.tsx";
import {createNormalEvent} from "@/shared/lib/events.ts";
import {type EdgePathChanging, EdgePathChangingNotifyContext, EdgePathPublishRequestContext} from "@/entities/FloatingEdge/FloatingEdge.tsx";

export function GraphBoard() {
	useRenderCountLogging('GraphBoard', true)

	const nodeDatasStateManager = useContext(NodeDatasStateManagerContext)
	const edgeDatasStateManager = useContext(EdgeDatasStateManagerContext)
	const graphHasChanges = useContext(GraphDataHasChangesContext)
	const { forceRerender } = useContext(ForceRerenderContext)

	const [isEditable, setIsEditable] = useState<boolean>(true)
	const [isNodeDragging, setIsNodeDragging] = useState(false)
	const [layoutRevision, setLayoutRevision] = useState(0)
	const { isOpenPanelSortAndSearch } = useToggleStore(state => state)
	const { toggleOpenPanelSearchAndSort, toggleSortGraph } = useToggleStore(
		state => state,
	)

	const recommendedNodePositionsOnAdd = useRef(
		new Map<NodeDataIdType, XYPosition>(),
	).current

	const xfNodesStore = useXfNodesLocalStore(
		recommendedNodePositionsOnAdd,
		nodeDatasStateManager,
	)
	const xfNodesCount = useStore(xfNodesStore, state => state.xfNodes.length)
	const addXfNode = useCallback(
		(nodeId: NodeDataIdType) => xfNodesStore.getState().addXfNode(nodeId),
		[xfNodesStore],
	)
	const applyXfNodeChanges = useCallback(
		(changes: NodeChangeset<XfNode>) =>
			xfNodesStore.getState().applyXfNodeChanges(changes),
		[xfNodesStore],
	)
	const setXfNodePositions = useCallback(
		(positions: ReadonlyMap<string, XYPosition>) =>
			xfNodesStore.getState().setXfNodePositions(positions),
		[xfNodesStore],
	)

	const { xfEdges, addXfEdge, removeXfEdge, applyXfEdgeChanges } =
		useXfEdgesLocalState(edgeDatasStateManager)

	const getAllQuery = useGetHistoryGetall()
	const reactFlowInstance = useReactFlow()

	const isInitialized = useRef(false)
	const sortLayoutRequestId = useRef(0)

	const onNodesChangeRaf = useOnNodesChangeRaf(applyXfNodeChanges)
	const onNodesChange = useCallback<OnNodesChange<XfNode>>(
		changes => {
			let dimensionsChanged = false
			for (const change of changes) {
				if (change.type === 'dimensions') dimensionsChanged = true
			}
			onNodesChangeRaf(changes)
			if (dimensionsChanged) {
				setLayoutRevision(revision => revision + 1)
			}
		},
		[onNodesChangeRaf],
	)
	const handleSortGraph = useCallback(async () => {
		const nextIsSortGraph = !useToggleStore.getState().isSortGraph
		toggleSortGraph(nextIsSortGraph)
		const requestId = ++sortLayoutRequestId.current

		const positions = await prettifyGraph(
			xfNodesStore.getState().xfNodes.map(node => node.id),
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
			setLayoutRevision(revision => revision + 1)
			void reactFlowInstance.fitView()
		})
	}, [
		toggleSortGraph,
		xfNodesStore,
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

	// Close the context menu if it's open whenever the window is clicked.
	const onPaneClick = useCallback(() => setMenu(null), [setMenu])
	const onNodeDragStart = useCallback(() => setIsNodeDragging(true), [])
	const onNodeDragStop = useCallback(() => setIsNodeDragging(false), [])

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

	const edgePathChangedEvent = useRef(createNormalEvent<EdgePathChanging>()).current
	const edgePathChangingNotify = useRef(edgePathChangedEvent.emit).current
	const edgePathPublishRequestEvent = useRef(createNormalEvent<void>()).current

	return (
		<Splitter
			className='all-view-splitter'
			style={{ boxShadow: '0 0 10px rgba(0, 0, 0, 0.1)' }}
		>
			<Splitter.Panel
				collapsible={{ start: true, end: true, showCollapsibleIcon: true }}
				min='20%'
				defaultSize='100%'
			>
				<div style={{}}>
					<RenderCountView />

					<Flex vertical>
						<div style={{ alignItems: 'stretch' }}>
							<div style={{ color: 'black', backgroundColor: 'white' }}>
								<div style={{ height: '70vh', width: '100%' }}>
									<EditableContext.Provider value={isEditable}>
										<EdgePathPublishRequestContext.Provider value={edgePathPublishRequestEvent}>
										<EdgePathChangingNotifyContext.Provider value={edgePathChangingNotify}>
										<EdgePathChangedEventContext.Provider value={edgePathChangedEvent}>
										<XfEdgesContext.Provider value={xfEdges}>
										<EdgeLabelLayoutProvider
											isNodeDragging={isNodeDragging}
											nodeCount={xfNodesCount}
											layoutRevision={layoutRevision}
										>
											<GraphFlowCanvas
												nodesStore={xfNodesStore}
												edges={xfEdges}
												flowRef={reactFlowComponentRef}
												flowProps={{
													onNodesChange,
													onNodeDragStart,
													onNodeDragStop,
													onEdgesChange: applyXfEdgeChanges,
													minZoom: 0.04,
													maxZoom: 3,
													fitView: true,
													onPaneContextMenu: onNodeContextMenu,
													onPaneClick,
													onConnectEnd,
													connectOnClick: false,
												}}
											>
												<ViewportPortal>
													<CombinedEdgesOur/>
												</ViewportPortal>
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
												{menu && (
													<ContextMenu
														onClick={onPaneClick}
														{...menu}
														onMouseLeave={() => setMenu(null)}
													/>
												)}
												{isOpenPanelSortAndSearch && <SortAndSearchPanel />}
											</GraphFlowCanvas>
										</EdgeLabelLayoutProvider>
										</XfEdgesContext.Provider>
										</EdgePathChangedEventContext.Provider>
										</EdgePathChangingNotifyContext.Provider>
										</EdgePathPublishRequestContext.Provider>
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
								Total nodes {xfNodesCount}, edges {xfEdges.length}
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
