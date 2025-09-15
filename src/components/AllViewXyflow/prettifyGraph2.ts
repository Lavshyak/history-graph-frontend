import { type XYPosition} from "@xyflow/react";
import ElkConstructor from "elkjs";

// ai slop
export default async function prettifyGraph2<TNode, TEdge>(
    nodes: ({
        id: string,
        position: XYPosition
    } & TNode)[],
    edges: ({
        source: string,
        target: string,
    } & TEdge)[],
    nodeWidth: number = 240,
    nodeHeight: number = 100
) {
    const elk = new ElkConstructor();

    const graph = {
        id: "root",
        layoutOptions: {
            "elk.algorithm": "layered", // можно заменить на "force" или "stress"
        },
        children: nodes.map((n) => ({
            id: n.id,
            width: nodeWidth,
            height: nodeHeight,
        })),
        edges: edges.map((e) => ({
            id: `${e.source}->${e.target}`,
            sources: [e.source],
            targets: [e.target],
        })),
    };

    const layout = await elk.layout(graph);

    nodes.forEach(n => {
        const layoutNode = layout.children?.find((c) => c.id === n.id);
        n.position = {
            x: layoutNode?.x ?? 0,
            y: layoutNode?.y ?? 0,
        }
    })
}