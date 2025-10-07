import type {NodeDataIdType} from "./NodeData.ts";
import type {DeepReadonly} from "../lib/DeepReadonly.ts";
import {random} from "lodash";

export type EdgeDataIdType = string

export type EdgeSourceData = Readonly<{
    id: EdgeDataIdType;
    label: string;
    fromId: NodeDataIdType;
    toId: NodeDataIdType;
}>

export type EdgeCurrentData = EdgeSourceData

export type EdgeTechData = Readonly<{
    isExplicitlyMarkedForDelete: boolean
    // isExplicitlyMarkedForDelete || markedForDeleteBecauseNodes.len > 0
    isGenerallyMarkedForDelete: boolean
    markedForDeleteBecauseNodes: readonly NodeDataIdType[]
    hasDataUpdates: boolean
    sourceOrCreated: "source" | "created"
}>

export type EdgeUpdatedData = Readonly<{
    label?: string
}>

export type EdgeData = Readonly<{
    sourceData: EdgeSourceData
    updatedData?: DeepReadonly<EdgeUpdatedData>
    currentData: DeepReadonly<EdgeCurrentData>
    tech: EdgeTechData
}>

export function generateStateVersion()
{
    return random()
}

export function calculateCurrentEdgeData(edgeSourceData: EdgeSourceData, edgeUpdatedData?: EdgeUpdatedData) {
    return {
        ...edgeSourceData,
        ...Object.fromEntries(
            Object.entries(edgeUpdatedData ?? {}).filter(([, v]) => v !== undefined)
        ),
    }
}

export function calculateHasEdgeDataUpdates(edgeSourceData: EdgeSourceData, edgeUpdatedData?: EdgeUpdatedData) : boolean {
    if (!edgeUpdatedData) return false;

    return Object.entries(edgeUpdatedData).some(
        ([key, value]) => value !== undefined && edgeSourceData[key as keyof EdgeSourceData] !== value
    );
}