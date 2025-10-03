import {
    calculateCurrentEdgeData,
    calculateHasEdgeDataUpdates,
    type EdgeData,
    type EdgeDataIdType,
    type EdgeSourceData,
    type EdgeTechData,
    type EdgeUpdatedData,
} from "../types/EdgeData.ts";
import type {NodeDataIdType} from "../types/NodeData.ts";
import {type ImmutableMapContainer, immutableMapContainerNoCopy} from "../lib/ImmutableDictionary.ts";
import type {DeepReadonly} from "../lib/DeepReadonly.ts";
import {useReducer} from "react";

export type EdgesImmutableMapContainer = ImmutableMapContainer<EdgeDataIdType, EdgeData>
export type NodesIdsEdgesIdsMapContainer = ImmutableMapContainer<NodeDataIdType, readonly EdgeDataIdType[]>

export type EdgesState = Readonly<{
    all: EdgesImmutableMapContainer
    updated: EdgesImmutableMapContainer
    deleted: EdgesImmutableMapContainer
    created: EdgesImmutableMapContainer
    nodesIdsEdgesIds: NodesIdsEdgesIdsMapContainer
}>

function SyncEdgesState(initialState: EdgesState, newEdgeDatas: readonly EdgeData[], actionType: EdgesStateReducerActionType): EdgesState {
    if (newEdgeDatas.length < 1) {
        return initialState
    }

    return {
        all: SyncAllForEdges(initialState.all, newEdgeDatas),
        created: SyncCreatedForEdges(initialState.created, newEdgeDatas),
        deleted: SyncDeletedForEdges(initialState.deleted, newEdgeDatas),
        updated: SyncUpdatedForEdges(initialState.updated, newEdgeDatas),
        nodesIdsEdgesIds: SyncNodesIdsEdgesIdsForEdges(initialState.nodesIdsEdgesIds, newEdgeDatas, actionType)
    }
}

function addOrCreateInNodesIdsEdgesIds(map: Map<NodeDataIdType, readonly EdgeDataIdType[]>, key: NodeDataIdType, value: EdgeDataIdType) {
    const array = map.get(key)
    map.set(key, array ? [...array, value] : [value])
}

