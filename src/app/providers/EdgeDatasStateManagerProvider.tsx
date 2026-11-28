import {type ReactNode, useContext, useRef} from "react";
import {NodeDatasStateManagerContext} from "@/model/graph/nodeDatasStateManagerContext.ts";
import {createNormalEvent} from "@/shared/lib/events.ts";
import type {NodeDataIdType} from "@/model/node/nodeData.ts";
import {createEdgeDatasStateManager} from "@/model/edge/createEdgeDatasStateManager.ts";
import {EdgeDatasStateManagerContext} from "@/model/graph/edgeDatasStateManagerContext.ts";
import useDevRenderCountLogging from "@/shared/dev/useRenderCountLogging.ts";

export function EdgeDatasStateManagerProvider({children}: { children: ReactNode }) {
    useDevRenderCountLogging("EdgeDatasStateManagerProvider", true)
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