import {
    BaseEdge, type Edge,
    EdgeLabelRenderer,
    type EdgeProps,
    getBezierPath,
    getStraightPath, type ReactFlowState,
    useInternalNode, useStore
} from '@xyflow/react';

import {getEdgeParams} from './utils.js';
import {Button, Collapse, Flex} from 'antd';

export type GetSpecialPathParams = {
    sourceX: number;
    sourceY: number;
    targetX: number;
    targetY: number;
};

/**
 *
 * @param sourceX
 * @param sourceY
 * @param targetX
 * @param targetY
 * @param delta - position when multiple edges
 * @param deltaMultiplier - offset multiplier
 */
export const getSpecialPath = (
    {sourceX, sourceY, targetX, targetY}: GetSpecialPathParams,
    delta: number,
    deltaMultiplier: number,
) => {
    /*
    * delta:
    * если нодов 3, то их delta: [-1,0,1]
    * т.е. если это нод под индексом 0, то его delta == -1.
    * это нужно для отклонения.
    *
    * deltaMultiplier: это множитель отклонения
    */
    const dx = targetX - sourceX;
    const dy = targetY - sourceY;

    // середина
    const rawCenterX = (sourceX + targetX) / 2;
    const rawCenterY = (sourceY + targetY) / 2;

    // длина вектора
    const length = Math.sqrt(dx * dx + dy * dy);

    // нормализованный перпендикуляр
    const nx = -dy / length;
    const ny = dx / length;

    // смещаем контрольную точку
    const centerX = rawCenterX + nx * delta * deltaMultiplier;
    const centerY = rawCenterY + ny * delta * deltaMultiplier;

    // чето кароче чтоб направляющую какой-то там кривой привести к реальной вершине этой кривой, куда потом лейбл втыкать
    const t = 0.5;
    const labelX =
        (1 - t) * (1 - t) * sourceX +
        2 * (1 - t) * t * centerX +
        t * t * targetX;
    const labelY =
        (1 - t) * (1 - t) * sourceY +
        2 * (1 - t) * t * centerY +
        t * t * targetY;

    return {
        path: `M ${sourceX} ${sourceY} Q ${centerX} ${centerY} ${targetX} ${targetY}`,
        rawCenterX,
        rawCenterY,
        labelX,
        labelY,
    };
};

type FloatingEdgeData = Edge<{ id: string, label: string, onDeleteClicked: (edgeId:string)=>void }>

function FloatingEdge({
                          id,
                          source,
                          target,
                          markerEnd,
                          style,
                          data
                      }: EdgeProps<FloatingEdgeData>) {
    const sourceNode = useInternalNode(source);
    const targetNode = useInternalNode(target);

    const {sx, sy, tx, ty} = getEdgeParams(sourceNode, targetNode);

    const multipleEdges = useStore((s: ReactFlowState) => {
        const multipleEdges = s.edges.filter(e =>
            (e.source === source && e.target === target)
            || (e.source === target && e.target === source)
        ).map(e => e.data.id as string)
            .sort((a, b) => a.localeCompare(b))
            .map((id, idx) => ({edgeId: id, delta: 0}));

        // 0 1 2 : 3 -> 1.5 -> 1
        // 0 1 2 3 4 : 5 -> 2.5 -> 2
        // 0 : 1 -> 0.5 -> 0
        const middleIdx = Math.floor(multipleEdges.length / 2)

        for (let i = 0; i < middleIdx; i++) {
            multipleEdges[i].delta = i - middleIdx;
        }

        for (let i = middleIdx + 1; i < multipleEdges.length; i++) {
            multipleEdges[i].delta = i - middleIdx;
        }
        return multipleEdges;
    });

    const currentDelta = multipleEdges.find(e => e.edgeId === data?.id)?.delta

    const {path, labelX, labelY} = getSpecialPath({
        sourceX: sx,
        sourceY: sy,
        targetX: tx,
        targetY: ty
    }, currentDelta, 300);


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
                        position: "absolute",
                        pointerEvents: "all",
                        transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`
                    }}
                >
                    <div style={{
                        position: "relative",
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
