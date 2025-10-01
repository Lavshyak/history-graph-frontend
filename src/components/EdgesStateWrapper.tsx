import {useMemo, useReducer} from "react";
import {
    calculateCurrentEdgeData,
    calculateHasEdgeDataUpdates,
    type EdgeData,
    type EdgeDataIdType,
    type EdgeSourceData,
    type EdgeTechData,
    type EdgeUpdatedData,
} from "../types/EdgeData.ts";
import {EdgesStateContext, type EdgesStateContextType} from "./EdgesStateContext.tsx";
import type {NodeDataIdType} from "../types/NodeData.ts";
import {immutableDictionary, type ImmutableDictionary} from "../lib/ImmutableDictionary.ts";

export type EdgesImmutableDictionary = ImmutableDictionary<EdgeDataIdType, EdgeData>

export type EdgesState = Readonly<{
    all: EdgesImmutableDictionary
    updated: EdgesImmutableDictionary
    deleted: EdgesImmutableDictionary
    created: EdgesImmutableDictionary
}>

function SyncEdgesState(initialState: EdgesState, newEdgeDatas: readonly EdgeData[]): EdgesState {
    if (newEdgeDatas.length < 1) {
        return initialState
    }

    return {
        all: SyncAllForEdges(initialState.all, newEdgeDatas),
        created: SyncCreatedForEdges(initialState.created, newEdgeDatas),
        deleted: SyncDeletedForEdges(initialState.deleted, newEdgeDatas),
        updated: SyncUpdatedForEdges(initialState.updated, newEdgeDatas),
    }
}

function SyncAllForEdges(initialAll: EdgesImmutableDictionary, newEdgeDatas: readonly EdgeData[]) {
    if (newEdgeDatas.length < 1) {
        return initialAll;
    }
    const resultAll: Record<EdgeDataIdType, EdgeData> = {...initialAll}

    newEdgeDatas.forEach(nd => {
        resultAll[nd.sourceData.id] = nd
    })

    return immutableDictionary(resultAll)
}

function SyncUpdatedForEdges(initialUpdated: EdgesImmutableDictionary, newEdgeDatas: readonly EdgeData[]) {
    if (newEdgeDatas.length < 1) {
        return initialUpdated;
    }

    const resultUpdated: Record<EdgeDataIdType, EdgeData> = {...initialUpdated}

    newEdgeDatas.forEach(nd => {
        const key = nd.sourceData.id

        if (nd.tech.hasDataUpdates) {
            resultUpdated[key] = nd
        } else {
            if (key in resultUpdated) {
                delete resultUpdated[key]
            }
        }
    })

    return immutableDictionary(resultUpdated)
}

function SyncCreatedForEdges(initialCreated: EdgesImmutableDictionary, newEdgeDatas: readonly EdgeData[]) {
    const resultCreated: Record<EdgeDataIdType, EdgeData> = {...initialCreated}

    newEdgeDatas.forEach(nd => {
        if (nd.tech.sourceOrCreated !== "created")
            return;
        resultCreated[nd.sourceData.id] = nd
    })

    return immutableDictionary(resultCreated)
}

function SyncDeletedForEdges(initialDeleted: EdgesImmutableDictionary, newEdgeDatas: readonly EdgeData[]) {
    if (newEdgeDatas.length < 1) {
        return initialDeleted;
    }

    const resultDeleted: Record<EdgeDataIdType, EdgeData> = {...initialDeleted}

    newEdgeDatas.forEach((nd) => {
        const key = nd.sourceData.id
        if (nd.tech.isGenerallyMarkedForDelete) {
            resultDeleted[key] = nd
        } else {
            if (key in resultDeleted) {
                delete resultDeleted[key]
            }
        }
    })

    return immutableDictionary(resultDeleted)
}

export type EdgesStateReducerActionArgs =
    | { type: "update"; entries: readonly { id: EdgeDataIdType; updatedData: Partial<EdgeUpdatedData> }[] }
    | { type: "markForDelete"; entries: readonly { id: EdgeDataIdType; markForDelete: boolean }[] }
    | {
    type: "markForDeleteBecauseNode";
    entries: readonly { id: EdgeDataIdType, nodeId: NodeDataIdType; markForDelete: boolean }[]
}
    | { type: "addFromSource"; entries: readonly { edgeSourceData: EdgeSourceData }[] }
    | { type: "create"; entries: readonly { edgeSourceData: EdgeSourceData }[] }

