import type {EdgeDatasStateManager} from "@/model/edge/createEdgeDatasStateManager.ts";
import {useLocalState} from "@/shared/hooks/useLocalState.ts";
import type {XfEdge} from "@/shared/types/xyflow.ts";
import type {EdgeDataIdType} from "@/model/edge/edgeData.ts";
import {applyEdgeChanges, type EdgeChange} from "@xyflow/react";

type XfEdgesLocalState = {
    xfEdges: readonly Readonly<XfEdge>[]
    addXfEdge(edgeId: EdgeDataIdType): void
    removeXfEdge(edgeId: EdgeDataIdType): void
    applyXfEdgeChanges(changes: EdgeChange<XfEdge>[]): void
}

export function useXfEdgesLocalState(edgeDatasStateManager: EdgeDatasStateManager) {
    return useLocalState<XfEdgesLocalState>((set, get) => {
        function createXfEdge(edgeId: EdgeDataIdType): XfEdge {
            const edgeData = edgeDatasStateManager.allEdgeDatasMap.get(edgeId)
            if (!edgeData)
                throw new Error(`edgeData not found for edgeId ${edgeId}`)
            return {
                id: edgeId,
                source: edgeData.sourceData.fromId,
                target: edgeData.sourceData.toId,
                type: 'FloatingEdge',
            }
        }

        // Связи приходят пачкой — копим id и применяем одним set, чтобы не
        // получить по ре-рендеру на каждую связь (см. useXfNodesLocalState).
        let pendingEdgeIds: EdgeDataIdType[] = []
        let flushScheduled = false

        function flushPendingEdges() {
            flushScheduled = false
            if (pendingEdgeIds.length === 0) return

            const edgeIds = pendingEdgeIds
            pendingEdgeIds = []

            set(state => ({
                ...state,
                xfEdges: [
                    ...state.xfEdges,
                    ...edgeIds.map(createXfEdge),
                ],
            }))
        }

        function scheduleFlush() {
            if (flushScheduled) return
            flushScheduled = true
            queueMicrotask(flushPendingEdges)
        }

        return {
            xfEdges: [],
            addXfEdge(edgeId: EdgeDataIdType) {
                pendingEdgeIds.push(edgeId)
                scheduleFlush()
            },
            removeXfEdge(edgeId: EdgeDataIdType) {
                pendingEdgeIds = pendingEdgeIds.filter(pendingEdgeId => pendingEdgeId !== edgeId)
                set(state => ({
                    xfEdges: state.xfEdges.filter(x => x.id !== edgeId),
                }))
            },
            applyXfEdgeChanges(changes: EdgeChange<XfEdge>[]) {
                const currentEdges = get().xfEdges
                const newEdges = applyEdgeChanges(changes, currentEdges as XfEdge[])
                set({
                    xfEdges: newEdges,
                })
            },
        }
    })
}