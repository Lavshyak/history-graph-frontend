import * as React from 'react'
import {memo, useCallback, useContext, useRef, useState} from 'react'
import '@xyflow/react/dist/style.css'
import {Button, Divider, Flex, Space, Splitter, Switch} from 'antd'
import {ContextMenu} from '../../createNode/components/ContextMenu.tsx'
import "./AllViewXyflow.css";
import sort from '../../../assets/sort.svg'
import PanelForSortAndSearch from '../../PanelForSortAndSearch/components/PanelForSortAndSearch.tsx'

import {
    Background,
    ControlButton,
    Controls,
    type FinalConnectionState,
    MarkerType,
    ReactFlow,
    useReactFlow,
    type Viewport,
    type XYPosition,
} from '@xyflow/react'

import type {ContextMenuParams, NodeDataIdType, XfEdge, XfNode,} from '../../index.ts'
import {
    CustomConnectionLine,
    EdgeDatasStateManagerContext,
    EdgeLabelLayoutProvider,
    EditableContext,
    EventNode,
    FloatingEdge,
    ForceRerenderContext,
    GraphDataHasChangesContext,
    NodeDatasStateManagerContext,
    useEventHandling,
    useGetHistoryGetall,
} from '../../index.ts'

import { useToggleStore } from '../../../store/toggleState.ts'
import GraphChangesSummaryView from '../../GraphChangesSummaryView/GraphChangesSummaryView.tsx'
import { useXfNodesLocalState } from '../hooks/UseXfNodesLocalState.tsx'
import { useXfEdgesLocalState } from '../hooks/UseXfEdgesLocalState.tsx'
import { useOnNodeContextMenuCallback } from '../hooks/UseOnNodeContextMenuCallback.tsx'
import { useOnNodesChangeRaf } from '../hooks/UseOnNodesChangeRaf.tsx'
import { useInitializeEffect } from '../hooks/UseInitializeEffect.tsx'
import useRenderCountLogging from '../../../devOnly/useRenderCountLogging.tsx'
import RenderCountView from '../../../devOnly/RenderCountView.tsx'
import devInvokeIfDevLoggingEnabled from '../../../devOnly/devInvokeIfDevLoggingEnabled.ts'

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

