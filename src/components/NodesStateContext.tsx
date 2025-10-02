import {createContext, useContext} from "react";
import type {NodeData, NodeDataIdType} from "../types/NodeData.ts";
import type {NodesImmutableMapContainer, NodesState, NodesStateReducerActionArgs} from "./NodesStateWrapper.tsx";
import {immutableMapContainerNoCopy} from "../lib/ImmutableDictionary.ts";

export type NodesStateContextType = Readonly<{
    allNodes: NodesImmutableMapContainer
    updatedNodes: NodesImmutableMapContainer
    deletedNodes: NodesImmutableMapContainer
    createdNodes: NodesImmutableMapContainer
    readonly updateNodesState: React.ActionDispatch<[args: NodesStateReducerActionArgs]>
    nodesState: NodesState
}>

const defaultNodesState = {
    all: immutableMapContainerNoCopy<NodeDataIdType, NodeData>(new Map()),
    updated: immutableMapContainerNoCopy<NodeDataIdType, NodeData>(new Map()),
    deleted: immutableMapContainerNoCopy<NodeDataIdType, NodeData>(new Map()),
    created: immutableMapContainerNoCopy<NodeDataIdType, NodeData>(new Map()),
}

export const NodesStateContext = createContext<NodesStateContextType>({
    allNodes: defaultNodesState.all,
    createdNodes: defaultNodesState.created,
    deletedNodes: defaultNodesState.deleted,
    updatedNodes: defaultNodesState.updated,
    updateNodesState() {
    },
    nodesState: defaultNodesState,
})

export function useNodesState() {
    return useContext(NodesStateContext)
}