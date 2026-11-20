import {useEffect, type RefObject} from 'react'
import {useReactFlow, useStoreApi, type Viewport} from '@xyflow/react'

// По этим элементам панорамирование не начинаем: ноды, контролы, панели
// (их тащат или кликают) и карточки связей/меню, помеченные nodrag/nopan.
const PAN_DISABLED_SELECTOR = [
    '.react-flow__node',
    '.react-flow__panel',
    '.react-flow__controls',
    '.react-flow__minimap',
    '.react-flow__attribution',
    '.react-flow__edgelabel-renderer',
    '.nodrag',
    '.nopan',
    '.context-menu',
].join(',')

/**
 * Панорамирование, склеенное по кадрам.
 *
 * Встроенный пан xyflow (d3-zoom) вызывает `store.setState({ transform })` на
 * КАЖДОЕ событие мыши. Замер на графе в 1000 связей: одно событие — ~3.8 мс
 * синхронной работы главного потока (уведомляются подписки каждого ребра и
 * обеих его нод). На быстром движении мыши это тысячи событий в секунду, и
 * главный поток встаёт колом.
 *
 * Здесь тот же пан, но вьюпорт применяется один раз на кадр, поэтому частота
 * событий мыши больше не влияет на нагрузку. `panOnDrag` у ReactFlow при этом
 * выключается, чтобы пан не отрабатывал дважды.
 */
export function useRafThrottledPan(containerRef: RefObject<HTMLDivElement | null>) {
    const reactFlow = useReactFlow()
    const store = useStoreApi()

    useEffect(() => {
        const container = containerRef.current
        if (!container) return

        let panPointerId: number | null = null
        let startClientX = 0
        let startClientY = 0
        let startViewport: Viewport | null = null
        let pendingViewport: Viewport | null = null
        let frameRef: number | null = null

        const applyPendingViewport = () => {
            frameRef = null
            if (pendingViewport === null) return

            const viewport = pendingViewport
            pendingViewport = null
            void reactFlow.setViewport(viewport)
        }

        const finishPan = () => {
            if (panPointerId === null) return

            panPointerId = null
            startViewport = null
            applyPendingViewport()
            store.setState({paneDragging: false})
        }

        const onPointerDown = (event: PointerEvent) => {
            if (panPointerId !== null) return
            // Мышь/перо, левая кнопка: тач не трогаем (там свои жесты пана/зума).
            if (event.pointerType === 'touch') return
            if (event.button !== 0) return

            const target = event.target
            if (!(target instanceof Element)) return
            if (target.closest(PAN_DISABLED_SELECTOR)) return

            const state = store.getState()
            if (state.connection.inProgress || state.userSelectionActive) return

            panPointerId = event.pointerId
            startClientX = event.clientX
            startClientY = event.clientY
            startViewport = reactFlow.getViewport()
            store.setState({paneDragging: true})
        }

        const onPointerMove = (event: PointerEvent) => {
            if (panPointerId !== event.pointerId || startViewport === null) return

            pendingViewport = {
                x: startViewport.x + (event.clientX - startClientX),
                y: startViewport.y + (event.clientY - startClientY),
                zoom: startViewport.zoom,
            }
            if (frameRef === null) {
                frameRef = requestAnimationFrame(applyPendingViewport)
            }
        }

        const onPointerUp = (event: PointerEvent) => {
            if (panPointerId !== event.pointerId) return
            finishPan()
        }

        container.addEventListener('pointerdown', onPointerDown)
        window.addEventListener('pointermove', onPointerMove)
        window.addEventListener('pointerup', onPointerUp)
        window.addEventListener('pointercancel', onPointerUp)

        return () => {
            container.removeEventListener('pointerdown', onPointerDown)
            window.removeEventListener('pointermove', onPointerMove)
            window.removeEventListener('pointerup', onPointerUp)
            window.removeEventListener('pointercancel', onPointerUp)
            if (frameRef !== null) {
                cancelAnimationFrame(frameRef)
            }
            pendingViewport = null
            panPointerId = null
        }
    }, [containerRef, reactFlow, store])
}
