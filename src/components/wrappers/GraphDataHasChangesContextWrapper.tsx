import {type ReactNode, useContext, useState} from "react";
import {NodeDatasStateManagerContext} from "../../contexts/NodeDatasStateManagerContext.ts";
import {EdgeDatasStateManagerContext} from "../../contexts/EdgeDatasStateManagerContext.ts";
import {useEventHandling} from "../../hooks/useEventHandling.ts";
import {GraphDataHasChangesContext} from "../../contexts/GraphDataHasChangesContext.ts";

export function GraphDataHasChangesContextWrapper({children}: { children: ReactNode }) {
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

    console.log("GraphDataHasChangesContextWrapper:hasChanges=" + hasChanges)

    return (<GraphDataHasChangesContext.Provider value={hasChanges}>
        {children}
    </GraphDataHasChangesContext.Provider>)
}