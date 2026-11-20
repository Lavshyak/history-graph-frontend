import {BaseEdge, EdgeLabelRenderer, type EdgeProps, useInternalNode, useStore,} from '@xyflow/react'

import {memo, type RefObject, useCallback, useContext, useLayoutEffect, useMemo, useRef, useState,} from 'react'

import {Button, Collapse, Flex} from 'antd'

import type { XfEdge } from '@/shared/types/xyflow.ts'
import type { EdgeData } from '@/model/edge/edgeData.ts'
import { EdgeDatasStateManagerContext } from '@/model/graph/edgeDatasStateManagerContext.ts'
import { EdgeLabelLayoutVersionContext, EdgeLabelReportSizeContext, EditableContext, edgeLabelViewportMoving } from '@/entities/EdgeLabelLayout/contexts.ts'
import type { LabelSize } from '@/entities/EdgeLabelLayout/edgeLabelLayout.ts'
import { getEdgeParams } from '@/entities/FloatingEdge/getEdgeParams.ts'
import { getSpecialPath } from '@/entities/EdgeLabelLayout/getSpecialPath.ts'
import { useKeyedEventHandling } from '@/shared/hooks/useKeyedEventHandling.ts'
import RenderCountView from "@/shared/dev/RenderCountView.tsx";
import {createRenderCountDict} from "@/shared/dev/useRenderCountDictRef.tsx";
import {useEdgeLayoutGetterByIdContext} from "@/entities/EdgeLabelLayout/edgeLayoutGetterByIdContext.ts";

const FloatingEdge = memo(FloatingEdge1)

export default FloatingEdge

// Запас в пикселях экрана: лейбл чуть за границей вьюпорта всё ещё рендерим,
// чтобы при небольшом сдвиге карточка не появлялась «из ниоткуда».
const VISIBLE_LABEL_MARGIN = 256
// Гистерезис: пока карточка смонтирована, она живёт до границы
// margin + hysteresis. При быстром панорамировании без этого карточки
// монтировались/размонтировались пачками каждый кадр.
const VISIBLE_LABEL_HYSTERESIS = 256
// Во сколько размеров вьюпорта должен укладываться «размах» связи, чтобы
// рисовать её SVG-путь. Параллельные связи разъезжаются на десятки тысяч
// пикселей; такие пути не видны, но браузер всё равно держит их в SVG-слое и
// перестраивает display list при каждом сдвиге графа.
const EDGE_NEAR_VIEWPORT_FACTOR = 2

function compareIds(a: string, b: string): number {
	return a < b ? -1 : a > b ? 1 : 0
}

