import {useGetHistoryGetall} from "../gen";
import {useEffect, useMemo} from "react";
import {
    ReactFlow,
    Background,
    Controls,
    useNodesState,
    useEdgesState
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {Divider, Flex} from "antd";
import {EventNode} from "./EventNode.tsx";
import type {XfEdge, XfNode} from "./XyFlowTypeAliases.ts";
import prettifyGraph from "./prettifyGraph.ts";

const nodeTypesForXyflow = {
    EventNode: EventNode,
};

function AllViewXyflow() {
    const [nodes, setNodes, onNodesChange] = useNodesState<XfNode>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<XfEdge>([]);

    const getAllQuery = useGetHistoryGetall();
    const rawData = useMemo(() => getAllQuery.data?.data ?? {events: [], relationships: []}, [getAllQuery.data])
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
                label: r.label
            }));

            const prettified = prettifyGraph(nodes, edges, "LR")
            setNodes(prettified.nodes)
            setEdges(prettified.edges)
            /*setNodes(rawData.events)
            setEdges(rawData.relationships)*/
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
