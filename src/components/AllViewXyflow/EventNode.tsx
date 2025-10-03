import {Handle, type Node, type NodeProps, Position, useConnection} from "@xyflow/react";
import {Button, Collapse, Flex} from "antd";
import {type CSSProperties, useContext} from "react";
import {EditableContext, MarkNodeForDeleteContext} from "./Contexts.ts";

export type EventNodeData = {
    id: string,
    timeFrom: Date,
    timeTo: Date,
    title: string,
    description: string,
    label: string,
    keywords: string[],
    isMarkedForDelete: boolean,
};
export type EventNodeType = Node<EventNodeData>;

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

export function EventNode({data, id}: NodeProps<EventNodeType>) {

    const connection = useConnection();

    const isTarget = connection.inProgress && connection.fromNode.id !== id;

    const isEditable = useContext(EditableContext)
    const markNodeForDeleteContextValue = useContext(MarkNodeForDeleteContext)

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
                <div style={{
                    position: "absolute",
                    backgroundColor: data.isMarkedForDelete ? "red" : "white",
                    width: "100%",
                    height: "100%",
                    opacity: data.isMarkedForDelete ? "0.1" : "0.5",
                    zIndex: -1,
                    borderRadius: 10
                }}/>
                <div style={{padding: "10px 10px 10px 10px"}}>
                    <Flex vertical>
                        <Collapse items={[{
                            label: (
                                <Flex vertical>
                                    <div>title: {data.title}</div>
                                    <div style={{fontSize: 11}}>id: {id}</div>
                                </Flex>
                            ),
                            children: (
                                <Flex vertical>
                                    <div>description: {data.description}</div>
                                    <div>label: {data.label}</div>
                                    <div>keywords: [{data.keywords.join(', ')}]</div>
                                    <div>timeFrom: {data.timeFrom.toISOString()}</div>
                                    <div>timeTo: {data.timeTo.toISOString()}</div>
                                    <Button disabled={!isEditable} onClick={() => {
                                        if(!data.isMarkedForDelete) {
                                            markNodeForDeleteContextValue.markNodeForDelete(data.id)
                                        }
                                        else{
                                            markNodeForDeleteContextValue.undoMarkNodeForDelete(data.id)
                                        }
                                    }}>
                                        {data.isMarkedForDelete ? "undo delete" : "delete"}
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
