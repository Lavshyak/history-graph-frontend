import {useGetHistoryGetall} from "../../gen";
import {createContext, useEffect, useRef, useState} from "react";
import "@xyflow/react/dist/style.css";
import {Button, Divider, Flex, Space, Switch} from "antd";
import {EventNode} from "./EventNode.tsx";
import type {XfEdge, XfNode} from "./XyFlowTypeAliases.ts";
import {devDtoEventsAndRelationshipsMock} from "../dev.ts";
import CustomConnectionLine from "./CustomConnectionLine.tsx";
import {EditableContext} from "./Contexts.ts";
import {
    MarkerType,
    type NodeChange,
    ReactFlow,
    Controls,
    Background, applyNodeChanges, type EdgeChange, applyEdgeChanges, type XYPosition
} from "@xyflow/react";
import FloatingEdge from "./FloatingEdge.tsx";
import type {NodeDataIdType, NodeSourceData} from "../../types/NodeData.ts";
import type {EdgeDataIdType, EdgeSourceData} from "../../types/EdgeData.ts";
import {createNodeDatasStateManager, type NodeDatasStateManager} from "../../coolerState/coolerNodesState.ts";
import {createEdgeDatasStateManager, type EdgeDatasStateManager} from "../../coolerState/coolerEdgesState.ts";
import {createNormalEvent, createNormalKeyedEvent} from "../../lib/event/event.ts";
import {useStore} from "zustand/react";
import {createStore, type StateCreator} from "zustand/vanilla";
import {useEventHandling} from "../../lib/event/useEventHandling.ts";

import {prettifyGraph3} from "./prettifyGraph3.ts";

const nodeTypesForXyflow = {
    EventNode: EventNode,
};

const connectionLineStyle = {
    stroke: '#b1b1b7',
};

const edgeTypes = {
    FloatingEdge: FloatingEdge,
};

const defaultEdgeOptions = {
    /*type: 'FloatingEdge',*/
    markerEnd: {
        type: MarkerType.ArrowClosed,
        color: '#b1b1b7',
    },
};

function useLocalState<StateT>(initializer: StateCreator<StateT, [], [], StateT>) : StateT {
    const storeRef = useRef(createStore<StateT>(initializer))
    return useStore(storeRef.current)
}

export const NodeDatasStateManagerContext = createContext<NodeDatasStateManager>({
    allNodeDatasMap: new Map(),
    markedForDeleteNodeDataIdsSet: new Set(),
    nodesStateEvents: {
        nodeDataUpdatedEvent: createNormalKeyedEvent(),
        nodeAddedEvent: createNormalEvent()
    },
    updatedNodeDataIdsSet: new Set(),
    addNodeFromSource(): void {
    },
    markNodeForDelete(): void {
    },
    updateNodeData(): void {
    }
})

export const EdgeDatasStateManagerContext = createContext<EdgeDatasStateManager>({
    allEdgeDatasMap: new Map(),
    edgesStateEvents: {
        edgeDataUpdatedEvent: createNormalKeyedEvent(),
        edgeAddedEvent: createNormalEvent(),
        edgeRemovedEvent: createNormalEvent()
    },
    updatedEdgeDataIdsSet: new Set(),
    addEdgeFromSource(): void {
    },
    markEdgeForDelete(): void {
    },
    updateEdgeData(): void {
    }

})

