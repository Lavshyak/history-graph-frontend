import {useMemo, useReducer} from "react";
import {
    type NodeDataIdType,
    type NodeData,
    calculateCurrentNodeData,
    type NodeSourceData, type NodeUpdatedData, calculateHasNodeDataUpdates,
} from "../types/NodeData.ts";
import {NodesStateContext, type NodesStateContextType} from "./NodesStateContext.tsx";
import {useEdgesStateContext} from "./EdgesStateContext.tsx";

type NodeDatasReadonlyRecord = Readonly<Record<NodeDataIdType, NodeData>>

export type NodesState = Readonly<{
    all: NodeDatasReadonlyRecord
    updated: NodeDatasReadonlyRecord
    deleted: NodeDatasReadonlyRecord
    created: NodeDatasReadonlyRecord
}>

export type NodesStateReducerActionArgs =
    | { type: "update"; entries: readonly { id: NodeDataIdType; updatedData: Partial<NodeUpdatedData> }[] }
    | { type: "markForDelete"; entries: readonly { id: NodeDataIdType; markForDelete: boolean;  }[] }
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

function SyncAllForNodes(initialAll: NodeDatasReadonlyRecord, newNodeDatas: readonly NodeData[]): Readonly<Record<NodeDataIdType, NodeData>> {
    const resultAll = {...initialAll}

    newNodeDatas.forEach(nd => {
        resultAll[nd.sourceData.id] = nd
    })

    return resultAll
}

function SyncUpdatedForNodes(initialUpdated: NodeDatasReadonlyRecord, newNodeDatas: readonly NodeData[]) {
    if (newNodeDatas.length < 1) {
        return initialUpdated;
    }

    const resultUpdated = {...initialUpdated}

    newNodeDatas.forEach(nd => {
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

function SyncCreatedForNodes(initialCreated: NodeDatasReadonlyRecord, newNodeDatas: readonly NodeData[]) {
    const resultCreated = {...initialCreated}

    newNodeDatas.forEach(nd => {
        if (nd.tech.sourceOrCreated !== "created")
            return;
        resultCreated[nd.sourceData.id] = nd
    })

    return resultCreated
}

function SyncDeletedForNodes(initialDeleted: NodeDatasReadonlyRecord, newNodeDatas: readonly NodeData[]) {
    if (newNodeDatas.length < 1) {
        return initialDeleted;
    }

    const resultDeleted = {...initialDeleted}

    newNodeDatas.forEach((nd) => {
        const key = nd.sourceData.id
        if (nd.tech.isExplicitlyMarkedForDelete) {
            resultDeleted[key] = nd
        } else {
            if (key in resultDeleted) {
                delete resultDeleted[key]
            }
        }
    })

    return resultDeleted
}

function nodesStateReducer(state: NodesState, args: NodesStateReducerActionArgs): NodesState {
    switch (args.type) {
        case "update": {
            //const initialNodes: NodeData[] = []
            const resultNodes: NodeData[] = []
            args.entries.forEach(entry => {
                const initialNode = state.all[entry.id];
                if (!initialNode) return state;

                const updatedData = {...initialNode.updatedData, ...entry.updatedData}
                const currentData = calculateCurrentNodeData(initialNode.sourceData, updatedData)
                const hasDataUpdates = calculateHasNodeDataUpdates(initialNode.sourceData, updatedData)

                const resultNode = {
                    ...initialNode,
                    updatedData: updatedData,
                    currentData: currentData,
                    tech: {...initialNode.tech, hasDataUpdates: hasDataUpdates},
                }

                //initialNodes.push(initialNode)
                resultNodes.push(resultNode)
            })

            return SyncNodesState(state, resultNodes);
        }

        case "markForDelete": {
            //const initialNodes: NodeData[] = []
            const resultNodes: NodeData[] = []

            args.entries.forEach(entry => {
                const initialNode = state.all[entry.id];
                if (!initialNode) return state;
                const resultNode = {
                    ...initialNode,
                    tech: {...initialNode.tech, isExplicitlyMarkedForDelete: entry.markForDelete},
                }
                //initialNodes.push(initialNode)
                resultNodes.push(resultNode)
            })

            const syncedNodesState = SyncNodesState(state, resultNodes)

            return syncedNodesState
        }

        case "addFromSource": {
            const resultNodes: NodeData[] = []
            args.entries.forEach(entry => {
                const node: NodeData = {
                    sourceData: entry.nodeSourceData,
                    updatedData: undefined,
                    tech: {
                        isExplicitlyMarkedForDelete: false,
                        hasDataUpdates: false,
                        sourceOrCreated: "source"
                    },
                    currentData: calculateCurrentNodeData(entry.nodeSourceData, undefined)
                }
                resultNodes.push(node)
            })

            return SyncNodesState(state, resultNodes);
        }

        case "create": {
            const resultNodes: NodeData[] = []
            args.entries.forEach(entry => {
                const node: NodeData = {
                    sourceData: entry.nodeSourceData,
                    updatedData: undefined,
                    tech: {
                        isExplicitlyMarkedForDelete: false,
                        hasDataUpdates: false,
                        sourceOrCreated: "created"
                    },
                    currentData: calculateCurrentNodeData(entry.nodeSourceData)
                }
                resultNodes.push(node)
            })

            return SyncNodesState(state, resultNodes);
        }
    }
}

export function NodesStateWrapper(children: React.ReactNode) {
    const [edges, updateEdgesState] = useEdgesStateContext()

    const [nodes, updateNodesState] = useReducer(nodesStateReducer, {
        all: {},
        updated: {},
        deleted: {},
        created: {}
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