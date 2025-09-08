
import dagre from "dagre";
import type {XfEdge, XfNode} from "./XyFlowTypeAliases.ts";

export type NodeWithId = {
    id: string,
};

export type EdgeWithSourceIdAndTargetId = {
    source: string,
    target: string,
};

// ai slop
export default function prettifyGraph(nodes:NodeWithId[], edges : EdgeWithSourceIdAndTargetId[], direction: "LR" | "TB" = "LR", nodeWidth: number = 120, nodeHeight: number = 50): {
    nodes: XfNode[],
    edges: XfEdge[]
} {
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