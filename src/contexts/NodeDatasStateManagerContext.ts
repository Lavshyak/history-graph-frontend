import {createContext} from "react";
import {type NodeDatasStateManager} from "../coolerState/coolerNodesState.ts";
import {createNormalEvent, createNormalKeyedEvent} from "../lib/event.ts";

export const NodeDatasStateManagerContext = createContext<NodeDatasStateManager>({
    allNodeDatasMap: new Map(),
    markedForDeleteNodeDataIdsSet: new Set(),
    nodesStateEvents: {
        nodeDataUpdatedEvent: createNormalKeyedEvent(),
        nodeAddedEvent: createNormalEvent()
    },
    updatedNodeDataIdsSet: new Set(),
    addNodeFromSource(): void {
    },
    addNodeFromCreated() {
    },
    markNodeForDelete(): void {
    },
    updateNodeData(): void {
    }
})

