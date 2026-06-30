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
    ReactFlow, ReactFlowProvider, useReactFlow, useViewport, type Viewport,
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
import {node} from "globals";

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

type ContextMenuParams = {
    id : string,
    top: number,
    left: number,
    onMouseLeave?: () => void,
    xSpawn: number,
    ySpawn: number,
}
export function ContextMenu({ id, top, left, onMouseLeave, xSpawn, ySpawn, ...props } : ContextMenuParams) {
    const nodeDatasStateManager = useContext(NodeDatasStateManagerContext)

    return (
        <div onMouseLeave={onMouseLeave} style={{ zIndex:1000, left: left, top: top, transform: "translate(-50%, -50%)", position: "absolute", backgroundColor: "chocolate" }} className="context-menu" {...props}>
            <p style={{ margin: '0.5em' }}>
                <small>node: {id}</small>
            </p>
            <button onClick={()=>{
                console.log("create, advPos ", {x:xSpawn, y:ySpawn})
                nodeDatasStateManager.addNodeFromCreated({
                    id: crypto.randomUUID(),
                    label: 'default',
                    description: '',
                    keywords: [],
                    timeFrom: new Date(),
                    timeTo: new Date(),
                    title: ''
                }, {x:xSpawn, y:ySpawn})
                if(onMouseLeave) onMouseLeave()
            }}>create</button>
            {/*<button>delete</button>*/}
        </div>
    );
}

function AllViewXyflow() {
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
            let position = recommendedNodePositionsOnAdd.get(nodeId)
            if(!position){
                console.log(98)
                const nodeData = nodeDatasStateManager.allNodeDatasMap.get(nodeId)
                console.log('nodeData ', nodeData)
                if(nodeData){
                    if(nodeData.advisoryPosition){
                        position = {x: 0, y: 0}
                        if(nodeData.advisoryPosition.x){
                            position.x = nodeData.advisoryPosition.x
                        }
                        if(nodeData.advisoryPosition.y){
                            position.y = nodeData.advisoryPosition.y
                        }
                    }
                }
            }
            if(!position){
                console.log(114)
                position = {x: 0, y: 0}
            }

            console.log('position ', position)

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

    const frameRef = useRef<number | null>(null);

    const onNodesChangeRaf = useCallback((changes: NodeChange<XfNode>[]) => {
        const positionChanges = changes.filter(change => change.type === "position");
        if (positionChanges.length > 0) {
            if (frameRef.current === null) {
                frameRef.current = requestAnimationFrame(() => {
                    applyXfNodeChanges(positionChanges);
                    frameRef.current = null;
                });
            }
        }

        const otherChanges = changes.filter(change => change.type !== "position");
        if (otherChanges.length > 0) {
            applyXfNodeChanges(otherChanges)
        }

    }, [applyXfNodeChanges]);

    const reactFlowInstance = useReactFlow()
    const [viewport, setViewport] = useState<Viewport>({x:0, y: 0, zoom: 1});
    const ref = useRef<HTMLDivElement>(null);
    const [menu, setMenu] = useState<ContextMenuParams|null>(null);
    const onNodeContextMenu = useCallback(
        (event : (React.MouseEvent | MouseEvent)) => {
            // Prevent native context menu from showing
            event.preventDefault();
            console.log('onNodeContextMenu event ', event)

            // Calculate position of the context menu. We want to make sure it
            // doesn't get positioned off-screen.
            const pane = ref.current.getBoundingClientRect();
            console.log('onNodeContextMenu ref.current.getBoundingClientRect() ', ref.current.getBoundingClientRect())
            console.log('onNodeContextMenu viewport ', viewport)

            const flowXY = reactFlowInstance.screenToFlowPosition({x: event.pageX, y: event.pageY});
            const menu = {
                id: "contextMenu1",
                top: event.pageY-pane.top,
                left: event.pageX-pane.left,
                //right:  event.screenX-200,
                //bottom:  event.screenY-200,
                //xMenu: event.pageX,  //(event.pageX /*- ref.current.getBoundingClientRect().x*/ - ref.current.getBoundingClientRect().width/2 + viewport.x/viewport.zoom),
                //yMenu: event.pageY,//(event.pageY /*- ref.current.getBoundingClientRect().y*/ - ref.current.getBoundingClientRect().height/2 + viewport.y/viewport.zoom)
                xSpawn: flowXY.x - 100,
                ySpawn: flowXY.y - 100
            }
            setMenu(menu);
        },
        [reactFlowInstance, viewport],
    );
    // Close the context menu if it's open whenever the window is clicked.
    const onPaneClick = useCallback(() => setMenu(null), [setMenu]);

    return (
        <div style={{}}>
            <Flex vertical style={{alignItems: "center"}}>
                <div style={{alignItems: "stretch"}}>
                    <div style={{color: "black", backgroundColor: "white", width: '90vw'}}>
                        <div style={{height: "70vh"}}>
                            <EditableContext.Provider value={isEditable}>

                                    <ReactFlow
                                        ref={ref}
                                        viewport={viewport}
                                        onViewportChange={(v) => setViewport(v)}
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
                                    >
                                        <Controls showInteractive={true}/>
                                        <Background/>
                                        {menu && <ContextMenu onClick={onPaneClick} {...menu} onMouseLeave={()=> setMenu(null)} />}
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
                </div>
            </Flex>
        </div>
    );
}

export default AllViewXyflow;
