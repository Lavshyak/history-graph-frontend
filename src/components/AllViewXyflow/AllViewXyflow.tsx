import {useGetHistoryGetall} from "../../gen";
import {useCallback, useContext, useEffect, useMemo, useState} from "react";
import "@xyflow/react/dist/style.css";
import {Button, Divider, Flex, Space, Switch} from "antd";
import {EventNode} from "./EventNode.tsx";
import type {XfEdge, XfNode} from "./XyFlowTypeAliases.ts";
import prettifyGraph2 from "./prettifyGraph2.ts";
import {devDtoEventsAndRelationshipsMock} from "../dev.ts";
import CustomConnectionLine from "./CustomConnectionLine.tsx";
import {EditableContext, MarkEdgeForDeleteContext, MarkNodeForDeleteContext} from "./Contexts.ts";
import {MarkerType, type NodeChange, type EdgeChange, ReactFlow, Controls, Background, applyNodeChanges, applyEdgeChanges} from "@xyflow/react";
import FloatingEdge from "./FloatingEdge.tsx";
import {EdgeDatasStateContext} from "../EdgeDatasStateContext.tsx";
import {NodeDatasStateContext} from "../NodeDatasStateContext.tsx";
import type {NodeSourceData} from "../../types/NodeData.ts";
import type {EdgeSourceData} from "../../types/EdgeData.ts";

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
    type: 'floating',
    markerEnd: {
        type: MarkerType.ArrowClosed,
        color: '#b1b1b7',
    },
};

