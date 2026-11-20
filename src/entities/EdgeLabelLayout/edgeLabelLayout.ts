import type { InternalNode } from '@xyflow/react'
import { getEdgeParams } from '@/entities/FloatingEdge/getEdgeParams.ts'
import { getSpecialPath } from '@/entities/EdgeLabelLayout/getSpecialPath.ts'
import type { XfEdge } from '@/shared/types/xyflow.ts'

// Fallback card size, used only until the real card has been measured for the
// first time. The real size is adaptive and measured from the rendered card
// (see EdgeLabelLayoutProvider / FloatingEdge).
export const DEFAULT_LABEL_CARD_WIDTH = 200
export const DEFAULT_LABEL_CARD_HEIGHT = 120
// Extra margin added around a card when testing overlaps. Kept at 0 so a card is
// only displaced when it *actually* collides — otherwise even a small margin
// makes a card that almost fits between two nodes flee far away ("scattered").
export const LABEL_CARD_PADDING = 0
// Extra margin added around a node card when testing overlaps (0 for the same
// reason as above).
export const NODE_BOX_MARGIN = 0
// Fine sliding granularity for collision resolution. Small steps make the greedy
// search return the *nearest* free position, keeping cards close to their edges.
const COLLISION_STEP = 16

export type LabelSize = {
	width: number
	height: number
}

const DEFAULT_LABEL_SIZE: LabelSize = {
	width: DEFAULT_LABEL_CARD_WIDTH,
	height: DEFAULT_LABEL_CARD_HEIGHT,
}

export type EdgeLabelLayoutEntry = {
	pathDelta: number
	extraOffset: number
	deltaMultiplier: number
}

type EdgeGeometry = {
	edgeId: string
	labelX: number
	labelY: number
	nx: number
	ny: number
	pathDelta: number
	deltaMultiplier: number
	size: LabelSize
}

type LabelBox = {
	left: number
	right: number
	top: number
	bottom: number
}

function compareIds(a: string, b: string): number {
	// Быстрее, чем localeCompare, и для id (числа/hex/ascii) даёт тот же порядок.
	return a < b ? -1 : a > b ? 1 : 0
}

function getParallelEdgeGroupKey(source: string, target: string): string {
	return source < target ? `${source}::${target}` : `${target}::${source}`
}

export function computeParallelEdgeDeltas(
	edgeIds: readonly string[],
): Map<string, number> {
	const sorted = [...edgeIds].sort(compareIds)
	const middleIdx = Math.floor(sorted.length / 2)
	const deltas = new Map<string, number>()

	let i1 = 0
	for (let i = 0; i <= middleIdx; i++) {
		deltas.set(sorted[i], i1--)
	}
	let i2 = 1
	for (let i = middleIdx + 1; i < sorted.length; i++) {
		deltas.set(sorted[i], i2++)
	}

	return deltas
}

// Base spacing between parallel edges' curves. Intentionally independent of the
// measured card size: otherwise the path string (and thus the card width) would
// depend on the size again, closing the measurement feedback loop. Real card
// separation is done by the collision resolution below, which uses the actual
// measured card widths and therefore packs the cards as tightly as their content
// allows.
//
// It is also intentionally independent of how many parallel edges there are:
// computeParallelEdgeDeltas already encodes each edge's index within the group as
// consecutive integers (…, -2, -1, 0, 1, 2, …), so a fixed multiplier keeps the
// per-edge step constant. Scaling it by the group size (as it used to) made the
// cards drift further and further apart the more parallel edges were added.
const PARALLEL_EDGE_BASE_SPACING = 200

export function computeDeltaMultiplier(): number {
	return PARALLEL_EDGE_BASE_SPACING
}

// Раньше delta каждой связи считалась внутри цикла по связям, то есть для
// каждой связи заново сортировалась вся группа параллельных связей. На графе
// с сотнями параллельных рёбер это давало O(E^2 log E) на каждый кадр драга.
// Теперь группы считаются один раз на изменение набора связей.
export function computeParallelEdgeDeltasByEdgeId(
	edges: readonly XfEdge[],
): Map<string, number> {
	const parallelGroups = new Map<string, string[]>()

	for (const edge of edges) {
		const key = getParallelEdgeGroupKey(edge.source, edge.target)
		const group = parallelGroups.get(key)
		if (group) {
			group.push(edge.id)
		} else {
			parallelGroups.set(key, [edge.id])
		}
	}

	const deltas = new Map<string, number>()
	for (const groupEdgeIds of parallelGroups.values()) {
		for (const [edgeId, delta] of computeParallelEdgeDeltas(groupEdgeIds)) {
			deltas.set(edgeId, delta)
		}
	}

	return deltas
}

