import {createContext, useContext} from "react";
import type {EdgeData, EdgeDataIdType} from "../types/EdgeData.ts";
import type {EdgesImmutableMapContainer, EdgesState, EdgesStateReducerActionArgs} from "./EdgesStateWrapper.tsx";
import type {NodeDataIdType} from "../types/NodeData.ts";
import {immutableDictionary} from "../lib/ImmutableDictionary.ts";

export type EdgesStateContextType = Readonly<{
    allEdges:EdgesImmutableMapContainer
    updatedEdges: EdgesImmutableMapContainer
    deletedEdges: EdgesImmutableMapContainer
    createdEdges: EdgesImmutableMapContainer
    edgesState: EdgesState
    readonly updateEdgesState: React.ActionDispatch<[args: EdgesStateReducerActionArgs]>
    getEdgesByNode(nodeId: NodeDataIdType): EdgeData[],
}>

const defaultEdgesState = {
    all: immutableDictionary<EdgeDataIdType, EdgeData>({}),
    updated: immutableDictionary<EdgeDataIdType, EdgeData>({}),
    deleted: immutableDictionary<EdgeDataIdType, EdgeData>({}),
    created: immutableDictionary<EdgeDataIdType, EdgeData>({})
}

export const EdgesStateContext = createContext<EdgesStateContextType>({

    allEdges: defaultEdgesState.all,
    createdEdges: defaultEdgesState.created,
    deletedEdges: defaultEdgesState.deleted,
    edgesState: defaultEdgesState,
    updatedEdges: defaultEdgesState.updated,
    updateEdgesState() {
    },
    getEdgesByNode(): EdgeData[] {
        return []
    }
})

export function useEdgesStateContext() {
    return useContext(EdgesStateContext)
}