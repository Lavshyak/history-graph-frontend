import {createContext, useContext} from "react";
import type {NodeData, NodeDataIdType} from "../types/NodeData.ts";
import type {NodesState, NodesStateReducerActionArgs} from "./NodesStateWrapper.tsx";

export type NodesStateContextType = Readonly<{
    allNodes: Readonly<Record<NodeDataIdType, NodeData>>
    updatedNodes: Readonly<Record<NodeDataIdType, NodeData>>
    deletedNodes: Readonly<Record<NodeDataIdType, NodeData>>
    createdNodes: Readonly<Record<NodeDataIdType, NodeData>>
    readonly updateNodesState: React.ActionDispatch<[args: NodesStateReducerActionArgs]>
    nodesState: NodesState
}>

export const NodesStateContext = createContext<NodesStateContextType>({
    allNodes: {},
    createdNodes: {},
    deletedNodes: {},
    nodesState: {
        all: {},
        updated: {},
        deleted: {},
        created: {}
    },
    updateNodesState() {},
    updatedNodes: {}
})

export function useNodesState(){
    return useContext(NodesStateContext)
}