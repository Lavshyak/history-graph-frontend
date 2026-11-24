import {useInternalNode, useNodesStore} from '@xyflow/react'
import {
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo, useRef,
	useState,
} from 'react'

import type { XfEdge } from '@/shared/types/xyflow.ts'
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
import {
	EdgeLayoutGetterByIdContext,
	type EdgeLayoutGetterByIdContextType
} from "@/entities/EdgeLabelLayout/edgeLayoutGetterByIdContext.ts";
import type {EdgeLabelLayoutEntry} from "@/entities/EdgeLabelLayout/edgeLabelLayout.ts";
import {now} from "lodash";
import {XfEdgesContext} from "@/widgets/GraphBoard/GraphBoard.tsx";

type EdgeLabelLayoutProviderProps = {
	children: ReactNode
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

export function EdgeLabelLayoutProvider({
	children,
}: EdgeLabelLayoutProviderProps) {
	return children;
	// xyflow'воский стейт
	const xfEdges = useContext(XfEdgesContext)
	// nodeLookup получает новую identity на каждое изменение ноды (включая
	// перетаскивание), этого достаточно для пересчёта раскладки. Раньше здесь
	// ещё строилась строка-подпись по всем нодам на любое изменение стора.
	const nodeLookup = useNodesStore(state => state.nodeLookup)
	// Пока нода тащится, раскладка не нужна: карточки и так едут за нодами
	// (путь каждой связи считается от их текущих позиций), а разрешение
	// коллизий меняется незаметно. Пересчитываем только когда перетаскивание
	// закончилось — иначе раскладка на сотни связей считалась каждый кадр.
	const isNodeDragging = useNodesStore(state =>
		state.nodes.some(node => node.dragging === true),
	)
	const [layoutVersion, setLayoutVersion] = useState(0)
	const wasDraggingRef = useRef(isNodeDragging)

	useEffect(() => {
		if (wasDraggingRef.current && !isNodeDragging) {
			// Перетаскивание только что закончилось — посчитать раскладку по
			// финальным позициям.
			setLayoutVersion(version => version + 1)
		}
		wasDraggingRef.current = isNodeDragging
	}, [isNodeDragging])

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
	// Версия увеличивается только при реальном пересчёте раскладки — по ней
	// рёбра понимают, что пора перерисоваться с новыми смещениями.
	const layoutVersionRef = useRef(0)

	const layout = useMemo(
		() => {
			// Намеренные ключи инвалидации: внешний запрос «пересчитай»
			// (forcedRerenderValue) и факт окончания перетаскивания ноды
			// (layoutVersion).
			void forcedRerenderValue
			void layoutVersion

			// Пока нода перетаскивается, оставляем предыдущую раскладку:
			// карточки всё равно едут вместе с графом, а раскладка нужна только
			// для разрешения коллизий. Пересчёт произойдёт сразу после того, как
			// нода отпущена.
			if (isNodeDragging) {
				return layoutMapRef.current
			}

			const v = computeEdgeLabelLayout(
				xfEdges,
				nodeLookup,
				labelSizes,
				parallelEdgeDeltas,
			)
			layoutMapRef.current = v
			layoutVersionRef.current += 1
			return v
		},
		[
			xfEdges,
			nodeLookup,
			forcedRerenderValue,
			labelSizes,
			parallelEdgeDeltas,
			isNodeDragging,
			layoutVersion,
		],
	)

	const edgeLayoutGetterById = useRef<EdgeLayoutGetterByIdContextType>({
		get : (edgeId) => layoutMapRef.current.get(edgeId)
	}).current

	return children;
	return (
		<EdgeLayoutGetterByIdContext.Provider value={edgeLayoutGetterById}>
		<EdgeLabelReportSizeContext.Provider value={reportSize}>
			<EdgeLabelLayoutContext.Provider value={layout}>
				{children}
			</EdgeLabelLayoutContext.Provider>
		</EdgeLabelReportSizeContext.Provider>
		</EdgeLayoutGetterByIdContext.Provider>
	)
}
