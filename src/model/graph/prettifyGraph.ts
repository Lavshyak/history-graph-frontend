import { layoutWithElk } from '@/model/graph/elkLayout.ts'

// Отступ между нодами в «быстрой» раскладке.
const GRID_GAP = 50

/**
 * Раскладка графа для первичной расстановки нод.
 *
 * Если связей нет, elk не нужен вообще: на 1000 нодах он считал ~2.3 с, хотя
 * любая расстановка без связей произвольна. Кладём в сетку — мгновенно.
 * Во всех остальных случаях считаем elk (в воркере, см. elkLayout.ts).
 */
export async function prettifyGraph(
	nodeIds: string[],
	edges: {
		id: string
		source: string
		target: string
	}[],
	isSortGraph: boolean = false,
	nodeWidth: number = 250,
	nodeHeight: number = 600,
) {
	if (edges.length === 0) {
		const columns = isSortGraph
			? 1
			: Math.max(1, Math.ceil(Math.sqrt(nodeIds.length)))
		return nodeIds.map((nodeId, index) => ({
			nodeId,
			position: {
				x: (index % columns) * (nodeWidth + GRID_GAP),
				y: Math.floor(index / columns) * (nodeHeight + GRID_GAP),
			},
		}))
	}

	const graph = {
		id: 'root',
		layoutOptions: {
			'elk.algorithm': 'layered', // можно заменить на "force" или "stress"
			'elk.direction': isSortGraph ? 'DOWN' : 'RIGHT',
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

	const layout = await layoutWithElk(graph)

	// Раньше позиция каждой ноды искалась через layout.children.find внутри
	// map — это O(N²) на 1000 нод (граф «висел» несколько секунд).
	const layoutNodesById = new Map<string, { x?: number; y?: number }>()
	for (const layoutNode of layout.children ?? []) {
		layoutNodesById.set(layoutNode.id, layoutNode)
	}

	return nodeIds.map(nodeId => {
		const layoutNode = layoutNodesById.get(nodeId)
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
