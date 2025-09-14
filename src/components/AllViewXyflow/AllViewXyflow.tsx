import {useGetHistoryGetall} from "../../gen";
import {useEffect, useMemo} from "react";
import {
    ReactFlow,
    Background,
    Controls,
    useNodesState,
    useEdgesState, MarkerType
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {Divider, Flex} from "antd";
import {EventNode} from "./EventNode.tsx";
import type {XfEdge, XfNode} from "./XyFlowTypeAliases.ts";
import prettifyGraph2 from "./prettifyGraph2.ts";
import {devDtoEventsAndRelationshipsMock} from "../dev.ts";
import CustomConnectionLine from "./CustomConnectionLine.tsx";
import FloatingEdge from "./FloatingEdge.tsx";

const nodeTypesForXyflow = {
    EventNode: EventNode,
};

const connectionLineStyle = {
    stroke: '#b1b1b7',
};

const edgeTypes = {
    floating: FloatingEdge,
};

const defaultEdgeOptions = {
    type: 'floating',
    markerEnd: {
        type: MarkerType.ArrowClosed,
        color: '#b1b1b7',
    },
};

function AllViewXyflow() {
    const [nodes, setNodes, onNodesChange] = useNodesState<XfNode>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<XfEdge>([]);

    console.log("before getAllQuery")
    const getAllQuery = useGetHistoryGetall();
    const rawData = useMemo(() => getAllQuery.data?.data ?? devDtoEventsAndRelationshipsMock, [getAllQuery.data])
    console.log("rawData:", rawData);

    useEffect(
        () => {
            const nodes = rawData.events.map((n) => ({
                id: n.id.toString(),
                data: {title: n.title, description: n.description, id: n.id},
                position: {x: 0, y: 0},
                type: "EventNode"
            }));

            const edges = rawData.relationships.map((r) => ({
                id: r.id.toString(),
                source: r.fromId.toString(),
                target: r.toId.toString(),
                label: r.label,
                type: "floating",
                data: {label: r.label, id: r.id},
            }));

            /*const prettified = prettifyGraph(nodes, edges, "LR")
            setNodes(prettified.nodes)
            setEdges(prettified.edges)*/
            /*setNodes(rawData.events)
            setEdges(rawData.relationships)*/
            prettifyGraph2(nodes, edges, 250, 1000).then(() => {
                setNodes(nodes)
                setEdges(edges)
            })
        },
        [rawData, setNodes, setEdges])

    console.log("nodes:", nodes);
    console.log("edges:", edges);
    return (
        <div>
            <Flex vertical>
                <div style={{color: "black", backgroundColor: "white"}}>
                    <div style={{height: "50vh", width: "fit"}}>
                        <ReactFlow
                            nodes={nodes}
                            edges={edges}
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
                    </div>
                </div>
                <Divider style={{borderColor: "green"}}/>
                {JSON.stringify(rawData)}
                <Divider style={{borderColor: "green"}}/>
                <button onClick={() => getAllQuery.refetch().finally(() => console.log("refetched"))}>
                    update
                </button>
            </Flex>
        </div>
    );
}

export default AllViewXyflow;
