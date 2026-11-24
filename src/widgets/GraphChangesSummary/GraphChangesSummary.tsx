import {Card} from "antd";
import {memo, useContext, useRef} from "react";
import {NodeDatasStateManagerContext} from "@/model/graph/nodeDatasStateManagerContext.ts";
import {EdgeDatasStateManagerContext} from "@/model/graph/edgeDatasStateManagerContext.ts";
import {useEventHandling} from "@/shared/hooks/useEventHandling.ts";
import {useThrottledRerender} from "@/shared/hooks/useThrottledRerender.ts";

// Сколько id рисуем в одной карточке сводки. При тысячах изменений полный
// список превращается в тысячи DOM-узлов, которые перерисовываются на каждое
// событие; для сводки достаточно первых N и счётчика остальных.
const SUMMARY_LIST_LIMIT = 100

function IdList({ids}: {ids: readonly string[]}) {
    const visibleIds = ids.length > SUMMARY_LIST_LIMIT ? ids.slice(0, SUMMARY_LIST_LIMIT) : ids

    return <>
        {visibleIds.map((id, idx) => <div key={idx}>{id}</div>)}
        {ids.length > visibleIds.length && <div>…и ещё {ids.length - visibleIds.length}</div>}
    </>
}

// ну тут реально memo полезное
export const GraphChangesSummary = memo(GraphChangesSummary1)

export default GraphChangesSummary

export function GraphChangesSummary1() {
    const nodeDatasStateManager = useContext(NodeDatasStateManagerContext)
    const edgeDatasStateManager = useContext(EdgeDatasStateManagerContext)

    // События приходят на каждый добавленный узел/связь: при инициализации
    // графа это тысячи событий подряд. Перерисовываем сводку с троттлингом,
    // иначе на каждый элемент строился заново весь список.
    const rerenderThis = useThrottledRerender()

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


    // Один проход по карте связей вместо четырёх Array.from(...).filter(...).
    const createdEdgeIds: string[] = []
    const updatedEdgeIds: string[] = []
    const explicitlyMarkedEdgeIds: string[] = []
    const implicitlyMarkedEdgeIds: string[] = []
    for (const edgeData of edgeDatasStateManager.allEdgeDatasMap.values()) {
        const edgeId = edgeData.sourceData.id
        if (edgeData.sourceOrCreated === "created") createdEdgeIds.push(edgeId)
        else if (edgeData.updatedData) updatedEdgeIds.push(edgeId)
        if (edgeData.isExplicitlyMarkedForDelete) explicitlyMarkedEdgeIds.push(edgeId)
        if (edgeData.markedForDeleteBecauseNodes.length > 0) implicitlyMarkedEdgeIds.push(edgeId)
    }

    return <div style={{color: 'white'}}>
        <br/>
        <Card title="Nodes">
            <Card title="Created">
                <IdList ids={Array.from(nodeDatasStateManager.createdNodeDataIdsSet)}/>
            </Card>

            <Card title="Updated">
                <IdList ids={Array.from(nodeDatasStateManager.updatedNodeDataIdsSet)}/>
            </Card>

            <Card title="Marked for delete">
                <IdList ids={Array.from(nodeDatasStateManager.markedForDeleteNodeDataIdsSet)}/>
            </Card>
        </Card>
        <br/>
        <Card title="Edges">
            <Card title="Created">
                <IdList ids={createdEdgeIds}/>
            </Card>

            <Card title="Updated">
                <IdList ids={updatedEdgeIds}/>
            </Card>

            <Card title="Explicitly marked for delete">
                <IdList ids={explicitlyMarkedEdgeIds}/>
            </Card>

            <Card title="Implicitly will be deleted becouse nodes">
                ну наверно ошибки при добавлении внутри edgeDatasStateManager
                <IdList ids={implicitlyMarkedEdgeIds}/>
            </Card>
        </Card>
    </div>
}