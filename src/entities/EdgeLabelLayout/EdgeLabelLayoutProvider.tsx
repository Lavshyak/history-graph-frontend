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
const LABEL_SIZE_SETTLE_DELAY_MS = 120

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
	const xyflowStore = useStoreApi()
	const [layoutVersion, setLayoutVersion] = useState(0)
	const isNodeDraggingRef = useRef(
		xyflowStore.getState().nodes.some(node => node.dragging === true),
	)

	useEffect(() => {
		const initialState = xyflowStore.getState()
		let previousNodes = initialState.nodes
		let previousNodeLookup = initialState.nodeLookup
		let wasDragging = isNodeDraggingRef.current

		const unsubscribe = xyflowStore.subscribe(state => {
			if (state.nodes !== previousNodes) {
				previousNodes = state.nodes
				isNodeDraggingRef.current = state.nodes.some(
					node => node.dragging === true,
				)
			}

			const isNodeDragging = isNodeDraggingRef.current
			const nodeLookupChanged = state.nodeLookup !== previousNodeLookup
			previousNodeLookup = state.nodeLookup

			if (wasDragging && !isNodeDragging) {
				// Перетаскивание закончилось — пересчитать по финальным позициям.
				setLayoutVersion(version => version + 1)
			} else if (nodeLookupChanged && !isNodeDragging) {
				// Обновить раскладку и для изменений нод вне перетаскивания.
				setLayoutVersion(version => version + 1)
			}

			wasDragging = isNodeDragging
		})

		return unsubscribe
	}, [xyflowStore])

	// Движение вьюпорта (панорамирование/зум) отслеживаем подпиской на стор
	// xyflow, а не через useStore: так провайдер не перерисовывается каждый кадр
	// панорамирования.
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

	// Keep measurements in a ref so each animation-frame batch doesn't render
	// the provider. The layout is invalidated once the measurements settle.
	const [labelSizesVersion, setLabelSizesVersion] = useState(0)
	const labelSizesRef = useRef<Map<string, LabelSize>>(new Map())

	// Замеры приходят от ResizeObserver'ов по одному. Копим их и применяем
	// пачкой раз в кадр, а раскладку пересчитываем после того, как размеры
	// перестали меняться.
	const pendingSizesRef = useRef<Map<string, LabelSize>>(new Map())
	const sizeFlushFrameRef = useRef<number | null>(null)
	const sizeLayoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

	const flushPendingSizes = useCallback(() => {
		sizeFlushFrameRef.current = null

		const pending = pendingSizesRef.current
		if (pending.size === 0) return
		pendingSizesRef.current = new Map()

		let hasChanges = false

		pending.forEach((size, edgeId) => {
			const existing = labelSizesRef.current.get(edgeId)
			if (existing && isSameSize(existing, size)) return
			labelSizesRef.current.set(edgeId, size)
			hasChanges = true
		})

		if (!hasChanges) return

		if (sizeLayoutTimerRef.current !== null) {
			clearTimeout(sizeLayoutTimerRef.current)
		}
		sizeLayoutTimerRef.current = setTimeout(() => {
			sizeLayoutTimerRef.current = null
			setLabelSizesVersion(version => version + 1)
		}, LABEL_SIZE_SETTLE_DELAY_MS)
	}, [])

	const reportSize = useCallback((edgeId: string, size: LabelSize) => {
		const existing = labelSizesRef.current.get(edgeId)
		const pending = pendingSizesRef.current.get(edgeId)
		// Ignore sub-pixel jitter to avoid an endless measure → relayout loop.
		if (pending && isSameSize(pending, size)) return
		if (existing && isSameSize(existing, size)) {
			pendingSizesRef.current.delete(edgeId)
			return
		}

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
			if (sizeLayoutTimerRef.current !== null) {
				clearTimeout(sizeLayoutTimerRef.current)
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
			// (layoutVersion), остановка вьюпорта (viewportSettleVersion) и
			// стабилизация размеров карточек (labelSizesVersion).
			void forcedRerenderValue
			void layoutVersion
			void viewportSettleVersion
			void labelSizesVersion

			// Пока нода перетаскивается или вьюпорт едет, оставляем предыдущую
			// раскладку: карточки всё равно едут вместе с графом, а раскладка
			// нужна только для разрешения коллизий. Пересчёт произойдёт сразу
			// после того, как движение затихло.
			if (isNodeDraggingRef.current || isViewportMovingRef.current) {
				return layoutMapRef.current
			}

			const v = computeEdgeLabelLayout(
				edges,
				xyflowStore.getState().nodeLookup,
				labelSizesRef.current,
				parallelEdgeDeltas,
			)
			layoutMapRef.current = v
			layoutVersionRef.current += 1
			return v
		},
		[
			edges,
			forcedRerenderValue,
			labelSizesVersion,
			parallelEdgeDeltas,
			xyflowStore,
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
