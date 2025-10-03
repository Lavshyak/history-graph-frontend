import type {DeepReadonly} from "../lib/DeepReadonly.ts";

export type NodeDataIdType = string

export type NodeSourceData = DeepReadonly<{
    id: NodeDataIdType
    label: string
    timeFrom: Date
    timeTo: Date
    keywords: readonly string[]
    title: string
    description: string
}>

export type NodeCurrentData = NodeSourceData

export type NodeTechData = DeepReadonly<{
    isExplicitlyMarkedForDelete: boolean
    hasDataUpdates: boolean
    sourceOrCreated: "source" | "created"
    position?: { x: number; y: number }
}>

export type NodeUpdatedData = DeepReadonly<{
    timeFrom?: Date
    timeTo?: Date
    keywords?: readonly string[]
    title?: string
    description?: string
}>

export type NodeData = DeepReadonly<{
    sourceData: NodeSourceData
    updatedData?: NodeUpdatedData
    currentData: NodeCurrentData
    tech: NodeTechData
}>

export function calculateCurrentNodeData(nodeSourceData: NodeSourceData, nodeUpdatedData?: NodeUpdatedData) {
    return {
        ...nodeSourceData,
        ...Object.fromEntries(
            Object.entries(nodeUpdatedData ?? {}).filter(([, v]) => v !== undefined)
        ),
    }
}

export function calculateHasNodeDataUpdates(nodeSourceData: NodeSourceData, nodeUpdatedData?: NodeUpdatedData) : boolean {
    if (!nodeUpdatedData) return false;

    return Object.entries(nodeUpdatedData).some(
        ([key, value]) => value !== undefined && nodeSourceData[key as keyof NodeSourceData] !== value
    );
}