function FloatingEdge1(props: EdgeProps<XfEdge>) {

	const {
		id: thisEdgeId,
			source,
			target,
			markerEnd,
			style,
	} = props

	const edgeDatasStateManagerContext = useContext(EdgeDatasStateManagerContext)

	const [data, setData] = useState(
		edgeDatasStateManagerContext.allEdgeDatasMap.get(thisEdgeId),
	)

	useKeyedEventHandling(
		edgeDatasStateManagerContext.edgesStateEvents.edgeDataUpdatedEvent,
		thisEdgeId,
		({ newEdgeData }) => {
			setData(newEdgeData)
		},
	)

	if (!data) {
		throw new Error('no data')
	}

	const isGenerallyMarkedForDelete =
		data.isExplicitlyMarkedForDelete ||
		data.markedForDeleteBecauseNodes.length > 0

	const sourceNode = useInternalNode(source)
	const targetNode = useInternalNode(target)

	const isEditable = useContext(EditableContext)
	const reportSize = useContext(EdgeLabelReportSizeContext)
	// Подписка на версию раскладки: после её пересчёта (например, когда нода
	// отпущена) ребро должно перерисоваться и взять новые смещения. Само
	// значение не нужно — раскладка читается через геттер по id.
	useContext(EdgeLabelLayoutVersionContext)

	const labelCardRef = useRef<HTMLDivElement>(null)

	const layoutEntry = useEdgeLayoutGetterByIdContext().get(thisEdgeId)
	const pathDelta = layoutEntry?.pathDelta ?? 0
	const extraOffset = layoutEntry?.extraOffset ?? 0
	const deltaMultiplier = layoutEntry?.deltaMultiplier ?? 300

	// Путь зависит от позиций обеих нод и от текущей раскладки лейбла
	// (pathDelta/extraOffset), поэтому все они в зависимостях. Раньше здесь
	// стояли только sx/sy, и путь застревал при изменении только лейбла.
	const edgeGeometry = useMemo(() => {
		if (!sourceNode?.measured || !targetNode?.measured) {
			return null
		}

		// без сортировки связи например с currentDelta 1 и -1 могли накладываться друг на друга, если ведут в разные стороны
		// наверно какие-то математические приколы
		const sorted = [sourceNode, targetNode].sort((a, b) =>
			compareIds(a.id, b.id),
		)
		const { sx, sy, tx, ty } = getEdgeParams(sorted[0], sorted[1])

		return getSpecialPath(
			{
				sourceX: sx,
				sourceY: sy,
				targetX: tx,
				targetY: ty,
			},
			pathDelta,
			deltaMultiplier,
			extraOffset,
		)
	}, [sourceNode, targetNode, pathDelta, deltaMultiplier, extraOffset])

	const strokeColor = (() => {
		if (isGenerallyMarkedForDelete) return '#ff000044'
		if (data.sourceOrCreated == 'created') return '#328f4b'
		return '#b1b1b7'
	})()

	// Колбэк стабилен, чтобы memo-карточка не перерисовывалась на каждый кадр
	// перетаскивания ноды.
	const onToggleDelete = useCallback(() => {
		const currentData = edgeDatasStateManagerContext.allEdgeDatasMap.get(thisEdgeId)
		if (!currentData) return
		edgeDatasStateManagerContext.markEdgeForDelete(
			thisEdgeId,
			!currentData.isExplicitlyMarkedForDelete,
		)
	}, [edgeDatasStateManagerContext, thisEdgeId])

	// Позиция карточки в координатах графа. Нужна до условного возврата, чтобы
	// хук видимости вызывался всегда.
	const labelX = edgeGeometry?.labelX ?? 0
	const labelY = edgeGeometry?.labelY ?? 0

	// Параллельных связей может быть тысяча, и их карточки разлетаются далеко
	// за пределы вьюпорта. Рендерим лейбл только когда он рядом с видимой
	// областью: иначе React каждый кадр держит в дереве тысячи порталов
	// EdgeLabelRenderer, и любое движение графа стоит очень дорого.
	// Возвращаем число: 0 — связь не рисуем совсем, 1 — только путь,
	// 2 — путь и карточку. Селектор отдаёт примитив, поэтому при
	// панорамировании рёбра перерисовываются только когда видимость меняется.
	// У границ добавлен гистерезис, чтобы на быстром движении карточки не
	// появлялись и не исчезали каждый кадр.
	const wasLabelRenderedRef = useRef(false)
	const edgeVisibility = useStore(state => {
		const [translateX, translateY, zoom] = state.transform
		const screenX = labelX * zoom + translateX
		const screenY = labelY * zoom + translateY

		const labelMargin = wasLabelRenderedRef.current
			? VISIBLE_LABEL_MARGIN + VISIBLE_LABEL_HYSTERESIS
			: VISIBLE_LABEL_MARGIN
		const labelWidth = state.width + labelMargin
		const labelHeight = state.height + labelMargin
		const labelVisible =
			screenX >= -labelMargin &&
			screenX <= labelWidth &&
			screenY >= -labelMargin &&
			screenY <= labelHeight

		// Во время движения вьюпорта новые карточки не монтируем: это самая
		// дорогая часть (antd Collapse + стили), а при быстрой панораме таких
		// карточек появляются десятки. Уже смонтированные продолжают ехать
		// вместе с графом. Накопившиеся монтируются после остановки — провайдер
		// в этот момент увеличивает версию раскладки, и ребро перерисовывается.
		if (labelVisible && (!edgeLabelViewportMoving.current || wasLabelRenderedRef.current)) {
			return 2
		}

		const nearMargin =
			Math.max(state.width, state.height, 1) * EDGE_NEAR_VIEWPORT_FACTOR
		if (
			screenX >= -nearMargin &&
			screenX <= state.width + nearMargin &&
			screenY >= -nearMargin &&
			screenY <= state.height + nearMargin
		) {
			return 1
		}

		return 0
	})
	wasLabelRenderedRef.current = edgeVisibility === 2

	if (!edgeGeometry || edgeVisibility === 0) {
		return null
	}

	const { path } = edgeGeometry

	return (
		<>
			<BaseEdge
				id={thisEdgeId}
				className='react-flow__edge-path'
				path={path}
				markerEnd={markerEnd}
				style={{ ...style, stroke: strokeColor }}
			/>
			{edgeVisibility === 2 && (
			<EdgeLabelRenderer>
				<div
					className='nodrag nopan'
					style={{
						position: 'absolute',
						pointerEvents: 'all',
						transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
						overflow: 'hidden',
					}}
				>
					<FloatingEdgeLabelCard
						edgeId={thisEdgeId}
						data={data}
						isEditable={isEditable}
						isGenerallyMarkedForDelete={isGenerallyMarkedForDelete}
						onToggleDelete={onToggleDelete}
						reportSize={reportSize}
						cardRef={labelCardRef}
					/>
				</div>
			</EdgeLabelRenderer>
			)}
		</>
	)
}

