import type {EdgeDatasStateManager} from "@/model/edge/createEdgeDatasStateManager.ts";
import {useLocalState} from "@/shared/hooks/useLocalState.ts";
import type {XfEdge} from "@/shared/types/xyflow.ts";
import type {EdgeDataIdType} from "@/model/edge/edgeData.ts";
import {applyEdgeChanges, type EdgeChange} from "@xyflow/react";

export function useXfEdgesLocalState(edgeDatasStateManager: EdgeDatasStateManager) {
    return useLocalState<{
        xfEdges: readonly Readonly<XfEdge>[]
        addXfEdge(edgeId: EdgeDataIdType): void
        removeXfEdge(edgeId: EdgeDataIdType): void
        applyXfEdgeChanges(changes: EdgeChange<XfEdge>[]): void
    }>((set, get) => ({
        xfEdges: [],
        addXfEdge(edgeId: EdgeDataIdType) {
            set(state => {
                const edgeData = edgeDatasStateManager.allEdgeDatasMap.get(edgeId)
                if (!edgeData)
                    throw new Error(`edgeData not found for edgeId ${edgeId}`)
                return {
                    ...state,
                    xfEdges: [
                        ...state.xfEdges,
                        {
                            id: edgeId,
                            source: edgeData.sourceData.fromId,
                            target: edgeData.sourceData.toId,
                            type: 'FloatingEdge',
                        },
                    ],
                }
            })
        },
        removeXfEdge(edgeId: EdgeDataIdType) {
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
    }))
}