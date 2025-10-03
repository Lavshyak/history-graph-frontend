import {createContext, useContext} from "react";
import type {DeepReadonly} from "../lib/DeepReadonly.ts";
import type {EdgeDataIdType, EdgeSourceData, EdgeUpdatedData} from "../types/EdgeData.ts";
import {emptyImmutableMapContainer} from "../lib/ImmutableDictionary.ts";
import type {EdgesState} from "./EdgesStateReducer.ts";

export type EdgesStateContextType = Readonly<{
    edgesState: EdgesState
    //getEdgesByNodeId(nodeId: NodeDataIdType): EdgeData[]
    update(entries: DeepReadonly<{ id: EdgeDataIdType; updatedData: Partial<EdgeUpdatedData> }[]>): void
    markForDelete(entries: DeepReadonly<{ id: EdgeDataIdType; markForDelete: boolean; }[]>): void
    addFromSource(entries: DeepReadonly<{ edgeSourceData: EdgeSourceData }[]>): void
    create(entries: DeepReadonly<{ edgeSourceData: EdgeSourceData }[]>): void
    clear(): void
    remove(entries: DeepReadonly<{ id: EdgeDataIdType }[]>): void
}>

export const EdgeDatasStateContext = createContext<EdgesStateContextType>({
    addFromSource(entries: DeepReadonly<{ edgeSourceData: EdgeSourceData }[]>): void {
    },
    clear(): void {
    },
    create(entries: DeepReadonly<{ edgeSourceData: EdgeSourceData }[]>): void {
    },
    edgesState: {
        all: emptyImmutableMapContainer(),
        updated: emptyImmutableMapContainer(),
        deleted: emptyImmutableMapContainer(),
        created: emptyImmutableMapContainer(),
        nodesIdsEdgesIds: emptyImmutableMapContainer()
    },
    markForDelete(entries: DeepReadonly<{ id: EdgeDataIdType; markForDelete: boolean }[]>): void {
    },
    remove(entries: DeepReadonly<{ id: EdgeDataIdType }[]>): void {
    },
    update(entries: DeepReadonly<{ id: EdgeDataIdType; updatedData: Partial<EdgeUpdatedData> }[]>): void {
    }

})