function getLabelCenter(geometry: EdgeGeometry, extraOffset: number) {
	return {
		x: geometry.labelX + geometry.nx * extraOffset,
		y: geometry.labelY + geometry.ny * extraOffset,
	}
}

function getLabelBox(geometry: EdgeGeometry, extraOffset: number): LabelBox {
	const { x, y } = getLabelCenter(geometry, extraOffset)
	const halfW = geometry.size.width / 2 + LABEL_CARD_PADDING
	const halfH = geometry.size.height / 2 + LABEL_CARD_PADDING

	return {
		left: x - halfW,
		right: x + halfW,
		top: y - halfH,
		bottom: y + halfH,
	}
}

function boxesOverlap(a: LabelBox, b: LabelBox): boolean {
	return (
		a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top
	)
}

function getNodeBoxes(nodeLookup: Map<string, InternalNode>): LabelBox[] {
	const boxes: LabelBox[] = []

	for (const node of nodeLookup.values()) {
		// Use the real, measured node size instead of a guess so relationship
		// cards are pushed away from actual node cards.
		const width = node.measured?.width
		const height = node.measured?.height
		if (width == null || height == null) {
			continue
		}

		const x = node.internals.positionAbsolute.x
		const y = node.internals.positionAbsolute.y

		boxes.push({
			left: x - NODE_BOX_MARGIN,
			right: x + width + NODE_BOX_MARGIN,
			top: y - NODE_BOX_MARGIN,
			bottom: y + height + NODE_BOX_MARGIN,
		})
	}

	return boxes
}

function boxesOverlapAny(box: LabelBox, others: readonly LabelBox[]): boolean {
	for (const other of others) {
		if (boxesOverlap(box, other)) {
			return true
		}
	}
	return false
}

// Пространственный индекс по ячейкам. Проверка пересечения карточки с уже
// размещёнными смотрит только в ячейки, которые накрывает сама карточка, а не
// во все карточки подряд. Без индекса поиск свободного места был
// O(кол-во уже размещённых) на каждый шаг поиска, и на графах с сотнями
// связей между одной парой нод это съедало кадры.
const SPATIAL_CELL_SIZE = 256

function cellIndex(value: number): number {
	return Math.floor(value / SPATIAL_CELL_SIZE)
}

function cellKey(cellX: number, cellY: number): string {
	return `${cellX}:${cellY}`
}

class BoxIndex {
	private readonly cells = new Map<string, LabelBox[]>()

	add(box: LabelBox): void {
		const fromCellX = cellIndex(box.left)
		const toCellX = cellIndex(box.right)
		const fromCellY = cellIndex(box.top)
		const toCellY = cellIndex(box.bottom)

		for (let cellY = fromCellY; cellY <= toCellY; cellY++) {
			for (let cellX = fromCellX; cellX <= toCellX; cellX++) {
				const key = cellKey(cellX, cellY)
				const boxes = this.cells.get(key)
				if (boxes) {
					boxes.push(box)
				} else {
					this.cells.set(key, [box])
				}
			}
		}
	}

	overlapsAny(box: LabelBox): boolean {
		const fromCellX = cellIndex(box.left)
		const toCellX = cellIndex(box.right)
		const fromCellY = cellIndex(box.top)
		const toCellY = cellIndex(box.bottom)

		for (let cellY = fromCellY; cellY <= toCellY; cellY++) {
			for (let cellX = fromCellX; cellX <= toCellX; cellX++) {
				const boxes = this.cells.get(cellKey(cellX, cellY))
				if (!boxes) {
					continue
				}
				if (boxesOverlapAny(box, boxes)) {
					return true
				}
			}
		}
		return false
	}
}

