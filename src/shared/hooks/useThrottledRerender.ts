import {useCallback, useEffect, useRef, useState} from 'react'

/**
 * Возвращает «перерисуйся», схлопывающее частые вызовы в один рендер не чаще
 * одного раза в `intervalMs` (с гарантированным trailing-рендером).
 *
 * Нужно для подписок на события, которые приходят пачками: при инициализации
 * графа из 1000 нод/связей событие добавления приходит на каждый элемент, и
 * перерисовка тяжёлого списка на каждое давала ~секунду блокировки главного
 * потока.
 */
export function useThrottledRerender(intervalMs: number = 150) {
    const [, setVersion] = useState(0)
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const lastRenderTimeRef = useRef(0)

    const requestRerender = useCallback(() => {
        if (timeoutRef.current !== null) return

        const delay = Math.max(0, intervalMs - (Date.now() - lastRenderTimeRef.current))
        timeoutRef.current = setTimeout(() => {
            timeoutRef.current = null
            lastRenderTimeRef.current = Date.now()
            setVersion(version => version + 1)
        }, delay)
    }, [intervalMs])

    useEffect(() => {
        return () => {
            if (timeoutRef.current !== null) {
                clearTimeout(timeoutRef.current)
                timeoutRef.current = null
            }
        }
    }, [])

    return requestRerender
}
