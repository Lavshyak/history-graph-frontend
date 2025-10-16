import {type ReactNode, useContext, useState} from "react";
import {NodeDatasStateManagerContext} from "../../contexts/NodeDatasStateManagerContext.ts";
import {EdgeDatasStateManagerContext} from "../../contexts/EdgeDatasStateManagerContext.ts";
import {useEventHandling} from "../../hooks/useEventHandling.ts";
import {GraphDataHasChangesContext} from "../../contexts/GraphDataHasChangesContext.ts";

export function GraphDataHasChangesContextWrapper({children}: { children: ReactNode }) {
    const [hasChanges, setHasChanges] = useState<boolean>(false);

    const nodeDatasStateManager = useContext(NodeDatasStateManagerContext)
    const edgeDatasStateManager = useContext(EdgeDatasStateManagerContext)

    useEventHandling(nodeDatasStateManager.nodesStateEvents.nodeDataUpdatedEvent, () => {
        if (nodeDatasStateManager.updatedNodeDataIdsSet.size > 0 || edgeDatasStateManager.updatedEdgeDataIdsSet.size > 0) {
            setHasChanges(true)
        } else {
            setHasChanges(false)
        }
    })
    useEventHandling(edgeDatasStateManager.edgesStateEvents.edgeDataUpdatedEvent, () => {
        if (nodeDatasStateManager.updatedNodeDataIdsSet.size > 0 || edgeDatasStateManager.updatedEdgeDataIdsSet.size > 0) {
            setHasChanges(true)
        } else {
            setHasChanges(false)
        }
    })

    return (<GraphDataHasChangesContext.Provider value={hasChanges}>
        {children}
    </GraphDataHasChangesContext.Provider>)
}