type FloatingEdgeLabelCardProps = {
	edgeId: string
	data: EdgeData
	isEditable: boolean
	isGenerallyMarkedForDelete: boolean
	onToggleDelete: () => void
	reportSize: (edgeId: string, size: LabelSize) => void
	cardRef: RefObject<HTMLDivElement | null>
}

// Тяжёлая часть ребра (antd Collapse с карточкой) вынесена в memo: при
// перетаскивании ноды меняется только transform обёртки, а карточка
// перерисовывается лишь при изменении данных ребра.
const FloatingEdgeLabelCard = memo(FloatingEdgeLabelCard1)

function FloatingEdgeLabelCard1({
	edgeId,
	data,
	isEditable,
	isGenerallyMarkedForDelete,
	onToggleDelete,
	reportSize,
	cardRef,
}: FloatingEdgeLabelCardProps) {
	const {increaseRenderCountDict, renderCountDictView} = useRef(createRenderCountDict()).current
	increaseRenderCountDict("FloatingEdgeLabelCard")

	// Report the real rendered card size so the layout can separate cards using
	// their actual dimensions instead of hardcoded guesses.
	useLayoutEffect(() => {
		const element = cardRef.current
		if (!element) return

		const measure = () => {
			// offsetWidth/offsetHeight are layout sizes in flow units: they are
			// unaffected by the viewport zoom and by the translate() that moves
			// the card, unlike getBoundingClientRect().
			reportSize(edgeId, {
				width: element.offsetWidth,
				height: element.offsetHeight,
			})
		}

		// Никакого синхронного замера при монтировании: чтение offsetWidth
		// внутри useLayoutEffect форсирует reflow всего документа, а при быстрой
		// панораме карточки монтируются пачками — это и давало подвисания.
		// ResizeObserver сам пришлёт первое измерение после того, как браузер
		// посчитает layout, одним батчем на все карточки.
		const observer = new ResizeObserver(measure)
		observer.observe(element)
		return () => observer.disconnect()
	}, [edgeId, reportSize, cardRef])

	const currentData = data.currentData

	return (
		<div
			ref={cardRef}
			style={{
				position: 'relative',
			}}
		>
			<div
				style={{
					position: 'absolute',
					backgroundColor: data.isExplicitlyMarkedForDelete
						? 'red'
						: data.sourceOrCreated == 'created'
							? 'green'
							: 'white',
					width: '100%',
					height: '100%',
					opacity: isGenerallyMarkedForDelete ? '0.1' : '0.5',
					zIndex: -1,
					borderRadius: 10,
				}}
			/>
			<Collapse
				items={[
					{
						label: (
							<Flex vertical>
								{renderCountDictView({})}
								<RenderCountView/>
								<div>{currentData.label}</div>
								<div>{currentData.id}</div>
							</Flex>
						),
						children: (
							<Flex
								vertical
								style={{
									background: 'transparent',
								}}
							>
								<Button
									disabled={!isEditable}
									onClick={onToggleDelete}
								>
									{data.isExplicitlyMarkedForDelete
										? 'undo delete'
										: 'delete'}
								</Button>
							</Flex>
						),
					},
				]}
			/>
		</div>
	)
}
