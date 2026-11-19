import type {NodeChange} from "@xyflow/react";
import type {XfNode} from "@/shared/types/xyflow.ts";
import {useCallback, useRef} from "react";

export function useOnNodesChangeRaf(applyXfNodeChanges: (nodeChanges: NodeChange<XfNode>[]) => void) {
    const frameRef = useRef<number | null>(null)
    return useCallback(
        (changes: NodeChange<XfNode>[]) => {
            const positionChanges = changes.filter(
                change => change.type === 'position',
            )
            if (positionChanges.length > 0) {
                if (frameRef.current === null) {
                    frameRef.current = requestAnimationFrame(() => {
                        applyXfNodeChanges(positionChanges)
                        frameRef.current = null
                    })
                }
            }

            const otherChanges = changes.filter(change => change.type !== 'position')
            if (otherChanges.length > 0) {
                applyXfNodeChanges(otherChanges)
            }
        },
        [applyXfNodeChanges],
    )
}