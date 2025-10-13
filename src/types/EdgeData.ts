import type {NodeDataIdType} from "./NodeData.ts";
import type {DeepReadonly} from "../lib/DeepReadonly.ts";

export type EdgeDataIdType = string

export type EdgeSourceData = Readonly<{
    id: EdgeDataIdType;
    label: string;
    fromId: NodeDataIdType;
    toId: NodeDataIdType;
}>

export type EdgeCurrentData = EdgeSourceData

/*export type EdgeTechData = Readonly<{
    isExplicitlyMarkedForDelete: boolean
    // isExplicitlyMarkedForDelete || markedForDeleteBecauseNodes.len > 0
    isGenerallyMarkedForDelete: boolean
    markedForDeleteBecauseNodes: readonly NodeDataIdType[]
    hasDataUpdates: boolean
    sourceOrCreated: "source" | "created"
}>*/

export type EdgeUpdatedData = Readonly<{
    label?: string
}>

export type EdgeData = Readonly<{
    sourceData: EdgeSourceData
    updatedData: DeepReadonly<EdgeUpdatedData> | undefined
    currentData: DeepReadonly<EdgeCurrentData>
    //tech: EdgeTechData

    isExplicitlyMarkedForDelete: boolean
    // isExplicitlyMarkedForDelete || markedForDeleteBecauseNodes.len > 0
    // isGenerallyMarkedForDelete: boolean
    markedForDeleteBecauseNodes: readonly NodeDataIdType[]
    //hasDataUpdates: boolean
    sourceOrCreated: "source" | "created"
}>

export function calculateEdgeCurrentData(edgeSourceData: EdgeSourceData, edgeUpdatedData: Partial<EdgeUpdatedData>|undefined) : EdgeCurrentData {
    return {
        ...edgeSourceData,
        ...Object.fromEntries(Object.entries(edgeUpdatedData ?? {}).filter(([, v]) => v !== undefined)),
    }
}

export function normalizeEdgeUpdatedData(edgeSourceData: EdgeSourceData, edgeUpdatedData?: Partial<EdgeUpdatedData>) : EdgeUpdatedData|undefined {
    if (!edgeUpdatedData) return undefined;

    const oldEntries = Object.entries(edgeUpdatedData)
    const newEntries = oldEntries.filter(
        ([key, value]) =>
            value !== undefined && edgeSourceData[key as keyof EdgeSourceData] !== value)

    if (oldEntries.length === newEntries.length) {
        return edgeUpdatedData
    }

    if(newEntries.length < 1) return undefined;

    return Object.fromEntries(newEntries)
}


/*
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
}*/
