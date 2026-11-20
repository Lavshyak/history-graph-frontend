import ElkConstructor from 'elkjs'

export async function prettifyGraph(
	nodeIds: string[],
	edges: {
		id: string
		source: string
		target: string
	}[],
	nodeWidth: number = 250,
	nodeHeight: number = 600,
) {
	const elk = new ElkConstructor()

	const graph = {
		id: 'root',
		layoutOptions: {
			'elk.algorithm': 'layered', // можно заменить на "force" или "stress"
			'elk.direction': 'DOWN',
		},
		children: nodeIds.map(nodeId => ({
			id: nodeId,
			width: nodeWidth,
			height: nodeHeight,
		})),
		edges: edges.map(e => ({
			id: e.id,
			sources: [e.source],
			targets: [e.target],
		})),
	}

	const layout = await elk.layout(graph)

	// Раньше позиция каждой ноды искалась через layout.children.find внутри
	// map — это O(N²) на 1000 нод (граф «висел» несколько секунд).
	const layoutNodesById = new Map<string, { x?: number; y?: number }>()
	for (const layoutNode of layout.children ?? []) {
		layoutNodesById.set(layoutNode.id, layoutNode)
	}

	return nodeIds.map((nodeId, index) => {
		const layoutNode = layoutNodesById.get(nodeId)
		const position = {
			x: layoutNode?.x ?? 0,
			y: layoutNode?.y ?? index * (nodeHeight + 50),
		}
		return {
			nodeId: nodeId,
			position: position,
		}
	})
}
