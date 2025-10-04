import {
    BaseEdge,
    type Edge,
    EdgeLabelRenderer,
    type EdgeProps,
    useInternalNode, useReactFlow,
} from '@xyflow/react';
import {getEdgeParams} from './utils.js';
import {Button, Collapse, Flex} from 'antd';
import {getSpecialPath} from "./GetSpecialPath.ts";
import {useContext, useMemo} from "react";
import type {XfNode} from "./XyFlowTypeAliases.ts";
import {EditableContext, MarkEdgeForDeleteContext} from "./Contexts.ts";
import {type EdgeData} from "../../types/EdgeData.ts";


export type FloatingEdgeDataType = {} & Record<string, unknown> & EdgeData

export type FloatingEdgeType = Edge<EdgeData>

function FloatingEdge({
                          id,
                          source,
                          target,
                          markerEnd,
                          style,
                          data
                      }: EdgeProps<FloatingEdgeType>) {
    if (data == null) {
        throw new Error(`data is null in edge id ${id}`);
    }

    const currentData = data.currentData;

    const sourceNode = useInternalNode(source);
    const targetNode = useInternalNode(target);
    const isEditable = useContext(EditableContext)
    const markEdgeForDeleteContextValue = useContext(MarkEdgeForDeleteContext)

    const {sx, sy, tx, ty} = getEdgeParams(sourceNode, targetNode);

    const {getEdges, updateEdge} = useReactFlow<XfNode, FloatingEdgeType>()

    const {currentDelta} = useMemo(() => {
        const multipleEdges = getEdges().filter(e =>
            (e.source === source && e.target === target)
            || (e.source === target && e.target === source)
        ).map(e => e.data!.currentData.id)
            .sort((a, b) => a.localeCompare(b))
            .map((id) => ({edgeId: id, delta: 0}));

        const middleIdx = Math.floor(multipleEdges.length / 2)
        for (let i = 0; i < middleIdx; i++) {
            multipleEdges[i].delta = i - middleIdx;
        }
        for (let i = middleIdx + 1; i < multipleEdges.length; i++) {
            multipleEdges[i].delta = i - middleIdx;
        }

        const currentDelta = multipleEdges.find(e => e.edgeId === currentData.id)!.delta

        return {multipleEdges, currentDelta};
    }, [currentData.id, getEdges, source, target]);

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
                style={{...style, stroke: data.tech.isGenerallyMarkedForDelete ? "#ff000044" : "#b1b1b7"}}
            />
            <EdgeLabelRenderer>
                <div
                    className="nodrag nopan"
                    style={{
                        position: "absolute",
                        pointerEvents: "all",
                        transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
                        overflow: "hidden"
                    }}
                >
                    <div style={{
                        position: "relative",
                        minWidth: "50px",
                    }}>
                        <div style={{
                            position: "absolute",
                            backgroundColor: data.tech.isGenerallyMarkedForDelete ? "red" : "white",
                            width: "100%",
                            height: "100%",
                            opacity: data.tech.isGenerallyMarkedForDelete ? "0.1" : "0.5",
                            zIndex: -1,
                            borderRadius: 10
                        }}/>
                        <Collapse
                            items={[{
                                label: (
                                    <Flex vertical>
                                        <div>{currentData.label}</div>
                                        <div>{currentData.id}</div>
                                    </Flex>
                                ),
                                children: (
                                    <Flex vertical style={{
                                        background: "transparent"
                                    }}>
                                        <Button disabled={!isEditable} onClick={() => {
                                            if (!data.tech.isExplicitlyMarkedForDelete) {
                                                markEdgeForDeleteContextValue.markEdgeForDelete(currentData.id)
                                            } else {
                                                markEdgeForDeleteContextValue.undoMarkEdgeForDelete(currentData.id)
                                            }
                                        }}>
                                            {data.tech.isExplicitlyMarkedForDelete ? "undo delete" : "delete"}
                                        </Button>
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
