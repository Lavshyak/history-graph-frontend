import {createContext} from "react";
import type {DeepReadonly} from "../lib/DeepReadonly.ts";
import type {NodeDataIdType, NodeSourceData, NodeUpdatedData} from "../types/NodeData.ts";
import {emptyImmutableMapContainer} from "../lib/ImmutableDictionary.ts";
import type {NodesState} from "./NodesStateReducer.ts";

export type NodesStateContextType = Readonly<{
    nodesState: NodesState
    update(entries: DeepReadonly<{ id: NodeDataIdType; updatedData: Partial<NodeUpdatedData> }[]>): void
    markForDelete(entries: DeepReadonly<{ nodeId: NodeDataIdType; markForDelete: boolean; }[]>): void
    addFromSource(entries: DeepReadonly<{ nodeSourceData: NodeSourceData }[]>): void
    create(entries: DeepReadonly<{ nodeSourceData: NodeSourceData }[]>): void
    clear(): void
    remove(entries: DeepReadonly<{ nodeId: NodeDataIdType }[]>): void
}>

export const NodeDatasStateContext = createContext<NodesStateContextType>({
    addFromSource(entries: DeepReadonly<{ nodeSourceData: NodeSourceData }[]>): void {
    }, clear(): void {
    }, create(entries: DeepReadonly<{ nodeSourceData: NodeSourceData }[]>): void {
    }, markForDelete(entries: DeepReadonly<{ nodeId: NodeDataIdType; markForDelete: boolean }[]>): void {
    }, nodesState: {
        all: emptyImmutableMapContainer(),
        updated: emptyImmutableMapContainer(),
        deleted: emptyImmutableMapContainer(),
        created: emptyImmutableMapContainer()
    },
    remove(entries: DeepReadonly<{ nodeId: NodeDataIdType }[]>): void {
    }, update(entries: DeepReadonly<{ id: NodeDataIdType; updatedData: Partial<NodeUpdatedData> }[]>): void {
    }
})