import {createContext, useContext, useEffect, useMemo, useRef, useState} from "react";
import {emptyNormalListenableEvent, type NormalListenableEvent} from "@/shared/lib/events.ts";
import {
    type EdgePathChanging,
    type EdgePathEndTip,
    EdgePathPublishRequestContext
} from "@/entities/FloatingEdge/FloatingEdge.tsx";
import {useEventHandling} from "@/shared/hooks/useEventHandling.ts";

export const EdgePathChangedEventContext = createContext<NormalListenableEvent<EdgePathChanging>>(emptyNormalListenableEvent())

type EdgePath = {path: string, markerEnd?: string, endTip?: EdgePathEndTip}

// Все пути рёбер — независимые подпути ('M ...'), поэтому их можно склеить в один
// атрибут d. Порядок обхода Map — порядок добавления рёбер.
function buildCombinedPath(edgeIdToPathMap: ReadonlyMap<string, EdgePath>) {
    let d = ''
    for (const {path} of edgeIdToPathMap.values()) {
        d += path
    }
    return d
}

/* ---------- стрелки ---------- */

type ArrowStroke = {stroke: string, strokeWidth: number, d: string}
type ArrowPaths = {filled: Map<string, string>, stroked: Map<string, ArrowStroke>}

type MarkerFigure = {points: {x: number, y: number}[], closed: boolean}

type MarkerGeometry = MarkerFigure & {
    scaleX: number
    scaleY: number
    refX: number
    refY: number
    fill: string
    stroke: string
    strokeWidth: number
}

