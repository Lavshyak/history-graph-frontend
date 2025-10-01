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
import type {ImmutableDictionary} from "../lib/ImmutableDictionary.ts";

type EdgesImmutableDictionary = ImmutableDictionary<EdgeDataIdType, EdgeData>
type EdgeDatasReadonlyRecord = Readonly<Record<EdgeDataIdType, EdgeData>>

export type EdgesState = Readonly<{
    all: EdgeDatasReadonlyRecord
    updated: EdgeDatasReadonlyRecord
    deleted: EdgeDatasReadonlyRecord
    created: EdgeDatasReadonlyRecord
}>

export type EdgesStateReducerActionArgs =
    | { type: "update"; entries: readonly { id: EdgeDataIdType; updatedData: Partial<EdgeUpdatedData> }[] }
    | { type: "markForDelete"; entries: readonly { id: EdgeDataIdType; markForDelete: boolean }[] }
    | {
    type: "markForDeleteBecauseNode";
    entries: readonly { id: EdgeDataIdType, nodeId: NodeDataIdType; markForDelete: boolean }[]
}
    | { type: "addFromSource"; entries: readonly { edgeSourceData: EdgeSourceData }[] }
    | { type: "create"; entries: readonly { edgeSourceData: EdgeSourceData }[] }

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

function SyncAllForEdges(initialAll: EdgeDatasReadonlyRecord, newEdgeDatas: readonly EdgeData[]): Readonly<Record<EdgeDataIdType, EdgeData>> {
    const resultAll = {...initialAll}

    newEdgeDatas.forEach(nd => {
        resultAll[nd.sourceData.id] = nd
    })

    return resultAll
}

function SyncUpdatedForEdges(initialUpdated: EdgeDatasReadonlyRecord, newEdgeDatas: readonly EdgeData[]) {
    if (newEdgeDatas.length < 1) {
        return initialUpdated;
    }

    const resultUpdated = {...initialUpdated}

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

    return resultUpdated
}

function SyncCreatedForEdges(initialCreated: EdgeDatasReadonlyRecord, newEdgeDatas: readonly EdgeData[]) {
    const resultCreated = {...initialCreated}

    newEdgeDatas.forEach(nd => {
        if (nd.tech.sourceOrCreated !== "created")
            return;
        resultCreated[nd.sourceData.id] = nd
    })

    return resultCreated
}

function SyncDeletedForEdges(initialDeleted: EdgeDatasReadonlyRecord, newEdgeDatas: readonly EdgeData[]) {
    if (newEdgeDatas.length < 1) {
        return initialDeleted;
    }

    const resultDeleted = {...initialDeleted}

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

    return resultDeleted
}

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
        all: {},
        updated: {},
        deleted: {},
        created: {}
    })

    const contextValue: EdgesStateContextType = useMemo(() => {
        const allEdgesList = (Object.entries(edges.all) as [EdgeDataIdType, EdgeData][])
            .map(([, edgeData]) => edgeData)
        const result : EdgesStateContextType = ({
            allEdges: edges.all,
            updatedEdges: edges.updated,
            deletedEdges: edges.deleted,
            createdEdges: edges.created,
            edgesState: edges,
            updateEdgesState: updateEdgesState,
            getEdgesByNode(nodeId: NodeDataIdType): EdgeData[] {
                return allEdgesList
                    .filter((edgeData) =>
                        edgeData.sourceData.fromId === nodeId || edgeData.sourceData.toId === nodeId)
            },
            allEdgesList: allEdgesList,
            updatedEdgesList: (Object.entries(edges.updated) as [EdgeDataIdType, EdgeData][])
                .map(([, edgeData]) => edgeData),
            deletedEdgesList: (Object.entries(edges.deleted) as [EdgeDataIdType, EdgeData][])
                .map(([, edgeData]) => edgeData),
            createdEdgesList: (Object.entries(edges.created) as [EdgeDataIdType, EdgeData][])
                .map(([, edgeData]) => edgeData),
        })
        return result
    }, [edges])

    return <>
        <EdgesStateContext.Provider value={contextValue}>
            {children}
        </EdgesStateContext.Provider>
    </>
}