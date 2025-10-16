import ElkConstructor from "elkjs";

export async function prettifyGraph3(
    nodeIds: string[],
    edges: ({
        id: string
        source: string,
        target: string,
    })[],
    nodeWidth: number = 250,
    nodeHeight: number = 600
) {
    const elk = new ElkConstructor();

    const graph = {
        id: "root",
        layoutOptions: {
            "elk.algorithm": "layered", // можно заменить на "force" или "stress"
        },
        children: nodeIds.map((nodeId) => ({
            id: nodeId,
            width: nodeWidth,
            height: nodeHeight,
        })),
        edges: edges.map((e) => ({
            id: e.id,
            sources: [e.source],
            targets: [e.target],
        })),
    };

    const layout = await elk.layout(graph);

    return nodeIds.map(nodeId => {
        const layoutNode = layout.children?.find((c) => c.id === nodeId);
        const position = {
            x: layoutNode?.x ?? 0,
            y: layoutNode?.y ?? 0,
        }
        return {
            nodeId: nodeId,
            position: position,
        }
    })
}