import {createContext} from "react";
import {type EdgeDatasStateManager} from "../coolerState/coolerEdgesState.ts";
import {createNormalEvent, createNormalKeyedEvent} from "../lib/event.ts";

export const EdgeDatasStateManagerContext = createContext<EdgeDatasStateManager>({
    allEdgeDatasMap: new Map(),
    edgesStateEvents: {
        edgeDataUpdatedEvent: createNormalKeyedEvent(),
        edgeAddedEvent: createNormalEvent(),
        edgeRemovedEvent: createNormalEvent()
    },
    updatedEdgeDataIdsSet: new Set(),
    addEdgeFromSource(): void {
    },
    addEdgeFromCreated() {
    },
    markEdgeForDelete(): void {
    },
    updateEdgeData(): void {
    }

})