// Deterministic greedy placement.
//
// Cards are placed one by one. Each card first tries its natural position
// (extraOffset = 0); if it collides with a node card or with an already placed
// relationship card, the edge is stretched (the card slides along its own
// perpendicular) in fine steps until the nearest free spot is found. Because the
// search only depends on inputs (never on a previous render), the result is
// stable.
function findFreeOffset(
	geometry: EdgeGeometry,
	nodeBoxIndex: BoxIndex,
	placedBoxIndex: BoxIndex,
): number {
	const step = COLLISION_STEP
	const maxSteps = 200

	for (let k = 0; k <= maxSteps; k++) {
		// k = 0 → keep the natural position.
		// Otherwise try both sides, alternating which one goes first so cards
		// distribute evenly instead of always stacking on the same side.
		const candidates =
			k === 0
				? [0]
				: k % 2 === 1
					? [k * step, -k * step]
					: [-k * step, k * step]

		for (const offset of candidates) {
			const box = getLabelBox(geometry, offset)
			if (
				!nodeBoxIndex.overlapsAny(box) &&
				!placedBoxIndex.overlapsAny(box)
			) {
				return offset
			}
		}
	}

	// Fallback: nothing free found within range — keep the natural position.
	return 0
}

function resolveCollisions(
	geometries: readonly EdgeGeometry[],
	nodeBoxes: readonly LabelBox[],
): Map<string, number> {
	// Sort for determinism: the same graph always produces the same layout.
	const ordered = [...geometries].sort((a, b) =>
		compareIds(a.edgeId, b.edgeId),
	)

	const nodeBoxIndex = new BoxIndex()
	for (const nodeBox of nodeBoxes) {
		nodeBoxIndex.add(nodeBox)
	}

	const placedBoxIndex = new BoxIndex()
	const offsets = new Map<string, number>()

	for (const geometry of ordered) {
		const offset = findFreeOffset(geometry, nodeBoxIndex, placedBoxIndex)
		offsets.set(geometry.edgeId, offset)
		placedBoxIndex.add(getLabelBox(geometry, offset))
	}

	return offsets
}

export function computeEdgeLabelLayout(
	edges: readonly XfEdge[],
	nodeLookup: Map<string, InternalNode>,
	labelSizes: ReadonlyMap<string, LabelSize> = new Map(),
	parallelEdgeDeltas: ReadonlyMap<string, number> = computeParallelEdgeDeltasByEdgeId(edges),
): Map<string, EdgeLabelLayoutEntry> {
	const geometries: EdgeGeometry[] = []

	for (const edge of edges) {
		const sourceNode = nodeLookup.get(edge.source)
		const targetNode = nodeLookup.get(edge.target)
		if (!sourceNode?.measured || !targetNode?.measured) {
			continue
		}

		const sortedNodes = [sourceNode, targetNode].sort((a, b) =>
			compareIds(a.id, b.id),
		)
		const { sx, sy, tx, ty } = getEdgeParams(sortedNodes[0], sortedNodes[1])

		const pathDelta = parallelEdgeDeltas.get(edge.id) ?? 0
		const deltaMultiplier = computeDeltaMultiplier()
		const size = labelSizes.get(edge.id) ?? DEFAULT_LABEL_SIZE
		const { labelX, labelY } = getSpecialPath(
			{ sourceX: sx, sourceY: sy, targetX: tx, targetY: ty },
			pathDelta,
			deltaMultiplier,
		)

		const dx = tx - sx
		const dy = ty - sy
		const length = Math.sqrt(dx * dx + dy * dy) || 1

		geometries.push({
			edgeId: edge.id,
			labelX,
			labelY,
			nx: -dy / length,
			ny: dx / length,
			pathDelta,
			deltaMultiplier,
			size,
		})
	}

	const nodeBoxes = getNodeBoxes(nodeLookup)
	const extraOffsets = resolveCollisions(geometries, nodeBoxes)
	const layout = new Map<string, EdgeLabelLayoutEntry>()

	for (const geometry of geometries) {
		layout.set(geometry.edgeId, {
			pathDelta: geometry.pathDelta,
			extraOffset: extraOffsets.get(geometry.edgeId) ?? 0,
			deltaMultiplier: geometry.deltaMultiplier,
		})
	}

	return layout
}
