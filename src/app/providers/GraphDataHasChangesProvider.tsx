import {type ReactNode, useContext, useState} from "react";
import {NodeDatasStateManagerContext} from "@/model/graph/nodeDatasStateManagerContext.ts";
import {EdgeDatasStateManagerContext} from "@/model/graph/edgeDatasStateManagerContext.ts";
import {useEventHandling} from "@/shared/hooks/useEventHandling.ts";
import {GraphDataHasChangesContext} from "@/model/graph/graphDataHasChangesContext.ts";
import useDevRenderCountLogging from "@/shared/dev/useRenderCountLogging.ts";

export function GraphDataHasChangesProvider({children}: { children: ReactNode }) {
    useDevRenderCountLogging("GraphDataHasChangesProvider")
    const [hasChanges, setHasChanges] = useState<boolean>(false);

    const nodeDatasStateManager = useContext(NodeDatasStateManagerContext)
    const edgeDatasStateManager = useContext(EdgeDatasStateManagerContext)

    useEventHandling(nodeDatasStateManager.nodesStateEvents.nodeDataUpdatedEvent, ({oldNodeData, newNodeData}) => {
        setHasChanges(true)
    })
    useEventHandling(nodeDatasStateManager.nodesStateEvents.nodeAddedEvent, ({nodeDataId, nodeData}) => {
        if (nodeData.sourceOrCreated == "source")
            return;
        setHasChanges(true)
    })

    useEventHandling(edgeDatasStateManager.edgesStateEvents.edgeDataUpdatedEvent, ({oldEdgeData, newEdgeData}) => {
        setHasChanges(true)
    })
    useEventHandling(edgeDatasStateManager.edgesStateEvents.edgeAddedEvent, ({edgeDataId, edgeData}) => {
        if (edgeData.sourceOrCreated == "source")
            return;
        setHasChanges(true)
    })

    return (<GraphDataHasChangesContext.Provider value={hasChanges}>
        {children}
    </GraphDataHasChangesContext.Provider>)
}