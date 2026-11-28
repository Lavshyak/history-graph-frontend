import {NodeChangeset, type NodeChange} from "@xyflow/react";
import type {XfNode} from "@/shared/types/xyflow.ts";
import {useCallback, useRef} from "react";

export function useOnNodesChangeRaf(applyXfNodeChanges: (nodeChanges: NodeChangeset<XfNode>) => void) {
    const frameRef = useRef<number | null>(null)
    const pendingPositionChangesRef = useRef<NodeChange<XfNode>[]>([])

    return useCallback(
        (changes: NodeChangeset<XfNode>) => {
            const positionChanges: NodeChange<XfNode>[] = []
            const otherChanges: NodeChange<XfNode>[] = []
            for (const change of changes) {
                if (change.type === 'position') positionChanges.push(change)
                else otherChanges.push(change)
            }

            if (positionChanges.length > 0) {
                // Копим изменения, а не отбрасываем: событий за кадр может быть
                // несколько, и раньше применялось только первое, из-за чего нода
                // отставала от курсора.
                pendingPositionChangesRef.current.push(...positionChanges)

                if (frameRef.current === null) {
                    frameRef.current = requestAnimationFrame(() => {
                        frameRef.current = null
                        const pendingPositionChanges = pendingPositionChangesRef.current
                        pendingPositionChangesRef.current = []
                        if (pendingPositionChanges.length > 0) {
                            applyXfNodeChanges(new NodeChangeset(pendingPositionChanges) )
                        }
                    })
                }
            }

            if (otherChanges.length > 0) {
                applyXfNodeChanges(new NodeChangeset(otherChanges))
            }
        },
        [applyXfNodeChanges],
    )
}