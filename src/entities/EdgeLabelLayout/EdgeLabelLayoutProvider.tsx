import { useStore, useStoreApi } from '@xyflow/react'
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
	EdgeLabelLayoutVersionContext,
	EdgeLabelReportSizeContext,
	edgeLabelViewportMoving,
} from '@/entities/EdgeLabelLayout/contexts.ts'
import {
	EdgeLayoutGetterByIdContext,
	type EdgeLayoutGetterByIdContextType
} from "@/entities/EdgeLabelLayout/edgeLayoutGetterByIdContext.ts";
import type {EdgeLabelLayoutEntry} from "@/entities/EdgeLabelLayout/edgeLabelLayout.ts";

type EdgeLabelLayoutProviderProps = {
	children: ReactNode
}

// Два размера считаются одинаковыми, если отличаются меньше чем на 2px:
// иначе карточка и раскладка бесконечно подталкивают друг друга.
const SIZE_JITTER_EPSILON = 2

// Через сколько после последнего сдвига вьюпорта считать раскладку. Пока
// вьюпорт едет (панорамирование/зум), в поле видимости попадают новые карточки,
// приходят их размеры — и раскладка на сотни связей пересчитывалась бы каждый
// кадр. Она нужна только для разрешения коллизий, поэтому считаем её один раз,
// когда движение затихло.
const VIEWPORT_SETTLE_DELAY_MS = 120

function isSameSize(a: LabelSize, b: LabelSize): boolean {
	return (
		Math.abs(a.width - b.width) < SIZE_JITTER_EPSILON &&
		Math.abs(a.height - b.height) < SIZE_JITTER_EPSILON
	)
}

export function EdgeLabelLayoutProvider({
	children,
}: EdgeLabelLayoutProviderProps) {
	// xyflow'воский стейт
	const edges = useStore(state => state.edges as XfEdge[])
	// nodeLookup получает новую identity на каждое изменение ноды (включая
	// перетаскивание), этого достаточно для пересчёта раскладки. Раньше здесь
	// ещё строилась строка-подпись по всем нодам на любое изменение стора.
	const nodeLookup = useStore(state => state.nodeLookup)
	// Пока нода тащится, раскладка не нужна: карточки и так едут за нодами
	// (путь каждой связи считается от их текущих позиций), а разрешение
	// коллизий меняется незаметно. Пересчитываем только когда перетаскивание
	// закончилось — иначе раскладка на сотни связей считалась каждый кадр.
	const isNodeDragging = useStore(state =>
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

	// Движение вьюпорта (панорамирование/зум) отслеживаем подпиской на стор
	// xyflow, а не через useStore: так провайдер не перерисовывается каждый кадр
	// панорамирования.
	const xyflowStore = useStoreApi()
	const isViewportMovingRef = useRef(false)
	const [viewportSettleVersion, setViewportSettleVersion] = useState(0)

	useEffect(() => {
		let settleFrameRef: number | null = null
		let lastTransformChangeTime = 0

		const checkViewportSettled = () => {
			if (
				performance.now() - lastTransformChangeTime <
				VIEWPORT_SETTLE_DELAY_MS
			) {
				settleFrameRef = requestAnimationFrame(checkViewportSettled)
				return
			}

			settleFrameRef = null
			isViewportMovingRef.current = false
			edgeLabelViewportMoving.current = false
			// Версия растёт не только при пересчёте раскладки, но и здесь:
			// рёбра должны перерисоваться и смонтировать карточки, которые
			// приехали в поле видимости во время движения.
			layoutVersionRef.current += 1
			setViewportSettleVersion(version => version + 1)
		}

		// Один rAF-цикл на жест вместо создания/сброса таймера на каждый кадр
		// панорамирования.
		const unsubscribe = xyflowStore.subscribe((state, previousState) => {
			if (state.transform === previousState.transform) return

			isViewportMovingRef.current = true
			edgeLabelViewportMoving.current = true
			lastTransformChangeTime = performance.now()
			if (settleFrameRef === null) {
				settleFrameRef = requestAnimationFrame(checkViewportSettled)
			}
		})

		return () => {
			if (settleFrameRef !== null) {
				cancelAnimationFrame(settleFrameRef)
			}
			isViewportMovingRef.current = false
			edgeLabelViewportMoving.current = false
			unsubscribe()
		}
	}, [xyflowStore])

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
		() => computeParallelEdgeDeltasByEdgeId(edges),
		[edges],
	)

	const layoutMapRef = useRef<Map<string, EdgeLabelLayoutEntry>>(new Map())
	// Версия увеличивается только при реальном пересчёте раскладки — по ней
	// рёбра понимают, что пора перерисоваться с новыми смещениями.
	const layoutVersionRef = useRef(0)

	const layout = useMemo(
		() => {
			// Намеренные ключи инвалидации: внешний запрос «пересчитай»
			// (forcedRerenderValue), факт окончания перетаскивания ноды
			// (layoutVersion) и остановка вьюпорта (viewportSettleVersion).
			void forcedRerenderValue
			void layoutVersion
			void viewportSettleVersion

			// Пока нода перетаскивается или вьюпорт едет, оставляем предыдущую
			// раскладку: карточки всё равно едут вместе с графом, а раскладка
			// нужна только для разрешения коллизий. Пересчёт произойдёт сразу
			// после того, как движение затихло.
			if (isNodeDragging || isViewportMovingRef.current) {
				return layoutMapRef.current
			}

			const v = computeEdgeLabelLayout(
				edges,
				nodeLookup,
				labelSizes,
				parallelEdgeDeltas,
			)
			layoutMapRef.current = v
			layoutVersionRef.current += 1
			return v
		},
		[
			edges,
			nodeLookup,
			forcedRerenderValue,
			labelSizes,
			parallelEdgeDeltas,
			isNodeDragging,
			layoutVersion,
			viewportSettleVersion,
		],
	)

	const edgeLayoutGetterById = useRef<EdgeLayoutGetterByIdContextType>({
		get : (edgeId) => layoutMapRef.current.get(edgeId)
	}).current

	return (
		<EdgeLayoutGetterByIdContext.Provider value={edgeLayoutGetterById}>
		<EdgeLabelReportSizeContext.Provider value={reportSize}>
			<EdgeLabelLayoutVersionContext.Provider value={layoutVersionRef.current}>
			<EdgeLabelLayoutContext.Provider value={layout}>
				{children}
			</EdgeLabelLayoutContext.Provider>
			</EdgeLabelLayoutVersionContext.Provider>
		</EdgeLabelReportSizeContext.Provider>
		</EdgeLayoutGetterByIdContext.Provider>
	)
}
