import {createContext, useContext} from "react";
import type {EdgeData, EdgeDataIdType} from "../types/EdgeData.ts";
import type {EdgesState, EdgesStateReducerActionArgs} from "./EdgesStateWrapper.tsx";
import type {NodeDataIdType} from "../types/NodeData.ts";

export type EdgesStateContextType = Readonly<{
    allEdges: Readonly<Record<EdgeDataIdType, EdgeData>>
    updatedEdges: Readonly<Record<EdgeDataIdType, EdgeData>>
    deletedEdges: Readonly<Record<EdgeDataIdType, EdgeData>>
    createdEdges: Readonly<Record<EdgeDataIdType, EdgeData>>
    edgesState: EdgesState
    readonly updateEdgesState: React.ActionDispatch<[args: EdgesStateReducerActionArgs]>
    getEdgesByNode(nodeId: NodeDataIdType): EdgeData[],

    allEdgesList: readonly EdgeData[],
    updatedEdgesList: readonly EdgeData[],
    deletedEdgesList: readonly EdgeData[],
    createdEdgesList: readonly EdgeData[],
}>

export const EdgesStateContext = createContext<EdgesStateContextType>({

    allEdges: {},
    createdEdges: {},
    deletedEdges: {},
    edgesState: {
        all: {},
        updated: {},
        deleted: {},
        created: {}
    },
    updatedEdges: {},
    updateEdgesState() {
    },
    getEdgesByNode(): EdgeData[] {
        return []
    },
    allEdgesList: [],
    createdEdgesList: [],
    deletedEdgesList: [],
    updatedEdgesList: [],
})

export function useEdgesStateContext() {
    return useContext(EdgesStateContext)
}