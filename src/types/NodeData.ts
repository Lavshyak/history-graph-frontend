export type NodeDataIdType = string

export type NodeSourceData = Readonly<{
    id: NodeDataIdType
    label: string
    timeFrom: Date
    timeTo: Date
    keywords: readonly string[]
    title: string
    description: string
}>

export type NodeCurrentData = NodeSourceData

export type NodeUpdatedData = Readonly<{
    timeFrom?: Date
    timeTo?: Date
    keywords?: readonly string[]
    title?: string
    description?: string
}>

export type NodeData = Readonly<{
    sourceData: NodeSourceData
    // если undefined, значит изменений нет
    updatedData: NodeUpdatedData | undefined
    currentData: NodeCurrentData

    isExplicitlyMarkedForDelete: boolean
    //hasDataUpdates: boolean
    sourceOrCreated: "source" | "created"
}>

export function calculateNodeCurrentData(nodeSourceData: NodeSourceData, nodeUpdatedData: Partial<NodeUpdatedData>|undefined) : NodeCurrentData {
    return {
        ...nodeSourceData,
        ...Object.fromEntries(Object.entries(nodeUpdatedData ?? {}).filter(([, v]) => v !== undefined)),
    }
}

export function normalizeNodeUpdatedData(nodeSourceData: NodeSourceData, nodeUpdatedData?: Partial<NodeUpdatedData>) : NodeUpdatedData|undefined {
    if (!nodeUpdatedData) return undefined;

    const oldEntries = Object.entries(nodeUpdatedData)
    const newEntries = oldEntries.filter(
        ([key, value]) =>
            value !== undefined && nodeSourceData[key as keyof NodeSourceData] !== value)

    if (oldEntries.length === newEntries.length) {
        return nodeUpdatedData
    }

    if(newEntries.length < 1) return undefined;

    return Object.fromEntries(newEntries)
}

/*export function calculateNodeHasDataUpdates(nodeSourceData: NodeSourceData, nodeUpdatedData?: NodeUpdatedData) : boolean {
    if (!nodeUpdatedData) return false;

    return Object.entries(nodeUpdatedData).some(
        ([key, value]) => value !== undefined && nodeSourceData[key as keyof NodeSourceData] !== value
    );
}*/


/*
export function reinitNodeDataWithRecalculations(nodeData: NodeData, updatedData: NodeUpdatedData) : NodeData {
    const newCurrentData = calculateCurrentNodeData(nodeData.sourceData, nodeData.updatedData)

    return {
        ...nodeData,
        currentData: newCurrentData,
        hasDataUpdates: calculateHasNodeDataUpdates(nodeData.sourceData, newCurrentData)
    }
}

function calculateCurrentNodeData(nodeSourceData: NodeSourceData, nodeUpdatedData?: NodeUpdatedData) {
    return {
        ...nodeSourceData,
        ...Object.fromEntries(
            Object.entries(nodeUpdatedData ?? {}).filter(([, v]) => v !== undefined)
        ),
    }
}


*/
