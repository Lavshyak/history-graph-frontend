import {type XYPosition} from "@xyflow/react";
import {layoutWithElk} from "@/model/graph/elkLayout.ts";

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

    const layout = await layoutWithElk(graph)

    // Раньше позиция искалась через layout.children.find внутри forEach — O(N²).
    const layoutNodesById = new Map((layout.children ?? []).map(c => [c.id, c]))

    nodes.forEach(n => {
        const layoutNode = layoutNodesById.get(n.id);
        n.position = {
            x: layoutNode?.x ?? 0,
            y: layoutNode?.y ?? 0,
        }
    })
}

