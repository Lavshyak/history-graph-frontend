import {useGetHistoryGetall} from "../gen";
import {useEffect, useMemo} from "react";
import {
    ReactFlow,
    Background,
    Controls,
    MiniMap,
    useNodesState,
    useEdgesState, type Edge as XyFlowEdge, type Node as XyFlowNode
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import dagre from "dagre";
import {Divider, Flex} from "antd";

const nodeWidth = 120;
const nodeHeight = 50;

function prettifyGraph(nodes, edges, direction: "LR" | "TB" = "LR"): { nodes: XyFlowNode[], edges: XyFlowEdge[] } {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));

    const isHorizontal = direction === "LR";
    dagreGraph.setGraph({rankdir: direction});

    nodes.forEach((node) => {
        dagreGraph.setNode(node.id, {width: nodeWidth, height: nodeHeight});
    });

    edges.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    const layoutedNodes = nodes.map((node) => {
        const nodeWithPosition = dagreGraph.node(node.id);
        return {
            ...node,
            targetPosition: isHorizontal ? "left" : "top",
            sourcePosition: isHorizontal ? "right" : "bottom",
            position: {
                x: nodeWithPosition.x - nodeWidth / 2,
                y: nodeWithPosition.y - nodeHeight / 2
            }
        };
    });

    return {nodes: layoutedNodes, edges: edges};
}

function AllViewXyflow() {
    const [nodes, setNodes, onNodesChange] = useNodesState<XyFlowNode>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<XyFlowEdge>([]);

    const getAllQuery = useGetHistoryGetall();
    const rawData = useMemo(() => getAllQuery.data?.data ?? {events: [], relationships: []}, [getAllQuery.data])
    console.log("rawData:", rawData);

    useEffect(
        () => {
            const nodes = rawData.events.map((n) => ({
                id: n.id.toString(),
                data: {label: n.id},
                position: {x: 0, y: 0}
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
                        >
                            {/*<MiniMap/>*/}
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