function SyncNodesIdsEdgesIdsForEdges(initial: NodesIdsEdgesIdsMapContainer, newEdgeDatas: readonly EdgeData[], actionType: EdgesStateReducerActionType) {
    if (newEdgeDatas.length < 1) {
        return initial
    }

    if (actionType == "create" || actionType == "addFromSource") {
        const map = new Map(initial.map.entries())
        newEdgeDatas.forEach(nd => {
            addOrCreateInNodesIdsEdgesIds(map, nd.sourceData.fromId, nd.sourceData.id)
            addOrCreateInNodesIdsEdgesIds(map, nd.sourceData.toId, nd.sourceData.id)
        })

        return immutableMapContainerNoCopy(map)
    } else {
        return initial
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

type EdgesStateReducerActionType = "update" | "markForDelete" | "onNodeMarkedForDelete" | "addFromSource" | "create" | "onNodeRemoved"

// doesn't affect nodes state
export type EdgesStateReducerActionArgs =
    | DeepReadonly<{ type: "update"; entries: { id: EdgeDataIdType; updatedData: Partial<EdgeUpdatedData> }[] }>
    | DeepReadonly<{ type: "markForDelete"; entries: { id: EdgeDataIdType; markForDelete: boolean }[] }>
    | DeepReadonly<{
    type: "onNodeMarkedForDelete";
    entries: { nodeId: NodeDataIdType; markForDelete: boolean }[]
}>
    | DeepReadonly<{ type: "addFromSource"; entries: { edgeSourceData: EdgeSourceData }[] }>
    | DeepReadonly<{ type: "create"; entries: { edgeSourceData: EdgeSourceData }[] }>
    | DeepReadonly<{ type: "clear" }>
    | DeepReadonly<{ type: "remove", entries: { id: EdgeDataIdType }[] }>
    | DeepReadonly<{ type: "onNodeRemoved", entries: { nodeId: NodeDataIdType }[] }>

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

            return SyncEdgesState(state, resultEdges, args.type);
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

            return SyncEdgesState(state, resultEdges, args.type);

        }

        case "onNodeMarkedForDelete": {
            const resultEdgeIdInitialEdgesAndMarkedForDeleteBecauseNodesMap = new Map<EdgeDataIdType, {
                readonly initialEdgeData: EdgeData,
                nodeIdsMarkedForDelete: readonly NodeDataIdType[]
            }>()
            args.entries.forEach(entry => {
                const edgeIds = state.nodesIdsEdgesIds.map.get(entry.nodeId);
                if (!edgeIds || edgeIds.length < 1) {
                    return
                }

                edgeIds.forEach(edgeId => {
                    let edAndNodeIdsMarkedForDelete = resultEdgeIdInitialEdgesAndMarkedForDeleteBecauseNodesMap.get(edgeId)

                    if (!edAndNodeIdsMarkedForDelete) {
                        const initialEdge = state.all.map.get(edgeId)
                        if (!initialEdge) throw new EdgeNotFoundError();

                        edAndNodeIdsMarkedForDelete = {
                            initialEdgeData: initialEdge,
                            nodeIdsMarkedForDelete: [...initialEdge.tech.markedForDeleteBecauseNodes]
                        }

                        resultEdgeIdInitialEdgesAndMarkedForDeleteBecauseNodesMap.set(edgeId, edAndNodeIdsMarkedForDelete);
                    }

                    const {nodeId, markForDelete} = entry

                    edAndNodeIdsMarkedForDelete.nodeIdsMarkedForDelete =
                        markForDelete
                            ? [...edAndNodeIdsMarkedForDelete.nodeIdsMarkedForDelete, nodeId]
                            : edAndNodeIdsMarkedForDelete.nodeIdsMarkedForDelete.filter(nId => nId !== nodeId)
                })
            })

            const newEdgeDatas: EdgeData[] = []
            for (const {
                initialEdgeData,
                nodeIdsMarkedForDelete
            } of resultEdgeIdInitialEdgesAndMarkedForDeleteBecauseNodesMap.values()) {
                const techDataPart: Partial<EdgeTechData> = {
                    isGenerallyMarkedForDelete: initialEdgeData.tech.isExplicitlyMarkedForDelete || nodeIdsMarkedForDelete.length > 0,
                    markedForDeleteBecauseNodes: nodeIdsMarkedForDelete
                }

                const edgeData = {
                    ...initialEdgeData,
                    tech: {...initialEdgeData.tech, ...techDataPart},
                }

                newEdgeDatas.push(edgeData)
            }

            return SyncEdgesState(state, newEdgeDatas, args.type);
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

            return SyncEdgesState(state, resultEdges, args.type);
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

            return SyncEdgesState(state, resultEdges, args.type);
        }

        case "clear": {
            return {
                all: immutableMapContainerNoCopy<EdgeDataIdType, EdgeData>(new Map()),
                updated: immutableMapContainerNoCopy<EdgeDataIdType, EdgeData>(new Map()),
                deleted: immutableMapContainerNoCopy<EdgeDataIdType, EdgeData>(new Map()),
                created: immutableMapContainerNoCopy<EdgeDataIdType, EdgeData>(new Map()),
                nodesIdsEdgesIds: immutableMapContainerNoCopy<NodeDataIdType, EdgeDataIdType[]>(new Map()),
            }
        }

        case "remove": {
            // noinspection DuplicatedCode
            const newAllMap = new Map(state.all.map.entries())
            const newUpdatedMap = new Map(state.updated.map.entries())
            const newDeletedMap = new Map(state.deleted.map.entries())
            const newCreatedMap = new Map(state.created.map.entries())
            const newNodesIdsEdgesIdsMap = new Map(state.nodesIdsEdgesIds.map.entries())
            args.entries.forEach(entry => {
                const id = entry.id

                newAllMap.delete(id)
                newUpdatedMap.delete(id)
                newDeletedMap.delete(id)
                newCreatedMap.delete(id)

                const edge = state.all.map.get(entry.id)
                if (!edge) return;

                const nodeIds = [edge.sourceData.fromId, edge.sourceData.toId]

                nodeIds.forEach(nodeId => {
                    const edgeIds = newNodesIdsEdgesIdsMap.get(nodeId)
                    if (!edgeIds) return;
                    const newEdgeIds = edgeIds.filter(eId => eId != id)
                    if (newEdgeIds.length < 1) {
                        newNodesIdsEdgesIdsMap.delete(nodeId)
                    } else {
                        newNodesIdsEdgesIdsMap.set(nodeId, edgeIds.filter(eId => eId != id))
                    }
                })
            })

            return {
                all: immutableMapContainerNoCopy(newAllMap),
                updated: immutableMapContainerNoCopy(newUpdatedMap),
                deleted: immutableMapContainerNoCopy(newDeletedMap),
                created: immutableMapContainerNoCopy(newCreatedMap),
                nodesIdsEdgesIds: immutableMapContainerNoCopy(newNodesIdsEdgesIdsMap),
            }
        }

        case "onNodeRemoved": {
            // noinspection DuplicatedCode
            const newAllMap = new Map(state.all.map.entries())
            const newUpdatedMap = new Map(state.updated.map.entries())
            const newDeletedMap = new Map(state.deleted.map.entries())
            const newCreatedMap = new Map(state.created.map.entries())
            const newNodesIdsEdgesIdsMap = new Map(state.nodesIdsEdgesIds.map.entries())

            args.entries.forEach(entry => {
                const nodeId = entry.nodeId
                const edgeIds = state.nodesIdsEdgesIds.map.get(nodeId)
                if(!edgeIds || edgeIds.length < 1) return;

                edgeIds.forEach(edgeId => {
                    newAllMap.delete(edgeId)
                    newUpdatedMap.delete(edgeId)
                    newDeletedMap.delete(edgeId)
                    newCreatedMap.delete(edgeId)
                })

                newNodesIdsEdgesIdsMap.delete(nodeId)
            })

            return {
                all: immutableMapContainerNoCopy(newAllMap),
                updated: immutableMapContainerNoCopy(newUpdatedMap),
                deleted: immutableMapContainerNoCopy(newDeletedMap),
                created: immutableMapContainerNoCopy(newCreatedMap),
                nodesIdsEdgesIds: immutableMapContainerNoCopy(newNodesIdsEdgesIdsMap),
            }
        }
    }
}