function AllViewXyflow() {

    useRenderCountLogging("AllViewXyflow")

    const nodeDatasStateManager = useContext(NodeDatasStateManagerContext)
    const edgeDatasStateManager = useContext(EdgeDatasStateManagerContext)
    const graphHasChanges = useContext(GraphDataHasChangesContext)
    const {forceRerender} = useContext(ForceRerenderContext)

    const [isEditable, setIsEditable] = useState<boolean>(true)
    const isOpenPanelSortAndSearch = useToggleStore(
        state => state.isOpenPanelSortAndSearch,
    )
    const toggleOpenPanelSearchAndSort = useToggleStore(
        state => state.toggleOpenPanelSearchAndSort,
    )

    const recommendedNodePositionsOnAdd = useRef(
        new Map<NodeDataIdType, XYPosition>(),
    ).current

    const {
        xfNodes,
        addXfNode,
        applyXfNodeChanges
    } = useXfNodesLocalState(recommendedNodePositionsOnAdd, nodeDatasStateManager);

    const {xfEdges, addXfEdge, removeXfEdge, applyXfEdgeChanges} = useXfEdgesLocalState(edgeDatasStateManager)


    const getAllQuery = useGetHistoryGetall()

    const isInitialized = useRef(false)

    const onNodesChangeRaf = useOnNodesChangeRaf(applyXfNodeChanges)

    const reactFlowInstance = useReactFlow()
    const [viewport, setViewport] = useState<Viewport>({x: 0, y: 0, zoom: 1})
    const reactFlowComponentRef = useRef<HTMLDivElement>(null)
    const [menu, setMenu] = useState<ContextMenuParams | null>(null)
    const onNodeContextMenu = useOnNodeContextMenuCallback(
        reactFlowComponentRef, reactFlowInstance,
        viewport, setMenu)

    // Close the context menu if it's open whenever the window is clicked.
    const onPaneClick = useCallback(() => setMenu(null), [setMenu])

    useEventHandling(
        nodeDatasStateManager.nodesStateEvents.nodeAddedEvent,
        ({nodeDataId}) => {
            addXfNode(nodeDataId)
        },
    )

    useEventHandling(
        edgeDatasStateManager.edgesStateEvents.edgeAddedEvent,
        ({edgeDataId}) => {
            addXfEdge(edgeDataId)
        },
    )

    useInitializeEffect(isInitialized, getAllQuery,
        recommendedNodePositionsOnAdd,
        nodeDatasStateManager, edgeDatasStateManager)

    devInvokeIfDevLoggingEnabled(()=> console.log('viewport:', viewport));

    return (
        <Splitter className="all-view-splitter" style={{boxShadow: '0 0 10px rgba(0, 0, 0, 0.1)'}}>
            <Splitter.Panel collapsible={{start: true, end: true, showCollapsibleIcon: true}} min="20%"
                            defaultSize="80%">
                <div style={{}}>
                    <RenderCountView/>

                    <Flex vertical style={{alignItems: 'center'}}>
                        <div style={{alignItems: 'stretch'}}>
                            <div
                                style={{color: 'black', backgroundColor: 'white'}}
                            >
                                <div style={{height: '70vh', width: "100%"}}>
                                    <EditableContext.Provider value={isEditable}>
                                        <EdgeLabelLayoutProvider>
                                            <ReactFlow
                                                ref={reactFlowComponentRef}
                                                viewport={viewport}
                                                onViewportChange={v => setViewport(v)}
                                                nodes={xfNodes as XfNode[]}
                                                edges={xfEdges as XfEdge[]}
                                                onNodesChange={onNodesChangeRaf}
                                                onEdgesChange={applyXfEdgeChanges}
                                                fitView
                                                nodeTypes={nodeTypesForXyflow}
                                                edgeTypes={edgeTypes}
                                                defaultEdgeOptions={defaultEdgeOptions}
                                                connectionLineComponent={CustomConnectionLine}
                                                connectionLineStyle={connectionLineStyle}
                                                onPaneContextMenu={onNodeContextMenu}
                                                onPaneClick={onPaneClick}
                                                onConnectEnd={(
                                                    event: MouseEvent | TouchEvent,
                                                    connectionState: FinalConnectionState,
                                                ) => {
                                                    console.log('connectionState', connectionState)
                                                    if (connectionState.fromNode && connectionState.toNode) {
                                                        /*queueMicrotask(()=> {*/
                                                        edgeDatasStateManager.addEdgeFromCreated({
                                                            id: crypto.randomUUID(),
                                                            label: 'not defined',
                                                            fromId: connectionState.fromNode.id,
                                                            toId: connectionState.toNode.id,
                                                        })
                                                        /*});*/
                                                    }
                                                }}
                                                connectOnClick={false}
                                            >
                                                <RenderCountView/>
                                                {JSON.stringify(viewport)}
                                                <Controls showInteractive={true}>
                                                    <ControlButton
                                                        title='Sort'
                                                        onClick={() =>
                                                            toggleOpenPanelSearchAndSort(
                                                                !isOpenPanelSortAndSearch,
                                                            )
                                                        }
                                                    >
                                                        <img src={sort} alt='sort' width={16}/>
                                                    </ControlButton>
                                                </Controls>
                                                <Background/>
                                                {menu && (
                                                    <ContextMenu
                                                        onClick={onPaneClick}
                                                        {...menu}
                                                        onMouseLeave={() => setMenu(null)}
                                                    />
                                                )}
                                                {isOpenPanelSortAndSearch && <PanelForSortAndSearch/>}
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
                            <div>{JSON.stringify(xfEdges)}</div>
                            <Divider style={{borderColor: 'green'}}/>
                            <Divider style={{borderColor: 'green'}}/>
                            <Divider style={{borderColor: 'green'}}/>
                            <button
                                onClick={() =>
                                    getAllQuery.refetch().then(() => console.log('refetched'))
                                }
                            >
                                update
                            </button>
                            <button onClick={() => forceRerender()}>force rerender</button>
                            <RenderCountView/>
                        </div>
                    </Flex>
                </div>
            </Splitter.Panel>
            <Splitter.Panel collapsible>
                <RenderCountView/>
                <GraphChangesSummaryView/>
            </Splitter.Panel>
        </Splitter>
    )
}

export default AllViewXyflow
