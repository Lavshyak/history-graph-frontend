import {
    calculateNodeCurrentData,
    type NodeData,
    type NodeDataIdType,
    type NodeSourceData,
    type NodeUpdatedData, normalizeNodeUpdatedData
} from "../types/NodeData.ts";
import {
    createNormalEvent,
    createNormalKeyedEvent,
    type NormalKeyedListenableEvent,
    type NormalListenableEvent, type NormalListenableEventsContainer
} from "../lib/event/event.ts";

type NodesStateEvents = {
    nodeDataUpdatedEvent: NormalKeyedListenableEvent<{ oldNodeData: NodeData, newNodeData: NodeData }, NodeDataIdType>
    nodeAddedEvent: NormalListenableEvent<{ nodeDataId: NodeDataIdType }>
}

export type NodeDatasStateManager = {
    addNodeFromSource(nodeSourceData: NodeSourceData): void
    addNodeFromCreated(nodeSourceData: NodeSourceData): void
    updateNodeData(nodeId: NodeDataIdType, nodeUpdatedDataPart: Partial<NodeUpdatedData>): void
    markNodeForDelete(nodeId: string, isMarkForDelete: boolean): void

    nodesStateEvents: NodesStateEvents,
    allNodeDatasMap: ReadonlyMap<NodeDataIdType, NodeData>,
    updatedNodeDataIdsSet: ReadonlySet<NodeDataIdType>,
    markedForDeleteNodeDataIdsSet: ReadonlySet<NodeDataIdType>,
}

export function createNodeDatasStateManager(): NodeDatasStateManager {
    const nodesStateEvents = {
        nodeDataUpdatedEvent: createNormalKeyedEvent<{
            oldNodeData: NodeData,
            newNodeData: NodeData
        }, NodeDataIdType>(),
        nodeAddedEvent: createNormalEvent<{ nodeDataId: NodeDataIdType }>()
    }

    const allNodeDatasMap: Map<NodeDataIdType, NodeData> = new Map()
    const updatedNodeDataIdsSet: Set<NodeDataIdType> = new Set<NodeDataIdType>()
    const markedForDeleteNodeDataIdsSet: Set<NodeDataIdType> = new Set<NodeDataIdType>()

    nodesStateEvents.nodeDataUpdatedEvent.on(({newNodeData}) => {
        if (newNodeData.updatedData !== undefined) {
            updatedNodeDataIdsSet.add(newNodeData.currentData.id)
        } else {
            updatedNodeDataIdsSet.delete(newNodeData.currentData.id)
        }

        if (newNodeData.isExplicitlyMarkedForDelete) {
            markedForDeleteNodeDataIdsSet.add(newNodeData.currentData.id)
        } else {
            markedForDeleteNodeDataIdsSet.delete(newNodeData.currentData.id)
        }
    })

    return {
        addNodeFromSource(nodeSourceData: NodeSourceData) {
            if (allNodeDatasMap.has(nodeSourceData.id))
                throw new Error(`Could not add node from nodeSourceData with id ${nodeSourceData.id}: exists`)

            const newNodeData: NodeData = {
                sourceData: nodeSourceData,
                updatedData: undefined,
                currentData: calculateNodeCurrentData(nodeSourceData, undefined),

                isExplicitlyMarkedForDelete: false,
                sourceOrCreated: "source"
            }

            allNodeDatasMap.set(nodeSourceData.id, newNodeData);
            nodesStateEvents.nodeAddedEvent.emit({nodeDataId: nodeSourceData.id})
        },
        addNodeFromCreated(nodeSourceData: NodeSourceData){
            if (allNodeDatasMap.has(nodeSourceData.id))
                throw new Error(`Could not add node from nodeSourceData with id ${nodeSourceData.id}: exists`)

            const newNodeData: NodeData = {
                sourceData: nodeSourceData,
                updatedData: undefined,
                currentData: calculateNodeCurrentData(nodeSourceData, undefined),

                isExplicitlyMarkedForDelete: false,
                sourceOrCreated: "created"
            }

            allNodeDatasMap.set(nodeSourceData.id, newNodeData);
            nodesStateEvents.nodeAddedEvent.emit({nodeDataId: nodeSourceData.id})
        },
        updateNodeData(nodeId: NodeDataIdType, nodeUpdatedDataPart: Partial<NodeUpdatedData>) {
            const oldNodeData = allNodeDatasMap.get(nodeId)
            if (!oldNodeData) {
                throw new Error(`Could not update node with id ${nodeId}: not found`)
            }

            const newRawNodeUpdatedData = {
                ...oldNodeData.updatedData,
                ...nodeUpdatedDataPart
            }

            const newNodeUpdatedData = normalizeNodeUpdatedData(oldNodeData.sourceData, newRawNodeUpdatedData)

            const newNodeCurrentData = calculateNodeCurrentData(oldNodeData.sourceData, newNodeUpdatedData)

            const newNodeData: NodeData = {
                ...oldNodeData,
                updatedData: newRawNodeUpdatedData,
                currentData: newNodeCurrentData,
            }

            allNodeDatasMap.set(newNodeData.sourceData.id, newNodeData);
            nodesStateEvents.nodeDataUpdatedEvent.emit(newNodeData.sourceData.id, {
                oldNodeData: oldNodeData,
                newNodeData: newNodeData
            })
        },
        markNodeForDelete(nodeId: string, isMarkForDelete: boolean) {
            const oldNodeData = allNodeDatasMap.get(nodeId)
            if (!oldNodeData) {
                throw new Error(`Could not update node with id ${nodeId}: not found`)
            }

            const newNodeData: NodeData = {
                ...oldNodeData,
                isExplicitlyMarkedForDelete: isMarkForDelete
            }

            allNodeDatasMap.set(newNodeData.sourceData.id, newNodeData);
            nodesStateEvents.nodeDataUpdatedEvent.emit(newNodeData.sourceData.id, {
                oldNodeData: oldNodeData,
                newNodeData: newNodeData
            })
        },
        nodesStateEvents: nodesStateEvents as NormalListenableEventsContainer<typeof nodesStateEvents>,
        allNodeDatasMap: allNodeDatasMap as ReadonlyMap<NodeDataIdType, NodeData>,
        updatedNodeDataIdsSet: updatedNodeDataIdsSet,
        markedForDeleteNodeDataIdsSet: markedForDeleteNodeDataIdsSet
    }
}


