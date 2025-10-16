import {
    calculateEdgeCurrentData,
    type EdgeData,
    type EdgeDataIdType,
    type EdgeSourceData,
    type EdgeUpdatedData, normalizeEdgeUpdatedData
} from "../types/EdgeData.ts";
import {
    createNormalEvent,
    createNormalKeyedEvent,
    type NormalKeyedListenableEvent, type NormalListenableEvent, type NormalListenableEventsContainer,
} from "../lib/event.ts";
import type {NodeDataIdType} from "../types/NodeData.ts";

type EdgesStateEvents = {
    edgeDataUpdatedEvent: NormalKeyedListenableEvent<{ oldEdgeData: EdgeData, newEdgeData: EdgeData }, EdgeDataIdType>
    edgeAddedEvent: NormalListenableEvent<{ edgeDataId: EdgeDataIdType }>
    edgeRemovedEvent: NormalListenableEvent<{ edgeDataId: EdgeDataIdType }>
}

export type EdgeDatasStateManager = {
    addEdgeFromSource(edgeSourceData: EdgeSourceData): void
    addEdgeFromCreated(edgeSourceData: EdgeSourceData): void
    updateEdgeData(edgeId: EdgeDataIdType, edgeUpdatedDataPart: Partial<EdgeUpdatedData>): void
    markEdgeForDelete(edgeId: string, isMarkForDelete: boolean): void

    edgesStateEvents: EdgesStateEvents,
    allEdgeDatasMap: ReadonlyMap<EdgeDataIdType, EdgeData>,
    updatedEdgeDataIdsSet: Set<EdgeDataIdType>,
}

