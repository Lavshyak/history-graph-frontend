import {useGetHistoryGetall} from "../../gen";
import {useEffect, useMemo, useState} from "react";
import {Background, Controls, MarkerType, ReactFlow, useEdgesState, useNodesState} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {Button, Divider, Flex, Space, Switch} from "antd";
import {EventNode, type EventNodeType} from "./EventNode.tsx";
import type {XfEdge, XfNode} from "./XyFlowTypeAliases.ts";
import prettifyGraph2 from "./prettifyGraph2.ts";
import {devDtoEventsAndRelationshipsMock} from "../dev.ts";
import CustomConnectionLine from "./CustomConnectionLine.tsx";
import FloatingEdge, {type FloatingEdgeType} from "./FloatingEdge.tsx";
import {EditableContext, MarkEdgeToDeleteContext} from "./Contexts.ts";

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
    const [nodesState, setNodes, onNodesChange] = useNodesState<XfNode>([]);
    const [edgesState, setEdges, onEdgesChange] = useEdgesState<XfEdge>([]);
    const [isEditable, setIsEditable] = useState<boolean>(false);

    const [edgesMarkedToDelete, setEdgesMarkedToDelete] = useState<string[]>([]);
    const isHasChanges = edgesMarkedToDelete.length > 0;

    const [markEdgeToDeleteContextValue] = useState({
        markEdgeToDelete: (edgeId: string) => {
            setEdgesMarkedToDelete([...edgesMarkedToDelete, edgeId])
        },
        undoMarkEdgeToDelete: (edgeId: string) => {
            setEdgesMarkedToDelete(edgesMarkedToDelete.filter(id => id != edgeId))
        }
    })

    console.log("before getAllQuery")
    const getAllQuery = useGetHistoryGetall();
    const rawData = useMemo(() => getAllQuery.data?.data ?? devDtoEventsAndRelationshipsMock, [getAllQuery.data])
    console.log("rawData:", rawData);

    useEffect(
        () => {
            const nodes = rawData.events.map<EventNodeType>((n) => ({
                id: n.id.toString(),
                data: {
                    id: n.id,
                    timeFrom: n.timeFrom,
                    timeTo: n.timeTo,
                    keywords: n.keywords,
                    title: n.title,
                    description: n.description,
                    label: "надо бы его с бэкенда возвращать"
                },
                position: {x: 0, y: 0},
                type: "EventNode"
            }));

            const edges = rawData.relationships.map<FloatingEdgeType>((r) => ({
                id: r.id.toString(),
                source: r.fromId.toString(),
                target: r.toId.toString(),
                label: r.label,
                type: "FloatingEdge",
                data: {
                    id: r.id,
                    fromId: r.fromId,
                    toId: r.toId,
                    label: r.label,
                    isMarkedAsDelete: false
                },
            }));

            prettifyGraph2(nodes, edges, 250, 700).then(() => {
                setNodes(nodes)
                setEdges(edges)
            })
        },
        [rawData, setNodes, setEdges])

    console.log("nodesState:", nodesState);
    console.log("edgesState:", edgesState);
    return (
        <div>
            <Flex vertical>
                <div style={{color: "black", backgroundColor: "white"}}>
                    <div style={{height: "70vh", width: "fit"}}>
                        <EditableContext value={isEditable}>
                            <MarkEdgeToDeleteContext value={markEdgeToDeleteContextValue}>
                                <ReactFlow
                                    nodes={nodesState}
                                    edges={edgesState}
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
                            </MarkEdgeToDeleteContext>
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
                            setIsEditable(checked)
                        }}/></div>
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
