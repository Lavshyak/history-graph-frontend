import {createContext} from "react";
import {type NodeDatasStateManager} from "@/model/node/createNodeDatasStateManager.ts";
import {createNormalEvent, createNormalKeyedEvent} from "@/shared/lib/events.ts";

export const NodeDatasStateManagerContext = createContext<NodeDatasStateManager>({
    allNodeDatasMap: new Map(),
    markedForDeleteNodeDataIdsSet: new Set(),
    nodesStateEvents: {
        nodeDataUpdatedEvent: createNormalKeyedEvent(),
        nodeAddedEvent: createNormalEvent()
    },
    updatedNodeDataIdsSet: new Set(),
    createdNodeDataIdsSet: new Set(),
    addNodeFromSource(): void {
    },
    addNodeFromCreated() {
    },
    markNodeForDelete(): void {
    },
    updateNodeData(): void {
    }
})

