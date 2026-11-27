export function initialElements(nodesCount = 3600, edgesCount = 3600) {
    const nodes = [];
    const edges = [];

    for (let x = 0; x < nodesCount; x++) {
        const position = { x: (x%Math.sqrt(nodesCount+1))*100, y: x/Math.sqrt(nodesCount+1)*100 };
        const data = { label: `Node ${x}` };
        const node = {
            id: `stress-${x.toString()}`,
            style: { width: 50, fontSize: 11 },
            data,
            position,
        };
        nodes.push(node);
    }

    for (let x = 0; x < edgesCount; x++) {

        const sourceNodeId = Math.floor(Math.random()*nodesCount)
        const destNodeId = Math.floor(Math.random()*nodesCount)
        edges.push({
            id: `${sourceNodeId}-${destNodeId}`,
            source: `stress-${sourceNodeId.toString()}`,
            target: `stress-${destNodeId.toString()}`,
        });
    }

    console.log({ nodes, edges })
    return { nodes, edges };
}
