import {useMemo, useReducer} from "react";
import {
    type NodeDataIdType,
    type NodeData,
    calculateCurrentNodeData,
    type NodeSourceData, type NodeUpdatedData, calculateHasNodeDataUpdates,
} from "../types/NodeData.ts";
import {NodesStateContext, type NodesStateContextType} from "./NodesStateContext.tsx";
import {useEdgesStateContext} from "./EdgesStateContext.tsx";
import {immutableMapContainerNoCopy, type ImmutableMapContainer} from "../lib/ImmutableDictionary.ts";
import type {EdgeDataIdType} from "../types/EdgeData.ts";

export type NodesImmutableMapContainer = ImmutableMapContainer<NodeDataIdType, NodeData>

export type NodesState = Readonly<{
    all: NodesImmutableMapContainer
    updated: NodesImmutableMapContainer
    deleted: NodesImmutableMapContainer
    created: NodesImmutableMapContainer
}>

export type NodesStateReducerActionArgs =
    | { type: "update"; entries: readonly { id: NodeDataIdType; updatedData: Partial<NodeUpdatedData> }[] }
    | { type: "markForDelete"; entries: readonly { id: NodeDataIdType; markForDelete: boolean;  }[]; markEdgeDeletedBecauseNode(nodeId: NodeDataIdType, markForDelete: boolean):void }
    | { type: "addFromSource"; entries: readonly { nodeSourceData: NodeSourceData }[] }
    | { type: "create"; entries: readonly { nodeSourceData: NodeSourceData }[] }

function SyncNodesState(initialState: NodesState, newNodeDatas: readonly NodeData[]): NodesState {
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

function SyncUpdatedForNodes(initial: NodesImmutableMapContainer, newNodeDatas: readonly NodeData[]) : NodesImmutableMapContainer {
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

function SyncCreatedForNodes(initial: NodesImmutableMapContainer, newNodeDatas: readonly NodeData[]) : NodesImmutableMapContainer {
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

function SyncDeletedForNodes(initial: NodesImmutableMapContainer, newNodeDatas: readonly NodeData[]) : NodesImmutableMapContainer {
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

export class EdgeNotFoundError extends Error {
    constructor() {
        super("EdgeNotFound");
    }
}

function nodesStateReducer(state: NodesState, args: NodesStateReducerActionArgs): NodesState {
    switch (args.type) {
        case "update": {
            const resultNodes = args.entries.map(entry => {
                const initialNode = state.all.map.get(entry.id);
                if (!initialNode) throw new EdgeNotFoundError();

                const updatedData = {...initialNode.updatedData, ...entry.updatedData}
                const currentData = calculateCurrentNodeData(initialNode.sourceData, updatedData)
                const hasDataUpdates = calculateHasNodeDataUpdates(initialNode.sourceData, updatedData)

                return  {
                    ...initialNode,
                    updatedData: updatedData,
                    currentData: currentData,
                    tech: {...initialNode.tech, hasDataUpdates: hasDataUpdates},
                } as NodeData
            })

            return SyncNodesState(state, resultNodes);
        }

        case "markForDelete": {
            const edgesToDeleteBecauseNodes : { edgeId: EdgeDataIdType, nodeId: NodeDataIdType; markForDelete: boolean }[] = []

            const resultNodes = args.entries.map(entry => {
                const initialNode = state.all.map.get(entry.id);
                if (!initialNode) throw new EdgeNotFoundError();

                return  {
                    ...initialNode,
                    tech: {...initialNode.tech, isExplicitlyMarkedForDelete: entry.markForDelete},
                } as NodeData
            })

            return  SyncNodesState(state, resultNodes)
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
    }
}

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
}