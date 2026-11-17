import {Card} from "antd";
import {memo, useContext, useEffect, useReducer, useRef, useState, useSyncExternalStore} from "react";
import {NodeDatasStateManagerContext} from "../../../contexts/NodeDatasStateManagerContext.ts";
import {EdgeDatasStateManagerContext} from "../../../contexts/EdgeDatasStateManagerContext.ts";
import type {NodeData, NodeDataIdType} from "../../../types/NodeData.ts";
import {useEventHandling} from "../../../hooks/useEventHandling.ts";
import {createRoot} from "react-dom/client";

// ну тут реально memo полезное
export const GraphChangesSummaryView = memo(GraphChangesSummaryView1)

export default GraphChangesSummaryView

export function GraphChangesSummaryView1() {
    const rendersCount = useRef(0);
    rendersCount.current += 1

    const nodeDatasStateManager = useContext(NodeDatasStateManagerContext)
    const edgeDatasStateManager = useContext(EdgeDatasStateManagerContext)

    const [_, rerenderThis] = useReducer(x=>x+1, 0)

    useEventHandling(nodeDatasStateManager.nodesStateEvents.nodeAddedEvent,
        rerenderThis
        )

    useEventHandling(nodeDatasStateManager.nodesStateEvents.nodeDataUpdatedEvent,
        rerenderThis
    )

    useEventHandling(edgeDatasStateManager.edgesStateEvents.edgeAddedEvent,
        rerenderThis
    )

    useEventHandling(edgeDatasStateManager.edgesStateEvents.edgeRemovedEvent,
        rerenderThis
    )

    useEventHandling(edgeDatasStateManager.edgesStateEvents.edgeDataUpdatedEvent,
        rerenderThis
    )

    /*const [createdNodes, setCreatedNodes] = useState<NodeData[]>([])

    const createdNodesDict : {[key: NodeDataIdType]: {nodeData: NodeData, idx: number}} = {}
    const createdNodesList : (NodeData|undefined)[] = []
    const refCreatedNodesDivs = useRef([])
    const refCreatedNodesRoots = useRef(createRoot(refCreatedNodesDiv.current))
    useSyncExternalStore()

    refCreatedNodesRoot.current.render()

    useEffect(() => {
        return () => {
            // Your code you want to run on unmount.
        };
    }, []);


    /!*return <div ref={refCreatedNodesDiv}/>*!/

    useEventHandling(nodeDatasStateManager.nodesStateEvents.nodeAddedEvent,
        ({nodeData, nodeDataId}) => {
            if (nodeData.sourceOrCreated === "created") {
                const idx = createdNodesList.length
                createdNodesList.push(nodeData)
                createdNodesDict[nodeData.currentData.id] = {nodeData, idx}
                document.createElement('div')
                refCreatedNodesDiv.current.appendChild(<div></div>)
            }
        })

    useEventHandling(nodeDatasStateManager.nodesStateEvents.nodeDataUpdatedEvent,
        ({oldNodeData, newNodeData}) => {
            // не удалена -> удалена
            if (!oldNodeData.isExplicitlyMarkedForDelete && newNodeData.isExplicitlyMarkedForDelete) {
                // создана только локально
                if(newNodeData.sourceOrCreated === "created") {
                    const idx = createdNodesDict[newNodeData.currentData.id].idx
                    createdNodesList[idx] = undefined
                    delete createdNodesDict[newNodeData.currentData.id]
                    document.createElement('div').childNodes[2]
                }

                setMarkedForDeleteNodes([...markedForDeleteNodes, newNodeData])
            }
        })


    const [updatedNodes, setUpdatedNodes] = useState<NodeData[]>([])
    const [markedForDeleteNodes, setMarkedForDeleteNodes] = useState<NodeData[]>([])

    useEventHandling(nodeDatasStateManager.nodesStateEvents.nodeDataUpdatedEvent,
        ({oldNodeData, newNodeData}) => {
            // не удалена -> удалена
            if (!oldNodeData.isExplicitlyMarkedForDelete && newNodeData.isExplicitlyMarkedForDelete) {
                //
                if(newNodeData.sourceOrCreated === "created") {

                }

                setMarkedForDeleteNodes([...markedForDeleteNodes, newNodeData])

            }
        })

    useEventHandling(nodeDatasStateManager.nodesStateEvents.nodeAddedEvent,
        ({nodeData, nodeDataId}) => {
            if (nodeData.sourceOrCreated === "created") {
                setCreatedNodes([...createdNodes, nodeData])
            }
        })*/


    return <div style={{color: 'white'}}>
        renders count: {rendersCount.current}
        <br/>
        <Card title="Nodes">
            <Card title="Created">
                {
                    Array.from(nodeDatasStateManager.createdNodeDataIdsSet).map((nId, idx) =>
                        <div key={idx}>
                            {nId}
                        </div>)
                }
            </Card>

            <Card title="Updated">
                {
                    Array.from(nodeDatasStateManager.updatedNodeDataIdsSet).map((nId, idx) =>
                        <div key={idx}>
                            {nId}
                        </div>)
                }
            </Card>

            <Card title="Marked for delete">
                {
                    Array.from(nodeDatasStateManager.markedForDeleteNodeDataIdsSet).map((nId, idx) =>
                        <div key={idx}>
                            {nId}
                        </div>)
                }
            </Card>
        </Card>
        <br/>
        <Card title="Edges">
            <Card title="Created">
                {
                    Array.from(edgeDatasStateManager.allEdgeDatasMap.values()).filter((v) => v.sourceOrCreated === "created").map((data, idx) =>
                        <div key={idx}>
                            {data.sourceData.id}
                        </div>)
                }
            </Card>

            <Card title="Updated">
                {
                    Array.from(edgeDatasStateManager.allEdgeDatasMap.values()).filter((v) => v.sourceOrCreated !== "created" && v.updatedData).map((data, idx) =>
                        <div key={idx}>
                            {data.sourceData.id}
                        </div>)
                }
            </Card>

            <Card title="Explicitly marked for delete">
                {
                    Array.from(edgeDatasStateManager.allEdgeDatasMap.values()).filter((v) => v.isExplicitlyMarkedForDelete).map((data, idx) =>
                        <div key={idx}>
                            {data.sourceData.id}
                        </div>)
                }
            </Card>

            <Card title="Implicitly will be deleted becouse nodes">
                ну наверно ошибки при добавлении внутри edgeDatasStateManager
                {
                    Array.from(edgeDatasStateManager.allEdgeDatasMap.values()).filter((v) => v.markedForDeleteBecauseNodes.length > 0).map((data, idx) =>
                        <div key={idx}>
                            {data.sourceData.id}
                        </div>)
                }
            </Card>
        </Card>
    </div>
}