function edgesStateReducer(state: EdgesState, args: EdgesStateReducerActionArgs): EdgesState {
    switch (args.type) {
        case "update": {
            //const initialEdges: EdgeData[] = []
            const resultEdges: EdgeData[] = []
            args.entries.forEach(entry => {
                const initialEdge = state.all[entry.id];
                if (!initialEdge) return state;

                const updatedData = {...initialEdge.updatedData, ...entry.updatedData}
                const currentData = calculateCurrentEdgeData(initialEdge.sourceData, updatedData)
                const hasDataUpdates = calculateHasEdgeDataUpdates(initialEdge.sourceData, updatedData)

                const resultEdge = {
                    ...initialEdge,
                    updatedData: updatedData,
                    currentData: currentData,
                    tech: {...initialEdge.tech, hasDataUpdates: hasDataUpdates},
                }

                //initialEdges.push(initialEdge)
                resultEdges.push(resultEdge)
            })

            return SyncEdgesState(state, resultEdges);
        }

        case "markForDelete": {
            //const initialEdges: EdgeData[] = []
            const resultEdges: EdgeData[] = []

            args.entries.forEach(entry => {
                const initialEdge = state.all[entry.id];
                if (!initialEdge) return state;
                const resultEdge = {
                    ...initialEdge,
                    tech: {...initialEdge.tech, isExplicitlyMarkedForDelete: entry.markForDelete},
                }
                //initialEdges.push(initialEdge)
                resultEdges.push(resultEdge)
            })

            return SyncEdgesState(state, resultEdges);

        }

        case "markForDeleteBecauseNode": {
            //const initialEdges: EdgeData[] = []
            const resultEdges: EdgeData[] = []

            args.entries.forEach(entry => {
                const initialEdge = state.all[entry.id];
                if (!initialEdge) return state;
                const {nodeId, markForDelete} = entry

                const resultMarkedForDeleteBecauseNodes: readonly NodeDataIdType[] =
                    markForDelete
                        ? [...initialEdge.tech.markedForDeleteBecauseNodes].filter(nId => nId !== nodeId)
                        : [...initialEdge.tech.markedForDeleteBecauseNodes, nodeId]

                const techDataPart: Partial<EdgeTechData> = {
                    isGenerallyMarkedForDelete: initialEdge.tech.isExplicitlyMarkedForDelete || resultMarkedForDeleteBecauseNodes.length > 0,
                    markedForDeleteBecauseNodes: resultMarkedForDeleteBecauseNodes
                }

                const resultEdge = {
                    ...initialEdge,
                    tech: {...initialEdge.tech, ...techDataPart},
                }

                resultEdges.push(resultEdge)
            })


            return SyncEdgesState(state, resultEdges);
        }

        case "addFromSource": {
            const resultEdges: EdgeData[] = []
            args.entries.forEach(entry => {
                const edge: EdgeData = {
                    sourceData: entry.edgeSourceData,
                    updatedData: undefined,
                    tech: {
                        isExplicitlyMarkedForDelete: false,
                        isGenerallyMarkedForDelete: false,
                        markedForDeleteBecauseNodes: [],
                        hasDataUpdates: false,
                        sourceOrCreated: "source"
                    },
                    currentData: calculateCurrentEdgeData(entry.edgeSourceData, undefined)
                }
                resultEdges.push(edge)
            })

            return SyncEdgesState(state, resultEdges);
        }

        case "create": {
            const resultEdges: EdgeData[] = []
            args.entries.forEach(entry => {
                const edge: EdgeData = {
                    sourceData: entry.edgeSourceData,
                    updatedData: undefined,
                    tech: {
                        isExplicitlyMarkedForDelete: false,
                        isGenerallyMarkedForDelete: false,
                        markedForDeleteBecauseNodes: [],
                        hasDataUpdates: false,
                        sourceOrCreated: "created"
                    },
                    currentData: calculateCurrentEdgeData(entry.edgeSourceData)
                }
                resultEdges.push(edge)
            })

            return SyncEdgesState(state, resultEdges);
        }
    }
}

export function EdgesStateWrapper(children: React.ReactNode) {
    const [edges, updateEdgesState] = useReducer(edgesStateReducer, {
        all: immutableDictionary<EdgeDataIdType, EdgeData>({}),
        updated: immutableDictionary<EdgeDataIdType, EdgeData>({}),
        deleted: immutableDictionary<EdgeDataIdType, EdgeData>({}),
        created: immutableDictionary<EdgeDataIdType, EdgeData>({})
    })

    const contextValue: EdgesStateContextType = useMemo(() => {
        const result : EdgesStateContextType = ({
            allEdges: edges.all,
            updatedEdges: edges.updated,
            deletedEdges: edges.deleted,
            createdEdges: edges.created,
            edgesState: edges,
            updateEdgesState: updateEdgesState,
            getEdgesByNode(nodeId: NodeDataIdType): EdgeData[] {
                return edges.all.values
                    .filter((edgeData) =>
                        edgeData.sourceData.fromId === nodeId || edgeData.sourceData.toId === nodeId)
            },
        })
        return result
    }, [edges])

    return <>
        <EdgesStateContext.Provider value={contextValue}>
            {children}
        </EdgesStateContext.Provider>
    </>
}