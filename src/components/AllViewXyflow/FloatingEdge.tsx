import {
    BaseEdge, type Edge,
    EdgeLabelRenderer,
    type EdgeProps,
    getBezierPath,
    getStraightPath,
    useInternalNode
} from '@xyflow/react';

import {getEdgeParams} from './utils.js';
import {Button, Collapse, Flex} from 'antd';

type FloatingEdgeProps = Edge<{id:string, label:string}>

function FloatingEdge({
                          id,
                          source,
                          target,
                          markerEnd,
                          style,
                          data
                      }: EdgeProps<FloatingEdgeProps>) {
    const sourceNode = useInternalNode(source);
    const targetNode = useInternalNode(target);

    if (!sourceNode || !targetNode) {
        return null;
    }

    const {sx, sy, tx, ty} = getEdgeParams(sourceNode, targetNode);

    const [path, labelX, labelY] = getStraightPath({
        sourceX: sx,
        sourceY: sy,
        targetX: tx,
        targetY: ty,
    });

    return (
        <>
            <BaseEdge
                id={id}
                className="react-flow__edge-path"
                path={path}
                markerEnd={markerEnd}
                style={style}
            />
            <EdgeLabelRenderer>
                <div
                    className="nodrag nopan"
                    style={{
                        transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
                        position: "absolute",
                        pointerEvents: "all",
                        transformOrigin: "center",
                    }}
                >
                    <div style={{
                        backgroundColor: "white",
                        background: "transparent",
                        borderColor: "gray",
                        borderWidth: "1px",
                        borderStyle: "dotted",
                        minWidth: "50px",
                        borderRadius: "5px",
                    }}>
                        <Collapse
                            style={{
                                background: "transparent"
                            }}
                            items={[{
                            label: (
                                <Flex vertical>
                                    <div>{data?.label}</div>
                                    <div>{data?.id}</div>
                                </Flex>
                            ),
                            children: (
                                <Flex vertical style={{
                                    background: "transparent"
                                }}>
                                    <Button>delete</Button>
                                </Flex>
                            )
                        }]}/>

                    </div>
                </div>
            </EdgeLabelRenderer>
        </>

    );
}

export default FloatingEdge;
