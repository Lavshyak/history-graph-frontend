import {createContext} from "react";
import {type EdgeDatasStateManager} from "@/model/edge/createEdgeDatasStateManager.ts";
import {createNormalEvent, createNormalKeyedEvent} from "@/shared/lib/events.ts";

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

