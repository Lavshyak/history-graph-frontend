import {useReducer} from "react";
import {
    type NodeDataIdType,
    type NodeData,
    calculateCurrentNodeData,
    type NodeSourceData, type NodeUpdatedData, calculateHasNodeDataUpdates,
} from "../types/NodeData.ts";
import {immutableMapContainerNoCopy, type ImmutableMapContainer} from "../lib/ImmutableDictionary.ts";
import type {DeepReadonly} from "../lib/DeepReadonly.ts";

export type NodesImmutableMapContainer = ImmutableMapContainer<NodeDataIdType, NodeData>

export type NodesState = Readonly<{
    all: NodesImmutableMapContainer
    updated: NodesImmutableMapContainer
    deleted: NodesImmutableMapContainer
    created: NodesImmutableMapContainer
}>

// doesn't affect edges state
export type NodesStateReducerActionArgs =
    | DeepReadonly<{
    type: "update";
    entries: { id: NodeDataIdType; updatedData: Partial<NodeUpdatedData> }[]
}>
    | DeepReadonly<{
    type: "markForDelete";
    entries: { nodeId: NodeDataIdType; markForDelete: boolean; }[];
}>
    | DeepReadonly<{ type: "addFromSource"; entries: { nodeSourceData: NodeSourceData }[] }>
    | DeepReadonly<{ type: "create"; entries: { nodeSourceData: NodeSourceData }[] }>
    | DeepReadonly<{ type: "remove"; entries: { nodeId: NodeDataIdType }[] }>
    | DeepReadonly<{ type: "clear" }>

function SyncNodesState(initialState: NodesState, newNodeDatas: NodeData[]): NodesState {
    if (newNodeDatas.length < 1) {
        return initialState
    }

    return {
        all: SyncAllForNodes(initialState.all, newNodeDatas),
        created: SyncCreatedForNodes(initialState.created, newNodeDatas),
        deleted: SyncDeletedForNodes(initialState.deleted, newNodeDatas),
        updated: SyncUpdatedForNodes(initialState.updated, newNodeDatas),
    }
}

function SyncAllForNodes(initial: NodesImmutableMapContainer, newNodeDatas: readonly NodeData[]): NodesImmutableMapContainer {
    if (newNodeDatas.length < 1) {
        return initial;
    }

    const map = new Map(initial.map.entries())

    newNodeDatas.forEach(nd => {
        map.set(nd.sourceData.id, nd)
    })

    return immutableMapContainerNoCopy(map)
}

function SyncUpdatedForNodes(initial: NodesImmutableMapContainer, newNodeDatas: readonly NodeData[]): NodesImmutableMapContainer {
    if (newNodeDatas.length < 1) {
        return initial;
    }

    const map = new Map(initial.map.entries())

    newNodeDatas.forEach(nd => {
        const key = nd.sourceData.id

        if (nd.tech.hasDataUpdates) {
            map.set(key, nd)
        } else {
            map.delete(key)
        }
    })

    return immutableMapContainerNoCopy(map)
}

function SyncCreatedForNodes(initial: NodesImmutableMapContainer, newNodeDatas: readonly NodeData[]): NodesImmutableMapContainer {
    if (newNodeDatas.length < 1) {
        return initial;
    }

    const map = new Map(initial.map.entries())

    newNodeDatas.forEach(nd => {
        if (nd.tech.sourceOrCreated !== "created")
            return;
        map.set(nd.sourceData.id, nd)
    })

    return immutableMapContainerNoCopy(map)
}

function SyncDeletedForNodes(initial: NodesImmutableMapContainer, newNodeDatas: readonly NodeData[]): NodesImmutableMapContainer {
    if (newNodeDatas.length < 1) {
        return initial;
    }

    const map = new Map(initial.map.entries())

    newNodeDatas.forEach((nd) => {
        const key = nd.sourceData.id
        if (nd.tech.isExplicitlyMarkedForDelete) {
            map.set(key, nd)
        } else {
            map.delete(key)
        }
    })

    return immutableMapContainerNoCopy(map)
}

export class NodeNotFoundError extends Error {
    constructor() {
        super("NodeNotFound");
    }
}

