import {type ReactNode, useContext, useRef} from "react";
import {NodeDatasStateManagerContext} from "../../contexts/NodeDatasStateManagerContext.ts";
import {createNormalEvent} from "../../lib/event.ts";
import type {NodeDataIdType} from "../../types/NodeData.ts";
import {createEdgeDatasStateManager} from "../../coolerState/coolerEdgesState.ts";
import {EdgeDatasStateManagerContext} from "../../contexts/EdgeDatasStateManagerContext.ts";

export function EdgeDatasStateManagerContextWrapper({children}: { children: ReactNode }) {
    const nodeDatasStateManager = useContext(NodeDatasStateManagerContext)

    const edgeDatasStateManager = useRef(
        (() => {
            const nodeMarkedForDeleteEvent = createNormalEvent<{
                nodeId: NodeDataIdType,
                markedForDeleteState: boolean
            }>()
            nodeDatasStateManager.nodesStateEvents.nodeDataUpdatedEvent.on(({oldNodeData, newNodeData}) => {
                if (oldNodeData.isExplicitlyMarkedForDelete !== newNodeData.isExplicitlyMarkedForDelete) {
                    nodeMarkedForDeleteEvent.emit({
                        nodeId: newNodeData.sourceData.id,
                        markedForDeleteState: newNodeData.isExplicitlyMarkedForDelete
                    })
                }
            })

            const nodeRemovedEvent = createNormalEvent<{ nodeId: NodeDataIdType }>()

            return createEdgeDatasStateManager(nodeMarkedForDeleteEvent, nodeRemovedEvent)
        })()
    ).current

    return (<EdgeDatasStateManagerContext value={edgeDatasStateManager}>
        {children}
    </EdgeDatasStateManagerContext>)
}