// doesn't affect nodes state
export function useEdgesStateReducer() {
    return useReducer(edgesStateReducer, {
        all: immutableMapContainerNoCopy<EdgeDataIdType, EdgeData>(new Map()),
        updated: immutableMapContainerNoCopy<EdgeDataIdType, EdgeData>(new Map()),
        deleted: immutableMapContainerNoCopy<EdgeDataIdType, EdgeData>(new Map()),
        created: immutableMapContainerNoCopy<EdgeDataIdType, EdgeData>(new Map()),
        nodesIdsEdgesIds: immutableMapContainerNoCopy<NodeDataIdType, EdgeDataIdType[]>(new Map()),
    })
}

/*
export function EdgesStateWrapper(children: ReactNode) {
    const [edges, updateEdgesState] = useReducer(edgesStateReducer, {
        all: immutableMapContainerNoCopy<EdgeDataIdType, EdgeData>(new Map()),
        updated: immutableMapContainerNoCopy<EdgeDataIdType, EdgeData>(new Map()),
        deleted: immutableMapContainerNoCopy<EdgeDataIdType, EdgeData>(new Map()),
        created: immutableMapContainerNoCopy<EdgeDataIdType, EdgeData>(new Map()),
        nodesIdsEdgesIds: immutableMapContainerNoCopy<NodeDataIdType, EdgeDataIdType[]>(new Map()),
    })

    const contextValue: EdgesStateContextType = useMemo(() => {
        const result: EdgesStateContextType = ({
            allEdges: edges.all,
            updatedEdges: edges.updated,
            deletedEdges: edges.deleted,
            createdEdges: edges.created,
            edgesState: edges,
            updateEdgesState: updateEdgesState,
            getEdgesByNodeId(nodeId: NodeDataIdType): EdgeData[] {
                const nodeIds = edges.nodesIdsEdgesIds.map.get(nodeId)
                if (!nodeIds) return [];

                return nodeIds.map(nodeId => {
                    const node = edges.all.map.get(nodeId)
                    if (!node) throw new Error("такого случиться не должно");
                    return node;
                })
            },
        })
        return result
    }, [edges])

    return <>
        <EdgesStateContext.Provider value={contextValue}>
            {children}
        </EdgesStateContext.Provider>
    </>
}*/
