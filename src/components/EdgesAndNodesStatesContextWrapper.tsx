import {type ReactNode, useMemo} from "react";

;
import type {NodeDataIdType, NodeSourceData, NodeUpdatedData} from "../types/NodeData.ts";
import type {EdgeDataIdType, EdgeSourceData, EdgeUpdatedData} from "../types/EdgeData.ts";
import type {DeepReadonly} from "../lib/DeepReadonly.ts";
import {useNodesStateReducer} from "./NodesStateReducer.ts";
import {EdgeDatasStateContext, type EdgesStateContextType} from "./EdgeDatasStateContext.tsx";
import {useEdgesStateReducer} from "./EdgesStateReducer.ts";
import {NodeDatasStateContext, type NodesStateContextType} from "./NodeDatasStateContext.tsx";


export function EdgesAndNodesStatesContextWrapper({children}: { children: ReactNode }) {
    const [edgesState, edgesStateReducer] = useEdgesStateReducer()
    const [nodesState, nodesStateReducer] = useNodesStateReducer()

    const edgesStateContextValue: EdgesStateContextType = useMemo(() => ({
        addFromSource(entries: DeepReadonly<{ edgeSourceData: EdgeSourceData }[]>): void {
            edgesStateReducer({type: "addFromSource", entries: entries})
        },
        clear(): void {
            edgesStateReducer({type: "clear"})
        },
        create(entries: DeepReadonly<{ edgeSourceData: EdgeSourceData }[]>): void {
            edgesStateReducer({type: "create", entries: entries})
        },
        edgesState: edgesState,
        markForDelete(entries: DeepReadonly<{ id: EdgeDataIdType; markForDelete: boolean }[]>): void {
            edgesStateReducer({type: "markForDelete", entries: entries})
        },
        remove(entries: DeepReadonly<{ id: EdgeDataIdType }[]>): void {
            edgesStateReducer({type: "remove", entries: entries})
        },
        update(entries: DeepReadonly<{ id: EdgeDataIdType; updatedData: Partial<EdgeUpdatedData> }[]>): void {
            edgesStateReducer({type: "update", entries: entries})
        }
    }), [edgesState, edgesStateReducer])

    const nodesStateContextValue: NodesStateContextType = useMemo(() => ({
        addFromSource(entries: DeepReadonly<{ nodeSourceData: NodeSourceData }[]>): void {
            nodesStateReducer({type: "addFromSource", entries: entries})
        },
        clear(): void {
            edgesStateReducer({type: "clear"})
            nodesStateReducer({type: "clear"})
        },
        create(entries: DeepReadonly<{ nodeSourceData: NodeSourceData }[]>): void {
            nodesStateReducer({type: "create", entries: entries})
        },
        markForDelete(entries: DeepReadonly<{ nodeId: NodeDataIdType; markForDelete: boolean }[]>): void {
            nodesStateReducer({type: "markForDelete", entries: entries})
            edgesStateReducer({type: "onNodeMarkedForDelete", entries: entries})
        },
        nodesState: nodesState,
        remove(entries: DeepReadonly<{ nodeId: NodeDataIdType }[]>): void {
            nodesStateReducer({type: "remove", entries: entries})
            edgesStateReducer({type: "onNodeRemoved", entries: entries})
        },
        update(entries: DeepReadonly<{ id: NodeDataIdType; updatedData: Partial<NodeUpdatedData> }[]>): void {
            nodesStateReducer({type: "update", entries: entries})
        }
    }), [edgesStateReducer, nodesState, nodesStateReducer])

    return <>
        <EdgeDatasStateContext.Provider value={edgesStateContextValue}>
            <NodeDatasStateContext.Provider value={nodesStateContextValue}>
                {children}
            </NodeDatasStateContext.Provider>
        </EdgeDatasStateContext.Provider>
    </>
}