function AllViewXyflow() {
    const [isEditable, setIsEditable] = useState<boolean>(true);
    const [hasChanges, setHasChanges] = useState<boolean>(false);

    const nodeDatasStateManager = useRef(createNodeDatasStateManager()).current

    const edgeDatasStateManager = useRef(
        (() => {
            const nodeMarkedForDeleteEvent = createNormalEvent<{
                nodeId: NodeDataIdType,
                markedForDeleteState: boolean
            }>()
            nodeDatasStateManager.nodesStateEvents.nodeDataUpdatedEvent.on(({oldNodeData, newNodeData}) => {
                if (oldNodeData.isExplicitlyMarkedForDelete !== newNodeData.isExplicitlyMarkedForDelete) {
                    nodeMarkedForDeleteEvent.emit({
                        nodeId: newNodeData.sourceData.id,
                        markedForDeleteState: newNodeData.isExplicitlyMarkedForDelete
                    })
                }
            })

            const nodeRemovedEvent = createNormalEvent<{ nodeId: NodeDataIdType }>()

            return createEdgeDatasStateManager(nodeMarkedForDeleteEvent, nodeRemovedEvent)
        })()
    ).current

    useEventHandling(nodeDatasStateManager.nodesStateEvents.nodeDataUpdatedEvent, () => {
        if (nodeDatasStateManager.updatedNodeDataIdsSet.size > 0 || edgeDatasStateManager.updatedEdgeDataIdsSet.size > 0) {
            setHasChanges(true)
        } else {
            setHasChanges(false)
        }
    })
    useEventHandling(edgeDatasStateManager.edgesStateEvents.edgeDataUpdatedEvent, () => {
        if (nodeDatasStateManager.updatedNodeDataIdsSet.size > 0 || edgeDatasStateManager.updatedEdgeDataIdsSet.size > 0) {
            setHasChanges(true)
        } else {
            setHasChanges(false)
        }
    })

    const recommendedNodePositionsOnAdd = useRef(new Map<NodeDataIdType, XYPosition>()).current

    const {xfNodes, addXfNode, removeXfNode/*, changeXfNodePosition*/, applyXfNodeChanges} = useLocalState<{
        xfNodes: XfNode[]
        addXfNode(nodeId: NodeDataIdType): void
        removeXfNode(nodeId: NodeDataIdType): void
        /*changeXfNodePosition(nodePositionChange: NodePositionChange): void*/
        applyXfNodeChanges(nodeChanges: NodeChange<XfNode>[]) : void
    }>((set, get) => ({
        xfNodes: [] as XfNode[],
        addXfNode(nodeId: NodeDataIdType) {
            const position = recommendedNodePositionsOnAdd.get(nodeId) ?? {x: 0, y: 0}

            set((state) => ({
                xfNodes: [...state.xfNodes, {id: nodeId, data: {}, position: position, type: 'EventNode'}],
            }))
        },
        removeXfNode(nodeId: NodeDataIdType) {
            set((state) => ({
                xfNodes: state.xfNodes.filter(x => x.id !== nodeId)
            }))
        },
        /*changeXfNodePosition({type:_, ...nodePositionChange}: NodePositionChange) {
            set((state) => {
                const idx = state.xfNodes.findIndex(xfNode => xfNode.id === nodePositionChange.id)
                if (idx === -1) throw new Error(`node not found in xfNodes with id ${nodePositionChange.id}`)

                const oldNode = state.xfNodes[idx]
                const newNode: XfNode = {
                    ...oldNode,
                    ...nodePositionChange
                }

                const newXfNodes = [...state.xfNodes]
                newXfNodes[idx] = newNode

                return {
                    xfNodes: newXfNodes,
                }
            })
        },*/
        applyXfNodeChanges(nodeChanges: NodeChange<XfNode>[]) {
            const currentNodes = get().xfNodes
            const newNodes = applyNodeChanges(nodeChanges, currentNodes)
            set({
                xfNodes: newNodes
            })
        }
    }))

    useEventHandling(nodeDatasStateManager.nodesStateEvents.nodeAddedEvent, ({nodeDataId}) => {
        addXfNode(nodeDataId)
    })

    const {xfEdges, addXfEdge, removeXfEdge, applyXfEdgeChanges} = useLocalState<{
        xfEdges: XfEdge[]
        addXfEdge(edgeId: EdgeDataIdType): void
        removeXfEdge(edgeId: EdgeDataIdType): void,
        applyXfEdgeChanges(changes: EdgeChange<XfEdge>[]): void
    }>((set, get) => ({
        xfEdges: [] as XfEdge[],
        addXfEdge(edgeId: EdgeDataIdType) {
            set((state) => {
                const edgeData = edgeDatasStateManager.allEdgeDatasMap.get(edgeId)
                if (!edgeData) throw new Error(`edgeData not found for edgeId ${edgeId}`)
                return {
                    xfEdges: [...state.xfEdges, {
                        id: edgeId,
                        source: edgeData.sourceData.id,
                        target: edgeData.sourceData.id,
                        type: 'FloatingEdge'
                    }],
                }
            })
        },
        removeXfEdge(edgeId: EdgeDataIdType) {
            set((state) => ({
                xfEdges: state.xfEdges.filter(x => x.id !== edgeId)
            }))
        },
        applyXfEdgeChanges(changes: EdgeChange<XfEdge>[]){
            const currentEdges = get().xfEdges
            const newEdges = applyEdgeChanges(changes, currentEdges)
            set({
                xfEdges: newEdges
            })
        }
    }))

    useEventHandling(edgeDatasStateManager.edgesStateEvents.edgeAddedEvent, ({edgeDataId}) => {
        addXfEdge(edgeDataId)
    })

    const getAllQuery = useGetHistoryGetall();



    const initialized = useRef(false)
    useEffect(() => {
        if (initialized.current)
            return;
        initialized.current = true;

        const rawData = getAllQuery.data?.data ?? devDtoEventsAndRelationshipsMock

        if (!rawData.events.length) return;

        const newNodeSourceDatas: NodeSourceData[] = rawData.events.map(n => ({
            description: n.description,
            label: "label",
            keywords: n.keywords,
            timeFrom: n.timeFrom,
            timeTo: n.timeTo,
            title: n.title,
            id: n.id,
        }));

        const newEdgeSourceDatas: EdgeSourceData[] = rawData.relationships.map(r => ({
            id: r.id.toString(),
            label: r.label,
            fromId: r.fromId.toString(),
            toId: r.toId.toString(),
        }));

        prettifyGraph3(newNodeSourceDatas.map(nsd => nsd.id), newEdgeSourceDatas.map(esd => ({
            id: esd.id,
            source: esd.fromId,
            target: esd.toId
        }))).then(nodeIdsPositions => {
            nodeIdsPositions.forEach(idAndPosition => {
                recommendedNodePositionsOnAdd.set(idAndPosition.nodeId, idAndPosition.position)
            })

            newNodeSourceDatas.forEach(nodeSourceData => {
                nodeDatasStateManager.addNodeFromSource(nodeSourceData)
            })

            newEdgeSourceDatas.forEach(edgeSourceData => {
                edgeDatasStateManager.addEdgeFromSource(edgeSourceData)
            })
        })
    }, []);

    /*useEffect(() => {
        console.log(JSON.stringify(xfNodes))
    }, [xfNodes]);*/

    useEffect(() => {
        console.log(JSON.stringify(xfEdges))
    }, [xfEdges]);

    const rendersCountRef = useRef(0)
    rendersCountRef.current += 1
    return (
        <div>
            {rendersCountRef.current}
            <Flex vertical>
                <div style={{color: "black", backgroundColor: "white"}}>
                    <div style={{height: "70vh", width: "90vw"}}>
                        <NodeDatasStateManagerContext.Provider value={nodeDatasStateManager}>
                            <EdgeDatasStateManagerContext value={edgeDatasStateManager}>
                                <EditableContext value={isEditable}>
                                    <ReactFlow
                                        nodes={xfNodes}
                                        edges={xfEdges}
                                        onNodesChange={applyXfNodeChanges}
                                        onEdgesChange={applyXfEdgeChanges}
                                        fitView
                                        nodeTypes={nodeTypesForXyflow}
                                        edgeTypes={edgeTypes}
                                        defaultEdgeOptions={defaultEdgeOptions}
                                        connectionLineComponent={CustomConnectionLine}
                                        connectionLineStyle={connectionLineStyle}
                                    >
                                        <Controls showInteractive={true}/>
                                        <Background/>
                                    </ReactFlow>
                                </EditableContext>
                            </EdgeDatasStateManagerContext>
                        </NodeDatasStateManagerContext.Provider>
                    </div>
                </div>
                <div style={{
                    backgroundColor: "white",
                    color: "black",
                    position: "relative",
                    left: 0,
                    borderTop: "1px solid black",
                    padding: "10px"
                }}>
                    <Space size={50}>
                        <div>editable: <Switch onChange={(checked) => {
                            setIsEditable(checked);
                        }} checked={isEditable}/></div>
                        <Button disabled={!hasChanges || !isEditable}>push changes</Button>
                    </Space>
                </div>
                <div>
                    {JSON.stringify(xfEdges)}
                </div>
                <Divider style={{borderColor: "green"}}/>
                <Divider style={{borderColor: "green"}}/>
                <Divider style={{borderColor: "green"}}/>
                <button onClick={() => getAllQuery.refetch().then(() => console.log("refetched"))}>
                    update
                </button>
            </Flex>
        </div>
    );
}

export default AllViewXyflow;
