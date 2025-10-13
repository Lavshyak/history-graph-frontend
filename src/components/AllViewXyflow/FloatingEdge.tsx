import {
    BaseEdge,
    EdgeLabelRenderer,
    type EdgeProps,
    useInternalNode, useReactFlow,
} from '@xyflow/react';
import {getEdgeParams} from './utils.js';
import {Button, Collapse, Flex} from 'antd';
import {getSpecialPath} from "./GetSpecialPath.ts";
import {useContext, useMemo, useState} from "react";
import type {XfEdge, XfNode} from "./XyFlowTypeAliases.ts";
import {EditableContext} from "./Contexts.ts";
import {EdgeDatasStateManagerContext} from "./AllViewXyflow.tsx";
import {useKeyedEventHandling} from "../../lib/event/useKeyedEventHandling.ts";

function FloatingEdge({
                          id: thisEdgeId,
                          source,
                          target,
                          markerEnd,
                          style
                      }: EdgeProps<XfEdge>) {
    console.log(`edgeRendering ${thisEdgeId}`)
    const edgeDatasStateManagerContext = useContext(EdgeDatasStateManagerContext)

    const [data, setData] = useState(edgeDatasStateManagerContext.allEdgeDatasMap.get(thisEdgeId) ?? {
        isExplicitlyMarkedForDelete: false,
        markedForDeleteBecauseNodes: [],
        sourceData: {
            id: thisEdgeId,
            label: 'not initialized',
            toId: 'notInitialized',
            fromId: 'notInitialized',
        },
        updatedData: undefined,
        currentData: {
            id: thisEdgeId,
            label: 'not initialized',
            toId: 'notInitialized',
            fromId: 'notInitialized',
        },
        sourceOrCreated: "source"
    })

    useKeyedEventHandling(edgeDatasStateManagerContext.edgesStateEvents.edgeDataUpdatedEvent, thisEdgeId,
        ({newEdgeData}) => {
            setData(newEdgeData)
        })

    const isGenerallyMarkedForDelete = data.isExplicitlyMarkedForDelete || data.markedForDeleteBecauseNodes.length > 0

    const currentData = data.currentData;

    const sourceNode = useInternalNode(source);
    const targetNode = useInternalNode(target);
    const isEditable = useContext(EditableContext)

    const {sx, sy, tx, ty} = getEdgeParams(sourceNode, targetNode);

    const {getEdges, updateEdge} = useReactFlow<XfNode, XfEdge>()

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
                id={thisEdgeId}
                className="react-flow__edge-path"
                path={path}
                markerEnd={markerEnd}
                style={{...style, stroke: isGenerallyMarkedForDelete ? "#ff000044" : "#b1b1b7"}}
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
                            backgroundColor: isGenerallyMarkedForDelete ? "red" : "white",
                            width: "100%",
                            height: "100%",
                            opacity: isGenerallyMarkedForDelete ? "0.1" : "0.5",
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
                                            edgeDatasStateManagerContext.markEdgeForDelete(thisEdgeId, !data.isExplicitlyMarkedForDelete)
                                        }}>
                                            {data.isExplicitlyMarkedForDelete ? "undo delete" : "delete"}
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