function AllViewXyflow() {
    const edgeDatasStateContext = useContext(EdgeDatasStateContext);
    const nodeDatasStateContext = useContext(NodeDatasStateContext);

    const [isEditable, setIsEditable] = useState<boolean>(true);
    const [edgesMarkedForDelete, setEdgesMarkedForDelete] = useState<string[]>([]);
    const [nodesMarkedForDelete, setNodesMarkedForDelete] = useState<string[]>([]);
    const isHasChanges = edgesMarkedForDelete.length > 0 || nodesMarkedForDelete.length > 0;

    const markEdgeForDeleteContextValue = useMemo(() => ({
        markEdgeForDelete: (edgeId: string) => {
            setEdgesMarkedForDelete(prev => [...prev, edgeId]);
        },
        undoMarkEdgeForDelete: (edgeId: string) => {
            setEdgesMarkedForDelete(prev => prev.filter(id => id !== edgeId));
        }
    }), []);

    const markNodeForDeleteContextValue = useMemo(() => ({
        markNodeForDelete: (nodeId: string) => {
            setNodesMarkedForDelete(prev => [...prev, nodeId]);
            nodeDatasStateContext.markForDelete([{nodeId, markForDelete: true}]);
        },
        undoMarkNodeForDelete: (nodeId: string) => {
            setNodesMarkedForDelete(prev => prev.filter(id => id !== nodeId));
            nodeDatasStateContext.markForDelete([{nodeId, markForDelete: false}]);
        }
    }), [nodeDatasStateContext]);

    console.log("before getAllQuery");
    const getAllQuery = useGetHistoryGetall();
    const rawData = useMemo(() => getAllQuery.data?.data ?? devDtoEventsAndRelationshipsMock, [getAllQuery.data]);
    console.log("rawData:", rawData);

    // Load data from backend into contexts
    useEffect(() => {
        if (!rawData.events.length) return;

        const nodeSourceData: NodeSourceData[] = rawData.events.map(n => ({
            id: n.id.toString(),
            label: "надо бы его с бэкенда возвращать",
            timeFrom: n.timeFrom,
            timeTo: n.timeTo,
            keywords: n.keywords,
            title: n.title,
            description: n.description,
        }));

        const edgeSourceData: EdgeSourceData[] = rawData.relationships.map(r => ({
            id: r.id.toString(),
            label: r.label,
            fromId: r.fromId.toString(),
            toId: r.toId.toString(),
        }));

        nodeDatasStateContext.clear();
        nodeDatasStateContext.addFromSource(nodeSourceData.map(nsd => ({nodeSourceData: nsd})));
        edgeDatasStateContext.addFromSource(edgeSourceData.map(esd => ({edgeSourceData: esd})));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [rawData]);

    // Convert context data to XyFlow nodes
    const xyFlowNodes = useMemo<XfNode[]>(() => {
        return nodeDatasStateContext.nodesState.all.values.map(nodeData => ({
            id: nodeData.sourceData.id,
            data: {
                id: nodeData.currentData.id,
                timeFrom: nodeData.currentData.timeFrom,
                timeTo: nodeData.currentData.timeTo,
                title: nodeData.currentData.title,
                description: nodeData.currentData.description,
                label: nodeData.currentData.label,
                keywords: [...nodeData.currentData.keywords],
                isMarkedForDelete: nodeData.tech.isExplicitlyMarkedForDelete,
            },
            position: nodeData.tech.position ?? {x: 0, y: 0},
            type: "EventNode"
        }));
    }, [nodeDatasStateContext.nodesState.all]);

    // Convert context data to XyFlow edges
    const xyFlowEdges = useMemo<XfEdge[]>(() => {
        return edgeDatasStateContext.edgesState.all.values.map(edgeData => ({
            id: edgeData.sourceData.id,
            data: edgeData,
            source: edgeData.sourceData.fromId,
            target: edgeData.sourceData.toId,
            type: "FloatingEdge",
        }));
    }, [edgeDatasStateContext.edgesState.all]);

    // Prettify graph on initial load
    useEffect(() => {
        if (xyFlowNodes.length === 0) return;
        
        // Check if positions are already set
        const hasPositions = xyFlowNodes.some(n => n.position.x !== 0 || n.position.y !== 0);
        if (hasPositions) return;

        // Calculate positions
        prettifyGraph2(xyFlowNodes, xyFlowEdges, 250, 700).then(() => {
            // Update positions in context
            const positionUpdates = xyFlowNodes.map(node => ({
                id: node.id,
                position: node.position
            }));
            nodeDatasStateContext.updatePosition(positionUpdates);
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [xyFlowNodes.length]); // Only run when node count changes

    // Handle node changes from XyFlow (dragging, selection, etc.)
    const onNodesChange = useCallback((changes: NodeChange[]) => {
        changes.forEach(change => {
            if (change.type === 'position' && change.position && !change.dragging) {
                // Update position in context when drag ends
                nodeDatasStateContext.updatePosition([{
                    id: change.id,
                    position: change.position
                }]);
            }
        });
    }, [nodeDatasStateContext]);

    // Handle edge changes from XyFlow
    const onEdgesChange = useCallback((changes: EdgeChange[]) => {
        // Handle edge changes if needed
        console.log("Edge changes:", changes);
    }, []);

    console.log("xyFlowNodes:", xyFlowNodes);
    console.log("xyFlowEdges:", xyFlowEdges);

    return (
        <div>
            <Flex vertical>
                <div style={{color: "black", backgroundColor: "white"}}>
                    <div style={{height: "70vh", width: "fit"}}>
                        <EditableContext value={isEditable}>
                            <MarkEdgeForDeleteContext value={markEdgeForDeleteContextValue}>
                                <MarkNodeForDeleteContext value={markNodeForDeleteContextValue}>
                                    <ReactFlow
                                        nodes={xyFlowNodes}
                                        edges={xyFlowEdges}
                                        onNodesChange={onNodesChange}
                                        onEdgesChange={onEdgesChange}
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
                                </MarkNodeForDeleteContext>
                            </MarkEdgeForDeleteContext>
                        </EditableContext>
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
                        <Button disabled={!isHasChanges || !isEditable}>push changes</Button>
                    </Space>
                </div>
                <Divider style={{borderColor: "green"}}/>
                <Divider style={{borderColor: "green"}}/>
                {JSON.stringify(rawData)}
                <Divider style={{borderColor: "green"}}/>
                <button onClick={() => getAllQuery.refetch().then(() => console.log("refetched"))}>
                    update
                </button>
            </Flex>
        </div>
    );
}

export default AllViewXyflow;
