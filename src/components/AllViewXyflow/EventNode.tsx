import {Handle, type NodeProps, Position, useConnection} from "@xyflow/react";
import {Button, Collapse, Flex} from "antd";
import {type CSSProperties, useContext, useMemo, useRef, useState} from "react";
import {EditableContext} from "./Contexts.ts";
import {NodeDatasStateManagerContext} from "./AllViewXyflow.tsx";
import {useKeyedEventHandling} from "../../lib/event/useKeyedEventHandling.ts";
import type {XfNode} from "./XyFlowTypeAliases.ts";

const sourceHandleStyle: CSSProperties = {
    width: "100%",
    height: "50px",       // задаём конкретную высоту
    background: "blue",
    opacity: "0.1",
    left: "50%",
    top: "50%",
    position: "absolute", // обязательно absolute
    borderRadius: 0,
    margin: 0,
    padding: 0,
}

const targetHandleStyle: CSSProperties = {
    width: "100%",
    height: "100%",
    backgroundColor: "white",
    borderRadius: "15px",
    border: "solid 1px",
    opacity: "0.1",
    left: "50%",
    top: "50%",
    position: "fixed",
    zIndex: "100"
}

/*export const EventNode = memo(EventNode1, (prevProps, nextProps)=> {
    return prevProps.id != nextProps.id
})*/

export function EventNode({id: thisNodeId}: NodeProps<XfNode>) {
    const nodeDatasStateContext = useContext(NodeDatasStateManagerContext)
    const initialData = useMemo(() =>
        nodeDatasStateContext.allNodeDatasMap.get(thisNodeId), [nodeDatasStateContext, thisNodeId]
    )

    const [data, setData] = useState(initialData)

    useKeyedEventHandling(nodeDatasStateContext.nodesStateEvents.nodeDataUpdatedEvent, thisNodeId, ({newNodeData})=> {
        setData(newNodeData)
    })

    const connection = useConnection();

    const isTarget = connection.inProgress && connection.fromNode.id !== thisNodeId;

    const isEditable = useContext(EditableContext)

    const renderCount = useRef(0);
    renderCount.current++;

    if(!data)
    {
        return <>no data for node id {thisNodeId}</>
    }

    return (
        <div>
            {/* We want to disable the target handle, if the connection was started from this node */}
            {(!connection.inProgress || isTarget) && (
                <Handle style={targetHandleStyle} position={Position.Left} type="target" isConnectableStart={false}/>
            )}
            <div style={{
                color: "black",
                minWidth: "15vh",
                alignSelf: "center",
                alignItems: "center",
                justifyContent: "center"
            }}>
                {renderCount.current}
                <div style={{
                    position: "absolute",
                    backgroundColor: data.isExplicitlyMarkedForDelete ? "red" : "white",
                    width: "100%",
                    height: "100%",
                    opacity: data.isExplicitlyMarkedForDelete ? "0.1" : "0.5",
                    zIndex: -1,
                    borderRadius: 10
                }}/>
                <div style={{padding: "10px 10px 10px 10px"}}>
                    <Flex vertical>
                        <Collapse items={[{
                            label: (
                                <Flex vertical>
                                    <div>title: {data.currentData.title}</div>
                                    <div style={{fontSize: 11}}>id: {thisNodeId}</div>
                                </Flex>
                            ),
                            children: (
                                <Flex vertical>
                                    <div>description: {data.currentData.description}</div>
                                    <div>label: {data.currentData.label}</div>
                                    <div>keywords: [{data.currentData.keywords.join(', ')}]</div>
                                    <div>timeFrom: {data.currentData.timeFrom.toISOString()}</div>
                                    <div>timeTo: {data.currentData.timeTo.toISOString()}</div>
                                    <Button disabled={!isEditable} onClick={() => {
                                        nodeDatasStateContext.markNodeForDelete(thisNodeId, !data.isExplicitlyMarkedForDelete)
                                    }}>
                                        {data.isExplicitlyMarkedForDelete ? "undo delete" : "delete"}
                                    </Button>
                                </Flex>
                            )
                        }]}/>
                        <div
                            style={{
                                position: "relative",
                                width: "100%",
                                height: "50px",
                            }}
                        >
                            {/* If handles are conditionally rendered and not present initially, you need to update the node internals https://reactflow.dev/docs/api/hooks/use-update-node-internals/ */}
                            {/* In this case we don't need to use useUpdateNodeInternals, since !isConnecting is true at the beginning and all handles are rendered initially. */}
                            {!connection.inProgress && (
                                <Handle
                                    style={sourceHandleStyle}
                                    position={Position.Top}
                                    type="source"
                                />
                            )}
                        </div>

                    </Flex>


                </div>


            </div>
        </div>

    );
}