export function createEdgeDatasStateManager(nodeMarkedForDeleteChangedEvent: NormalListenableEvent<{
    nodeId: NodeDataIdType,
    markedForDeleteState: boolean
}>, nodeRemovedEvent: NormalListenableEvent<{ nodeId: NodeDataIdType }>): EdgeDatasStateManager {
    const edgesStateEvents = {
        edgeDataUpdatedEvent: createNormalKeyedEvent<{
            oldEdgeData: EdgeData,
            newEdgeData: EdgeData
        }, EdgeDataIdType>(),
        edgeAddedEvent: createNormalEvent<{ edgeDataId: EdgeDataIdType }>(),
        edgeRemovedEvent: createNormalEvent<{ edgeDataId: EdgeDataIdType }>(),
    }

    const allEdgeDatasMap: Map<EdgeDataIdType, EdgeData> = new Map()
    const nodeIdToEdgeIdsMap: Map<NodeDataIdType, EdgeDataIdType[]> = new Map()
    const updatedEdgeDataIdsSet: Set<EdgeDataIdType> = new Set<EdgeDataIdType>()

    nodeRemovedEvent.on(({nodeId}) => {
        const edgeIds = nodeIdToEdgeIdsMap.get(nodeId)
        if (!edgeIds) return;

        nodeIdToEdgeIdsMap.delete(nodeId)
        edgeIds.forEach(edgeId => {
            allEdgeDatasMap.delete(edgeId)
            updatedEdgeDataIdsSet.delete(edgeId)
            edgesStateEvents.edgeRemovedEvent.emit({edgeDataId: edgeId})
        })
    })

    edgesStateEvents.edgeDataUpdatedEvent.on(({newEdgeData}) => {
        if (newEdgeData.updatedData !== undefined) {
            updatedEdgeDataIdsSet.add(newEdgeData.sourceData.id)
        } else {
            updatedEdgeDataIdsSet.delete(newEdgeData.sourceData.id)
        }
    })

    nodeMarkedForDeleteChangedEvent.on(({nodeId, markedForDeleteState: nodeMarkedForDeleteState}) => {
        const edgeIds = nodeIdToEdgeIdsMap.get(nodeId)
        if (!edgeIds) return;

        edgeIds.forEach(edgeId => {
            const edgeData = allEdgeDatasMap.get(edgeId)
            if (!edgeData) throw new Error(`edgeData not found in allEdgeDatasMap for edge id ${edgeId}`);

            const newEdgeData: EdgeData = {
                ...edgeData,
                markedForDeleteBecauseNodes: nodeMarkedForDeleteState
                    ? [...edgeData.markedForDeleteBecauseNodes, nodeId]
                    : edgeData.markedForDeleteBecauseNodes.filter(_nodeId => _nodeId !== nodeId)
            }

            allEdgeDatasMap.set(edgeId, newEdgeData)
            edgesStateEvents.edgeDataUpdatedEvent.emit(edgeId, {oldEdgeData: edgeData, newEdgeData: newEdgeData})
        })
    })

    return {
        addEdgeFromSource(edgeSourceData: EdgeSourceData) {
            if (allEdgeDatasMap.has(edgeSourceData.id))
                throw new Error(`Could not add edge from edgeSourceData with id ${edgeSourceData.id}: exists`)

            const newEdgeData: EdgeData = {
                sourceData: edgeSourceData,
                updatedData: undefined,
                currentData: calculateEdgeCurrentData(edgeSourceData, undefined),

                isExplicitlyMarkedForDelete: false,
                markedForDeleteBecauseNodes: [],
                sourceOrCreated: "source",
            }

            allEdgeDatasMap.set(edgeSourceData.id, newEdgeData);

            const relatedNodes = [edgeSourceData.fromId, edgeSourceData.toId]
            relatedNodes.forEach(nodeId => {
                const edges = nodeIdToEdgeIdsMap.get(nodeId)
                if(!edges){
                    nodeIdToEdgeIdsMap.set(nodeId, [edgeSourceData.id])
                }
                else{
                    edges.push(edgeSourceData.id)
                }
            })

            edgesStateEvents.edgeAddedEvent.emit({edgeDataId: edgeSourceData.id})
        },
        addEdgeFromCreated(edgeSourceData: EdgeSourceData){
            if (allEdgeDatasMap.has(edgeSourceData.id))
                throw new Error(`Could not add edge from edgeSourceData with id ${edgeSourceData.id}: exists`)

            const newEdgeData: EdgeData = {
                sourceData: edgeSourceData,
                updatedData: undefined,
                currentData: calculateEdgeCurrentData(edgeSourceData, undefined),

                isExplicitlyMarkedForDelete: false,
                markedForDeleteBecauseNodes: [],
                sourceOrCreated: "created",
            }

            allEdgeDatasMap.set(edgeSourceData.id, newEdgeData);

            const relatedNodes = [edgeSourceData.fromId, edgeSourceData.toId]
            relatedNodes.forEach(nodeId => {
                const edges = nodeIdToEdgeIdsMap.get(nodeId)
                if(!edges){
                    nodeIdToEdgeIdsMap.set(nodeId, [edgeSourceData.id])
                }
                else{
                    edges.push(edgeSourceData.id)
                }
            })

            edgesStateEvents.edgeAddedEvent.emit({edgeDataId: edgeSourceData.id})
        },
        updateEdgeData(edgeId: EdgeDataIdType, edgeUpdatedDataPart: Partial<EdgeUpdatedData>) {
            const oldEdgeData = allEdgeDatasMap.get(edgeId)
            if (!oldEdgeData) {
                throw new Error(`Could not update edge with id ${edgeId}: not found`)
            }

            const newRawEdgeUpdatedData = {
                ...oldEdgeData.updatedData,
                ...edgeUpdatedDataPart
            }

            const newEdgeUpdatedData = normalizeEdgeUpdatedData(oldEdgeData.sourceData, newRawEdgeUpdatedData)

            const newEdgeCurrentData = calculateEdgeCurrentData(oldEdgeData.sourceData, newEdgeUpdatedData)

            const newEdgeData: EdgeData = {
                ...oldEdgeData,
                updatedData: newRawEdgeUpdatedData,
                currentData: newEdgeCurrentData,
            }

            allEdgeDatasMap.set(newEdgeData.sourceData.id, newEdgeData);
            edgesStateEvents.edgeDataUpdatedEvent.emit(newEdgeData.sourceData.id, {
                oldEdgeData: oldEdgeData,
                newEdgeData: newEdgeData
            })
        },
        markEdgeForDelete(edgeId: string, isMarkForDelete: boolean) {
            const oldEdgeData = allEdgeDatasMap.get(edgeId)
            if (!oldEdgeData) {
                throw new Error(`Could not update edge with id ${edgeId}: not found`)
            }

            const newEdgeData: EdgeData = {
                ...oldEdgeData,
                isExplicitlyMarkedForDelete: isMarkForDelete
            }

            allEdgeDatasMap.set(newEdgeData.sourceData.id, newEdgeData);
            edgesStateEvents.edgeDataUpdatedEvent.emit(newEdgeData.sourceData.id, {
                oldEdgeData: oldEdgeData,
                newEdgeData: newEdgeData
            })
        },
        edgesStateEvents: edgesStateEvents as NormalListenableEventsContainer<typeof edgesStateEvents>,
        allEdgeDatasMap: allEdgeDatasMap as ReadonlyMap<EdgeDataIdType, EdgeData>,
        updatedEdgeDataIdsSet: updatedEdgeDataIdsSet
    }
}
