import {Handle, type Node, type NodeProps, Position} from "@xyflow/react";
import {Collapse, Flex} from "antd";

export type EventNodeData = Node<{ title: string, description: string }>;

export function EventNode({data, id}: NodeProps<EventNodeData>) {
    return (
        <div style={{color: "black", backgroundColor: "white"}}>
            <Handle
                type="target"
                position={Position.Left}
                onConnect={(params) => console.log('handle onConnect', params)}
                isConnectable={true}
            />
            <Collapse items={[{
                label: (
                    <Flex vertical>
                        <div>{data.title}</div>
                        <div style={{fontSize: 11}}>{id}</div>
                    </Flex>
                ),
                children: (
                    <Flex vertical>
                        <div>{data.description}</div>
                    </Flex>
                )
            }]}/>
            <Handle
                type="source"
                position={Position.Right}
                isConnectable={true}
            />
        </div>
    );
}