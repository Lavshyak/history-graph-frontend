import {BaseEdge, EdgeLabelRenderer, type EdgeProps, useInternalNode,} from '@xyflow/react'

import {
    memo,
    type CSSProperties,
    type RefObject,
    useCallback,
    useContext,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
} from 'react'

import {Button, Collapse, Flex} from 'antd'

import type {XfEdge} from '@/shared/types/xyflow.ts'
import type {EdgeData} from '@/model/edge/edgeData.ts'
import {EdgeDatasStateManagerContext} from '@/model/graph/edgeDatasStateManagerContext.ts'
import {
    EdgeLabelReportSizeContext,
    EdgeLabelLayoutContext,
    EditableContext
} from '@/entities/EdgeLabelLayout/contexts.ts'
import type {LabelSize} from '@/entities/EdgeLabelLayout/edgeLabelLayout.ts'
import {getEdgeParams} from '@/entities/FloatingEdge/getEdgeParams.ts'
import {getSpecialPath} from '@/entities/EdgeLabelLayout/getSpecialPath.ts'
import {useKeyedEventHandling} from '@/shared/hooks/useKeyedEventHandling.ts'
import RenderCountView from "@/shared/dev/RenderCountView.tsx";
import {createRenderCountDict} from "@/shared/dev/useRenderCountDictRef.tsx";
import {devLog} from "@/shared/dev/isDevLoggingEnabled.ts";

const FloatingEdge = memo(FloatingEdge1)

export default FloatingEdge

// Запас в пикселях экрана: лейбл чуть за границей вьюпорта всё ещё рендерим,
// чтобы при небольшом сдвиге карточка не появлялась «из ниоткуда».
function compareIds(a: string, b: string): number {
    return a < b ? -1 : a > b ? 1 : 0
}

type EdgePathLayerProps = {
    id: string
    path: string
    markerEnd: EdgeProps<XfEdge>['markerEnd']
    style: CSSProperties | undefined
}

// memo: ребро перерисовывается после пересчёта раскладки, но путь и цвет при
// этом обычно те же — в профилере BaseEdge съедал ~100 мс на 900 рёбер именно
// из-за нового объекта style и пересоздания SVG-пути. С memo сам <path> не
// трогается, пока не изменились path/markerEnd/style.
const EdgePathLayer = memo(function EdgePathLayer({id, path, markerEnd, style}: EdgePathLayerProps) {
    devLog("EdgePathLayer", true)
    return (
        <BaseEdge
            id={id}
            className='react-flow__edge-path'
            path={path}
            markerEnd={markerEnd}
            style={style}
        />
    )
})

function FloatingEdge1(props: EdgeProps<XfEdge>) {
    devLog("FloatingEdge1", true)
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
        ({newEdgeData}) => {
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

    const labelCardRef = useRef<HTMLDivElement>(null)

    const edgeLabelLayout = useContext(EdgeLabelLayoutContext)
    const layoutEntry = edgeLabelLayout.get(thisEdgeId)
    const pathDelta = layoutEntry?.pathDelta ?? 0
    const extraOffset = layoutEntry?.extraOffset ?? 0
    const deltaMultiplier = layoutEntry?.deltaMultiplier ?? 300

    // Путь зависит от позиций обеих нод и от текущей раскладки лейбла
    // (pathDelta/extraOffset), поэтому все они в зависимостях. Раньше здесь
    // стояли только sx/sy, и путь застревал при изменении только лейбла.
    const edgeGeometry = useMemo(() => {
        if (!sourceNode?.measured || !targetNode?.measured) {
            throw new Error("в таком случае возвращалось null")
        }

        // без сортировки связи например с currentDelta 1 и -1 могли накладываться друг на друга, если ведут в разные стороны
        // наверно какие-то математические приколы
        const sorted = [sourceNode, targetNode].sort((a, b) =>
            compareIds(a.id, b.id),
        )
        const {sx, sy, tx, ty} = getEdgeParams(sorted[0], sorted[1])

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

    // Стиль линии мемоизируем: BaseEdge — самый заметный по времени компонент
    // (в профилере 100 мс на 900 рёбер), а перерисовывался он из-за нового
    // объекта style на каждый рендер ребра.
    const edgePathStyle = useMemo(
        () => ({...style, stroke: strokeColor}),
        [style, strokeColor],
    )

    const {path, labelX, labelY} = edgeGeometry

    const baseEdgeMemoized = useMemo(() => <BaseEdge
        id={thisEdgeId}
        className='react-flow__edge-path'
        path={path}
        markerEnd={markerEnd}
        style={edgePathStyle}
    />, [edgePathStyle, markerEnd, path, thisEdgeId])

    if (!edgeGeometry) {
        throw new Error("раньше здесь было return null")
        //return null
    }

    return (
        <>
            {baseEdgeMemoized}
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
                        cardRef={labelCardRef}
                    />
                </div>
            </EdgeLabelRenderer>
        </>
    )
}

type FloatingEdgeLabelCardProps = {
    edgeId: string
    data: EdgeData
    isEditable: boolean
    isGenerallyMarkedForDelete: boolean
    onToggleDelete: () => void
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
                                    cardRef,
                                }: FloatingEdgeLabelCardProps) {
    devLog("FloatingEdgeLabelCard1", true)

    const reportSize = useContext(EdgeLabelReportSizeContext)

    useLayoutEffect(() => {
        const element = cardRef.current
        if (!element) return

        const reportElementSize = () => {
            const width = element.offsetWidth
            const height = element.offsetHeight
            if (width <= 0 || height <= 0) return

            reportSize(edgeId, {width, height})
        }

        reportElementSize()

        const resizeObserver = new ResizeObserver(reportElementSize)
        resizeObserver.observe(element)

        return () => resizeObserver.disconnect()
    }, [cardRef, edgeId, reportSize])

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
