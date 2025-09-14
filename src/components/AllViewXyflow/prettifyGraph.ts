import dagre from "dagre";
import {Position} from "@xyflow/react";

// ai slop
export default function prettifyGraph<TNode, TEdge>(
    nodes: ({
        id: string
    } & TNode)[],
    edges: ({
        source: string,
        target: string,
    } & TEdge)[],
    direction: "LR" | "TB" = "LR", nodeWidth: number = 240, nodeHeight: number = 100) {
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
            targetPosition: isHorizontal ? Position.Left : Position.Top,
            sourcePosition: isHorizontal ? Position.Right : Position.Bottom,
            position: {
                x: nodeWithPosition.x,
                y: nodeWithPosition.y
            }
        };
    });

    return {nodes: layoutedNodes, edges: edges};
}