function nodesStateReducer(state: NodesState, args: NodesStateReducerActionArgs): NodesState {
    switch (args.type) {
        case "update": {
            const resultNodes = args.entries.map(entry => {
                const initialNode = state.all.map.get(entry.id);
                if (!initialNode) throw new NodeNotFoundError();

                const updatedData = {...initialNode.updatedData, ...entry.updatedData}
                const currentData = calculateCurrentNodeData(initialNode.sourceData, updatedData)
                const hasDataUpdates = calculateHasNodeDataUpdates(initialNode.sourceData, updatedData)

                return {
                    ...initialNode,
                    updatedData: updatedData,
                    currentData: currentData,
                    tech: {...initialNode.tech, hasDataUpdates: hasDataUpdates},
                } as NodeData
            })

            return SyncNodesState(state, resultNodes);
        }

        case "markForDelete": {
            const resultNodes = args.entries.map(entry => {
                const initialNode = state.all.map.get(entry.nodeId);
                if (!initialNode) throw new NodeNotFoundError();

                return {
                    ...initialNode,
                    tech: {...initialNode.tech, isExplicitlyMarkedForDelete: entry.markForDelete},
                } as NodeData
            })

            return SyncNodesState(state, resultNodes)
        }

        case "addFromSource": {
            const resultNodes = args.entries.map(entry => {
                return {
                    sourceData: entry.nodeSourceData,
                    updatedData: undefined,
                    tech: {
                        isExplicitlyMarkedForDelete: false,
                        hasDataUpdates: false,
                        sourceOrCreated: "source"
                    },
                    currentData: calculateCurrentNodeData(entry.nodeSourceData, undefined)
                } as NodeData
            })

            return SyncNodesState(state, resultNodes);
        }

        case "create": {
            const resultNodes = args.entries.map(entry => {
                return {
                    sourceData: entry.nodeSourceData,
                    updatedData: undefined,
                    tech: {
                        isExplicitlyMarkedForDelete: false,
                        hasDataUpdates: false,
                        sourceOrCreated: "created"
                    },
                    currentData: calculateCurrentNodeData(entry.nodeSourceData)
                } as NodeData
            })

            return SyncNodesState(state, resultNodes);
        }

        case "clear": {
            return {
                all: immutableMapContainerNoCopy<NodeDataIdType, NodeData>(new Map()),
                updated: immutableMapContainerNoCopy<NodeDataIdType, NodeData>(new Map()),
                deleted: immutableMapContainerNoCopy<NodeDataIdType, NodeData>(new Map()),
                created: immutableMapContainerNoCopy<NodeDataIdType, NodeData>(new Map()),
            }
        }

        case "remove": {
            const newAllMap = new Map(state.all.map.entries())
            const newUpdatedMap = new Map(state.updated.map.entries())
            const newDeletedMap = new Map(state.deleted.map.entries())
            const newCreatedMap = new Map(state.created.map.entries())

            args.entries.forEach(entry => {
                const id = entry.nodeId

                newAllMap.delete(id)
                newUpdatedMap.delete(id)
                newDeletedMap.delete(id)
                newCreatedMap.delete(id)
            })

            return {
                all: immutableMapContainerNoCopy(newAllMap),
                updated: immutableMapContainerNoCopy(newUpdatedMap),
                deleted: immutableMapContainerNoCopy(newDeletedMap),
                created: immutableMapContainerNoCopy(newCreatedMap),
            }
        }

    }
}

// doesn't affect edges state
export function useNodesStateReducer() {
    return useReducer(nodesStateReducer, {
        all: immutableMapContainerNoCopy<NodeDataIdType, NodeData>(new Map()),
        updated: immutableMapContainerNoCopy<NodeDataIdType, NodeData>(new Map()),
        deleted: immutableMapContainerNoCopy<NodeDataIdType, NodeData>(new Map()),
        created: immutableMapContainerNoCopy<NodeDataIdType, NodeData>(new Map()),
    })
}

/*
export function NodesStateWrapper(children: React.ReactNode) {
    const [edges, updateEdgesState] = useEdgesStateContext()

    const [nodes, updateNodesState] = useReducer(nodesStateReducer, {
        all: immutableMapContainerNoCopy<NodeDataIdType, NodeData>(new Map()),
        updated: immutableMapContainerNoCopy<NodeDataIdType, NodeData>(new Map()),
        deleted: immutableMapContainerNoCopy<NodeDataIdType, NodeData>(new Map()),
        created: immutableMapContainerNoCopy<NodeDataIdType, NodeData>(new Map()),
    })

    const contextValue: NodesStateContextType = useMemo(() => ({
        allNodes: nodes.all,
        updatedNodes: nodes.updated,
        deletedNodes: nodes.deleted,
        createdNodes: nodes.created,
        nodesState: nodes,
        updateNodesState: updateNodesState,
    }), [nodes])

    return <>
        <NodesStateContext.Provider value={contextValue}>
            {children}
        </NodesStateContext.Provider>
    </>
}*/
