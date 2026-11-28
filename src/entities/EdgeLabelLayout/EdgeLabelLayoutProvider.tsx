import {useNodesInitialized, useReactFlowStoreApi} from '@xyflow/react'
import {
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo, useRef,
	useState,
} from 'react'

import type { XfEdge, XfNode } from '@/shared/types/xyflow.ts'
import { ForceRerenderContext } from '@/model/graph/forceRerenderContext.ts'
import {
	computeEdgeLabelLayout,
	computeParallelEdgeDeltasByEdgeId,
	type LabelSize,
} from '@/entities/EdgeLabelLayout/edgeLabelLayout.ts'
import {
	EdgeLabelLayoutContext,
	EdgeLabelReportSizeContext,
} from '@/entities/EdgeLabelLayout/contexts.ts'
import type {EdgeLabelLayoutEntry} from "@/entities/EdgeLabelLayout/edgeLabelLayout.ts";
import {XfEdgesContext} from "@/model/graph/xfEdgesContext.ts";

type EdgeLabelLayoutProviderProps = {
	children: ReactNode
	isNodeDragging: boolean
	nodeCount: number
	layoutRevision: number
}

// Два размера считаются одинаковыми, если отличаются меньше чем на 4px:
// иначе карточка и раскладка бесконечно подталкивают друг друга.
const SIZE_JITTER_EPSILON = 4

function isSameSize(a: LabelSize, b: LabelSize): boolean {
	return (
		Math.abs(a.width - b.width) < SIZE_JITTER_EPSILON &&
		Math.abs(a.height - b.height) < SIZE_JITTER_EPSILON
	)
}

function isSameLayout(
	current: ReadonlyMap<string, EdgeLabelLayoutEntry>,
	next: ReadonlyMap<string, EdgeLabelLayoutEntry>,
): boolean {
	if (current.size !== next.size) return false

	for (const [edgeId, nextEntry] of next) {
		const currentEntry = current.get(edgeId)
		if (
			!currentEntry ||
			currentEntry.pathDelta !== nextEntry.pathDelta ||
			currentEntry.extraOffset !== nextEntry.extraOffset ||
			currentEntry.deltaMultiplier !== nextEntry.deltaMultiplier
		) {
			return false
		}
	}

	return true
}

export function EdgeLabelLayoutProvider({
	children,
	isNodeDragging,
	nodeCount,
	layoutRevision,
}: EdgeLabelLayoutProviderProps) {
	const {nodesStore} = useReactFlowStoreApi<XfNode, XfEdge>()
	const nodesInitialized = useNodesInitialized()
	const xfEdges = useContext(XfEdgesContext)
	// Пока нода тащится, раскладка не нужна: карточки и так едут за нодами
	// (путь каждой связи считается от их текущих позиций), а разрешение
	// коллизий меняется незаметно. Пересчитываем только когда перетаскивание
	// закончилось — иначе раскладка на сотни связей считалась каждый кадр.
	// Движение вьюпорта (панорамирование/зум) раскладку не инвалидирует:
	// панорамирование не меняет позиции нод, а значит и смещения лейблов.

	const { forcedRerenderValue } = useContext(ForceRerenderContext)

	// Real, freshly measured sizes of the rendered relationship label cards.
	const [labelSizes, setLabelSizes] = useState<ReadonlyMap<string, LabelSize>>(
		() => new Map(),
	)
	const labelSizesRef = useRef(labelSizes)
	labelSizesRef.current = labelSizes

	// Замеры приходят от ResizeObserver'ов по одному. Копим их и применяем
	// пачкой раз в кадр: иначе на каждый лейбл пересчитывалась вся раскладка и
	// ре-рендерились все рёбра.
	const pendingSizesRef = useRef<Map<string, LabelSize>>(new Map())
	const sizeFlushFrameRef = useRef<number | null>(null)

	useEffect(() => {
		const activeEdgeIds = new Set(xfEdges.map(edge => edge.id))

		for (const edgeId of pendingSizesRef.current.keys()) {
			if (!activeEdgeIds.has(edgeId)) {
				pendingSizesRef.current.delete(edgeId)
			}
		}

		setLabelSizes(previous => {
			let hasRemovedSizes = false
			const next = new Map<string, LabelSize>()

			for (const [edgeId, size] of previous) {
				if (activeEdgeIds.has(edgeId)) {
					next.set(edgeId, size)
				} else {
					hasRemovedSizes = true
				}
			}

			return hasRemovedSizes ? next : previous
		})
	}, [xfEdges])

	const flushPendingSizes = useCallback(() => {
		sizeFlushFrameRef.current = null

		const pending = pendingSizesRef.current
		if (pending.size === 0) return
		pendingSizesRef.current = new Map()

		setLabelSizes(previous => {
			const next = new Map(previous)
			let hasChanges = false

			pending.forEach((size, edgeId) => {
				const existing = next.get(edgeId)
				if (existing && isSameSize(existing, size)) return
				next.set(edgeId, size)
				hasChanges = true
			})

			return hasChanges ? next : previous
		})
	}, [])

	const reportSize = useCallback((edgeId: string, size: LabelSize) => {
		const existing = labelSizesRef.current.get(edgeId)
		// Ignore sub-pixel jitter to avoid an endless measure → relayout loop.
		if (existing && isSameSize(existing, size)) return

		pendingSizesRef.current.set(edgeId, size)
		if (sizeFlushFrameRef.current === null) {
			sizeFlushFrameRef.current = requestAnimationFrame(flushPendingSizes)
		}
	}, [flushPendingSizes])

	useEffect(() => {
		return () => {
			if (sizeFlushFrameRef.current !== null) {
				cancelAnimationFrame(sizeFlushFrameRef.current)
			}
		}
	}, [])

	// Группы параллельных связей пересчитываются только при изменении набора
	// связей, а не на каждый кадр перетаскивания нод.
	const parallelEdgeDeltas = useMemo(
		() => computeParallelEdgeDeltasByEdgeId(xfEdges),
		[xfEdges],
	)

	const layoutMapRef = useRef<Map<string, EdgeLabelLayoutEntry>>(new Map())
	const layout = useMemo(
		() => {
			// Invalidation signals trigger a fresh store snapshot without subscribing to node positions.
			void forcedRerenderValue
			void nodeCount
			void nodesInitialized
			void layoutRevision

			// Пока нода перетаскивается, оставляем предыдущую раскладку:
			// карточки всё равно едут вместе с графом, а раскладка нужна только
			// для разрешения коллизий. Пересчёт произойдёт сразу после того, как
			// нода отпущена.
			if (isNodeDragging) {
				return layoutMapRef.current
			}

			const nodeLookup = nodesStore.getState().nodeLookup
			const nextLayout = computeEdgeLabelLayout(
				xfEdges,
				nodeLookup,
				labelSizes,
				parallelEdgeDeltas,
			)
			const isUnchanged = isSameLayout(layoutMapRef.current, nextLayout)

			if (isUnchanged) {
				return layoutMapRef.current
			}

			layoutMapRef.current = nextLayout
			return nextLayout
		},
		[
			xfEdges,
			nodesStore,
			forcedRerenderValue,
			labelSizes,
			parallelEdgeDeltas,
			isNodeDragging,
			nodeCount,
			nodesInitialized,
			layoutRevision,
		],
	)

	return (
		<EdgeLabelReportSizeContext.Provider value={reportSize}>
			<EdgeLabelLayoutContext.Provider value={layout}>
				{children}
			</EdgeLabelLayoutContext.Provider>
		</EdgeLabelReportSizeContext.Provider>
	)
}
