import {useGetHistoryGetall} from "../../gen";
import {useCallback, useContext, useEffect, useRef, useState} from "react";
import "@xyflow/react/dist/style.css";
import {Button, Divider, Flex, Space, Switch} from "antd";
import {EventNode} from "./EventNode.tsx";
import type {XfEdge, XfNode} from "./XyFlowTypeAliases.ts";
import {devDtoEventsAndRelationshipsMock} from "../dev.ts";
import CustomConnectionLine from "./CustomConnectionLine.tsx";
import {
    applyEdgeChanges,
    applyNodeChanges,
    Background,
    Controls,
    type EdgeChange,
    MarkerType,
    type NodeChange,
    ReactFlow,
    type XYPosition
} from "@xyflow/react";
import FloatingEdge from "./FloatingEdge.tsx";
import type {NodeDataIdType, NodeSourceData} from "../../types/NodeData.ts";
import type {EdgeDataIdType, EdgeSourceData} from "../../types/EdgeData.ts";
import {useEventHandling} from "../../hooks/useEventHandling.ts";

import {prettifyGraph} from "./prettifyGraph.ts";
import {useLocalState} from "../../hooks/UseLocalState.ts";
import {NodeDatasStateManagerContext} from "../../contexts/NodeDatasStateManagerContext.ts";
import {EdgeDatasStateManagerContext} from "../../contexts/EdgeDatasStateManagerContext.ts";
import {GraphDataHasChangesContext} from "../../contexts/GraphDataHasChangesContext.ts";
import {EditableContext} from "./Contexts.ts";

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

function AllViewXyflow() {
    const performanceMark = performance.mark("AllViewXyflow")

    const nodeDatasStateManager = useContext(NodeDatasStateManagerContext)
    const edgeDatasStateManager = useContext(EdgeDatasStateManagerContext)
    const graphHasChanges = useContext(GraphDataHasChangesContext);

    const [isEditable, setIsEditable] = useState<boolean>(true);

    const recommendedNodePositionsOnAdd = useRef(new Map<NodeDataIdType, XYPosition>()).current

    const {xfNodes, addXfNode, removeXfNode/*, changeXfNodePosition*/, applyXfNodeChanges} = useLocalState<{
        xfNodes: readonly Readonly<XfNode>[]
        addXfNode(nodeId: NodeDataIdType): void
        removeXfNode(nodeId: NodeDataIdType): void
        /*changeXfNodePosition(nodePositionChange: NodePositionChange): void*/
        applyXfNodeChanges(nodeChanges: NodeChange<XfNode>[]): void
    }>((set, get) => ({
        xfNodes: [],
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
        applyXfNodeChanges(nodeChanges: NodeChange<XfNode>[]) {
            const currentNodes = get().xfNodes
            const newNodes = applyNodeChanges(nodeChanges, currentNodes as XfNode[])
            set({
                xfNodes: newNodes
            })
        }
    }))

    useEventHandling(nodeDatasStateManager.nodesStateEvents.nodeAddedEvent, ({nodeDataId}) => {
        addXfNode(nodeDataId)
    })

    const {xfEdges, addXfEdge, removeXfEdge, applyXfEdgeChanges} = useLocalState<{
        xfEdges: readonly Readonly<XfEdge>[]
        addXfEdge(edgeId: EdgeDataIdType): void
        removeXfEdge(edgeId: EdgeDataIdType): void,
        applyXfEdgeChanges(changes: EdgeChange<XfEdge>[]): void
    }>((set, get) => ({
        xfEdges: [],
        addXfEdge(edgeId: EdgeDataIdType) {
            set((state) => {
                const edgeData = edgeDatasStateManager.allEdgeDatasMap.get(edgeId)
                if (!edgeData) throw new Error(`edgeData not found for edgeId ${edgeId}`)
                return {
                    xfEdges: [...state.xfEdges, {
                        id: edgeId,
                        source: edgeData.sourceData.fromId,
                        target: edgeData.sourceData.toId,
                        type: 'FloatingEdge',
                    }],
                }
            })
        },
        removeXfEdge(edgeId: EdgeDataIdType) {
            set((state) => ({
                xfEdges: state.xfEdges.filter(x => x.id !== edgeId)
            }))
        },
        applyXfEdgeChanges(changes: EdgeChange<XfEdge>[]) {
            const currentEdges = get().xfEdges
            const newEdges = applyEdgeChanges(changes, currentEdges as XfEdge[])
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

        prettifyGraph(newNodeSourceDatas.map(nsd => nsd.id), newEdgeSourceDatas.map(esd => ({
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

   /* useEffect(() => {
        console.log(JSON.stringify(xfEdges))
    }, [xfEdges]);*/

    const frameRef = useRef<number>(0);

    const onNodesChangeRaf = useCallback((changes:NodeChange<XfNode>[]) => {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = requestAnimationFrame(() => {
            applyXfNodeChanges(changes);
        });
    }, [applyXfNodeChanges]);

    return (
        <div>
            <Flex vertical>
                <div style={{color: "black", backgroundColor: "white"}}>
                    <div style={{height: "70vh", width: "90vw"}}>
                        <EditableContext.Provider value={isEditable}>
                            <ReactFlow
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
                            >
                                <Controls showInteractive={true}/>
                                <Background/>
                            </ReactFlow>
                        </EditableContext.Provider>
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
                        <Button disabled={!graphHasChanges || !isEditable}>push changes</Button>
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
