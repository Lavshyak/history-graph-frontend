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
import {type ImmutableMapContainer, immutableMapContainerNoCopy} from "../lib/ImmutableDictionary.ts";

export type EdgesImmutableMapContainer = ImmutableMapContainer<EdgeDataIdType, EdgeData>
export type NodesIdsEdgesIdsMapContainer = ImmutableMapContainer<NodeDataIdType, EdgeDataIdType>

export type EdgesState = Readonly<{
    all: EdgesImmutableMapContainer
    updated: EdgesImmutableMapContainer
    deleted: EdgesImmutableMapContainer
    created: EdgesImmutableMapContainer
    nodesIdsEdgesIds: NodesIdsEdgesIdsMapContainer
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

function SyncAllForEdges(initial: EdgesImmutableMapContainer, newEdgeDatas: readonly EdgeData[]): EdgesImmutableMapContainer {
    if (newEdgeDatas.length < 1) {
        return initial;
    }

    const map = new Map(initial.map.entries())

    newEdgeDatas.forEach(nd => {
        map.set(nd.sourceData.id, nd)
    })

    return immutableMapContainerNoCopy(map)
}

function SyncUpdatedForEdges(initial: EdgesImmutableMapContainer, newEdgeDatas: readonly EdgeData[]): EdgesImmutableMapContainer {
    if (newEdgeDatas.length < 1) {
        return initial;
    }

    const map = new Map(initial.map.entries())

    newEdgeDatas.forEach(nd => {
        const key = nd.sourceData.id

        if (nd.tech.hasDataUpdates) {
            map.set(key, nd)
        } else {
            map.delete(key)
        }
    })

    return immutableMapContainerNoCopy(map)
}

function SyncCreatedForEdges(initial: EdgesImmutableMapContainer, newEdgeDatas: readonly EdgeData[]): EdgesImmutableMapContainer {
    if (newEdgeDatas.length < 1) {
        return initial;
    }

    const map = new Map(initial.map.entries())

    newEdgeDatas.forEach(nd => {
        if (nd.tech.sourceOrCreated !== "created")
            return;
        map.set(nd.sourceData.id, nd)
    })

    return immutableMapContainerNoCopy(map)
}

function SyncDeletedForEdges(initial: EdgesImmutableMapContainer, newEdgeDatas: readonly EdgeData[]) {
    if (newEdgeDatas.length < 1) {
        return initial;
    }

    const map = new Map(initial.map.entries())

    newEdgeDatas.forEach((nd) => {
        const key = nd.sourceData.id
        if (nd.tech.isGenerallyMarkedForDelete) {
            map.set(key, nd)
        } else {
            map.delete(key)
        }
    })

    return immutableMapContainerNoCopy(map)
}

export type EdgesStateReducerActionArgs =
    | { type: "update"; entries: readonly { id: EdgeDataIdType; updatedData: Partial<EdgeUpdatedData> }[] }
    | { type: "markForDelete"; entries: readonly { id: EdgeDataIdType; markForDelete: boolean }[] }
    | {
    type: "markForDeleteBecauseNode";
    entries: readonly { edgeId: EdgeDataIdType, nodeId: NodeDataIdType; markForDelete: boolean }[]
}
    | { type: "addFromSource"; entries: readonly { edgeSourceData: EdgeSourceData }[] }
    | { type: "create"; entries: readonly { edgeSourceData: EdgeSourceData }[] }

export class EdgeNotFoundError extends Error {
    constructor() {
        super("EdgeNotFound");
    }
}

function edgesStateReducer(state: EdgesState, args: EdgesStateReducerActionArgs): EdgesState {
    switch (args.type) {
        case "update": {
            const resultEdges = args.entries.map(entry => {
                const initialEdge = state.all.map.get(entry.id);
                if (!initialEdge) throw new EdgeNotFoundError();
                const updatedData = {...initialEdge.updatedData, ...entry.updatedData}
                const currentData = calculateCurrentEdgeData(initialEdge.sourceData, updatedData)
                const hasDataUpdates = calculateHasEdgeDataUpdates(initialEdge.sourceData, updatedData)

                return {
                    ...initialEdge,
                    updatedData: updatedData,
                    currentData: currentData,
                    tech: {...initialEdge.tech, hasDataUpdates: hasDataUpdates},
                } as EdgeData
            })

            return SyncEdgesState(state, resultEdges);
        }

        case "markForDelete": {
            const resultEdges = args.entries.map(entry => {
                const initialEdge = state.all.map.get(entry.id);
                if (!initialEdge) throw new EdgeNotFoundError();
                return {
                    ...initialEdge,
                    tech: {...initialEdge.tech, isExplicitlyMarkedForDelete: entry.markForDelete},
                }
            })

            return SyncEdgesState(state, resultEdges);

        }

        case "markForDeleteBecauseNode": {
            const resultEdgesMap = new Map<EdgeDataIdType, EdgeData>()
            args.entries.forEach(entry => {
                const initialEdge = resultEdgesMap.get(entry.edgeId) ?? state.all.map.get(entry.edgeId);
                if (!initialEdge) throw new EdgeNotFoundError();
                const {nodeId, markForDelete} = entry

                const resultMarkedForDeleteBecauseNodes: readonly NodeDataIdType[] =
                    markForDelete
                        ? [...initialEdge.tech.markedForDeleteBecauseNodes].filter(nId => nId !== nodeId)
                        : [...initialEdge.tech.markedForDeleteBecauseNodes, nodeId]

                const techDataPart: Partial<EdgeTechData> = {
                    isGenerallyMarkedForDelete: initialEdge.tech.isExplicitlyMarkedForDelete || resultMarkedForDeleteBecauseNodes.length > 0,
                    markedForDeleteBecauseNodes: resultMarkedForDeleteBecauseNodes
                }

                resultEdgesMap.set(entry.edgeId, {
                    ...initialEdge,
                    tech: {...initialEdge.tech, ...techDataPart},
                })
            })

            return SyncEdgesState(state, [...resultEdgesMap.values()]);
        }

        case "addFromSource": {
            const resultEdges = args.entries.map(entry => {
                return {
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
                } as EdgeData
            })

            return SyncEdgesState(state, resultEdges);
        }

        case "create": {
            const resultEdges = args.entries.map(entry => {
                return {
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
                } as EdgeData
            })

            return SyncEdgesState(state, resultEdges);
        }
    }
}

export function EdgesStateWrapper(children: React.ReactNode) {
    const [edges, updateEdgesState] = useReducer(edgesStateReducer, {
        all: immutableMapContainerNoCopy<EdgeDataIdType, EdgeData>(new Map()),
        updated: immutableMapContainerNoCopy<EdgeDataIdType, EdgeData>(new Map()),
        deleted: immutableMapContainerNoCopy<EdgeDataIdType, EdgeData>(new Map()),
        created: immutableMapContainerNoCopy<EdgeDataIdType, EdgeData>(new Map())
    })

    const contextValue: EdgesStateContextType = useMemo(() => {
        const result: EdgesStateContextType = ({
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