const MARKER_URL_RE = /^url\(['"]?#(.*?)['"]?\)$/

// markerEnd приходит из React Flow уже как url('#id'). Достаём id, чтобы найти
// <marker> в defs, которые рендерит React Flow.
function markerEndToId(markerEnd: string) {
    return MARKER_URL_RE.exec(markerEnd)?.[1] ?? null
}

// React Flow рисует встроенные стрелки как <polyline>/<polygon>, поэтому
// поддерживаем только их: для произвольного <path> пришлось бы трансформировать
// path data. Возвращает точки фигуры маркера в координатах его viewBox.
function readMarkerFigure(figure: Element): MarkerFigure | null {
    const tag = figure.tagName.toLowerCase()
    if (tag !== 'polyline' && tag !== 'polygon') return null

    const rawPoints = figure.getAttribute('points')
    if (!rawPoints) return null
    const numbers = rawPoints.trim().split(/[\s,]+/).map(Number)
    if (numbers.length < 6 || numbers.length % 2 !== 0 || numbers.some(Number.isNaN)) return null

    const points: {x: number, y: number}[] = []
    for (let i = 0; i < numbers.length; i += 2) {
        points.push({x: numbers[i], y: numbers[i + 1]})
    }

    const first = points[0]
    const last = points[points.length - 1]
    const repeatsFirstPoint = first.x === last.x && first.y === last.y
    const closed = tag === 'polygon' || (points.length > 2 && repeatsFirstPoint)
    if (closed && repeatsFirstPoint) points.pop()

    return {points, closed}
}

// Геометрия и стиль маркера: масштаб из viewBox в markerWidth/markerHeight,
// ref-точка (React Flow ставит refX/refY = 0, т.е. начало координат маркера
// совпадает с концом пути) и заливка/обводка фигуры.
// referenceStrokeWidth нужен для markerUnits="strokeWidth".
function readMarkerGeometry(marker: SVGMarkerElement, referenceStrokeWidth: number): MarkerGeometry | null {
    const figure = marker.querySelector('polyline, polygon')
    if (!figure) return null
    const shape = readMarkerFigure(figure)
    if (!shape) return null

    const viewBox = marker.viewBox.baseVal
    const markerWidth = marker.markerWidth.baseVal.value || 1
    const markerHeight = marker.markerHeight.baseVal.value || 1
    const viewBoxWidth = viewBox.width || markerWidth
    const viewBoxHeight = viewBox.height || markerHeight
    // SVG_MARKERUNITS_STROKEWIDTH === 2, иначе userSpaceOnUse
    const unitsScale = marker.markerUnits.baseVal === 2 ? referenceStrokeWidth : 1

    const figureStyle = getComputedStyle(figure)

    return {
        ...shape,
        scaleX: (markerWidth / viewBoxWidth) * unitsScale,
        scaleY: (markerHeight / viewBoxHeight) * unitsScale,
        refX: marker.refX.baseVal.value,
        refY: marker.refY.baseVal.value,
        fill: figureStyle.fill,
        stroke: figureStyle.stroke,
        strokeWidth: parseFloat(figureStyle.strokeWidth) || 1,
    }
}

// Переносит точки маркера в координаты графа: масштаб, поворот по касательной
// пути и сдвиг в конец пути. Все стрелки одного цвета/стиля складываются в один
// d, чтобы на весь слой хватило одного-двух <path>.
function appendArrow(arrows: ArrowPaths, marker: MarkerGeometry, endTip: EdgePathEndTip) {
    const cos = Math.cos(endTip.angle)
    const sin = Math.sin(endTip.angle)

    const parts: string[] = []
    for (let i = 0; i < marker.points.length; i++) {
        const point = marker.points[i]
        const localX = (point.x - marker.refX) * marker.scaleX
        const localY = (point.y - marker.refY) * marker.scaleY
        const x = endTip.x + localX * cos - localY * sin
        const y = endTip.y + localX * sin + localY * cos
        parts.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`)
    }
    if (marker.closed) parts.push('Z')
    const subpath = parts.join(' ')

    // Закрытые фигуры (ArrowClosed) заливаются, открытые (Arrow) только обводятся.
    // Ориентируемся именно на замкнутость: у открытой стрелки computed fill по
    // умолчанию чёрный (fill не задан), хотя заливать её нельзя, а у замкнутой
    // треугольник с fill: none должен остаться обводкой.
    if (marker.closed && marker.fill !== 'none') {
        arrows.filled.set(marker.fill, (arrows.filled.get(marker.fill) ?? '') + subpath)
        return
    }
    if (marker.stroke === 'none') return

    const key = `${marker.stroke}|${marker.strokeWidth}`
    const previous = arrows.stroked.get(key)
    arrows.stroked.set(key, {
        stroke: marker.stroke,
        strokeWidth: marker.strokeWidth,
        d: (previous?.d ?? '') + subpath,
    })
}

export function CombinedEdgesOur() {

    const edgeIdToPathMap = useRef<Map<string, EdgePath>>(new Map()).current
    // Пересобираем общий путь не на каждое событие, а один раз на пачку изменений:
    // при старте рёбра публикуют пути пачкой, и склейка строк N раз была бы O(N^2).
    const [pathRevision, setPathRevision] = useState(0)
    const [arrows, setArrows] = useState<ArrowPaths>(() => ({filled: new Map(), stroked: new Map()}))

    // Нужен, чтобы получить фактическую толщину линии: markerUnits="strokeWidth"
    // масштабирует стрелку именно от неё.
    const combinedPathRef = useRef<SVGPathElement>(null)

    const edgePathChangedEvent = useContext(EdgePathChangedEventContext)
    const edgePathPublishRequestEvent = useContext(EdgePathPublishRequestContext)

    useEventHandling(edgePathChangedEvent, edgePathChanging => {
        if(edgePathChanging.deleted){
            edgeIdToPathMap.delete(edgePathChanging.edgeId)
        }else{
            edgeIdToPathMap.set(edgePathChanging.edgeId, {
                path: edgePathChanging.path!,
                markerEnd: edgePathChanging.markerEnd,
                endTip: edgePathChanging.endTip,
            })
        }

        setPathRevision(revision => revision + 1)
    })

    const combinedPath = useMemo(
        () => buildCombinedPath(edgeIdToPathMap),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [pathRevision],
    )

    // Стрелки собираем после рендера: только тогда <marker> из defs React Flow уже
    // в DOM. Геометрия маркера читается из него, а все стрелки одного цвета/стиля
    // складываются в один <path> — на все рёбра остаётся 1 svg и 2-3 path.
    useEffect(() => {
        const referenceStrokeWidth = combinedPathRef.current
            ? parseFloat(getComputedStyle(combinedPathRef.current).strokeWidth) || 1
            : 1

        const nextArrows: ArrowPaths = {filled: new Map(), stroked: new Map()}
        const markerGeometries = new Map<string, MarkerGeometry | null>()

        for (const {markerEnd, endTip} of edgeIdToPathMap.values()) {
            if (!markerEnd || !endTip) continue

            let markerGeometry = markerGeometries.get(markerEnd)
            if (markerGeometry === undefined) {
                const markerId = markerEndToId(markerEnd)
                const markerElement = markerId ? document.getElementById(markerId) : null
                markerGeometry = markerElement instanceof SVGMarkerElement
                    ? readMarkerGeometry(markerElement, referenceStrokeWidth)
                    : null
                markerGeometries.set(markerEnd, markerGeometry)
            }

            if (markerGeometry) appendArrow(nextArrows, markerGeometry, endTip)
        }

        setArrows(nextArrows)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pathRevision])

    // Просим рёбра опубликовать пути заново: слой рёбер монтируется раньше портала
    // вьюпорта, поэтому их первые публикации проходят до нашей подписки. Этот эффект
    // объявлен после useEventHandling, т.е. подписка уже активна.
    useEffect(() => {
        edgePathPublishRequestEvent.emit()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    return (
            <svg className="react-flow__edges-combined" aria-hidden="true">
                <path
                    ref={combinedPathRef}
                    className="react-flow__edge-path-combined"
                    d={combinedPath}
                    fill="none"
                />
                {Array.from(arrows.filled, ([fill, d]) => (
                    <path
                        key={fill}
                        className="react-flow__edge-arrow-combined"
                        d={d}
                        fill={fill}
                        stroke="none"
                    />
                ))}
                {Array.from(arrows.stroked, ([key, arrow]) => (
                    <path
                        key={key}
                        className="react-flow__edge-arrow-combined"
                        d={arrow.d}
                        fill="none"
                        stroke={arrow.stroke}
                        strokeWidth={arrow.strokeWidth}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                ))}
            </svg>
    );
}