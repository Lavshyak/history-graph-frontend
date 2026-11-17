import type {EdgeDatasStateManager} from "../../../coolerState/coolerEdgesState.ts";
import {useLocalState} from "../../../hooks/UseLocalState.ts";
import type {XfEdge} from "../../types/XyFlowTypeAliases.ts";
import type {EdgeDataIdType} from "../../../types/EdgeData.ts";
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