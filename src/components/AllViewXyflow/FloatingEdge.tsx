import {
    BaseEdge,
    EdgeLabelRenderer,
    type EdgeProps,
    useInternalNode,
} from '@xyflow/react';
import {getEdgeParams} from './utils.ts';
import {Button, Collapse, Flex} from 'antd';
import {getSpecialPath} from "./GetSpecialPath.ts";
import {useContext, useState} from "react";
import type {XfEdge} from "./XyFlowTypeAliases.ts";
import {EditableContext, EdgeLabelLayoutContext} from "./Contexts.ts";
import {useKeyedEventHandling} from "../../hooks/useKeyedEventHandling.ts";
import {EdgeDatasStateManagerContext} from "../../contexts/EdgeDatasStateManagerContext.ts";

function FloatingEdge({
                          id: thisEdgeId,
                          source,
                          target,
                          markerEnd,
                          style
                      }: EdgeProps<XfEdge>) {
    console.log(`edgeRendering ${thisEdgeId}`)
    const edgeDatasStateManagerContext = useContext(EdgeDatasStateManagerContext)

    const [data, setData] = useState(edgeDatasStateManagerContext.allEdgeDatasMap.get(thisEdgeId)/* ?? {
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
    }*/)

    useKeyedEventHandling(edgeDatasStateManagerContext.edgesStateEvents.edgeDataUpdatedEvent, thisEdgeId,
        ({newEdgeData}) => {
            setData(newEdgeData)
        })

    if(!data)
    {
        throw new Error("no data")
    }

    const isGenerallyMarkedForDelete = data.isExplicitlyMarkedForDelete || data.markedForDeleteBecauseNodes.length > 0

    const currentData = data.currentData;

    const sourceNode = useInternalNode(source);
    const targetNode = useInternalNode(target);
    const isEditable = useContext(EditableContext)
    const edgeLabelLayout = useContext(EdgeLabelLayoutContext)

    const layoutEntry = edgeLabelLayout.get(thisEdgeId)
    const pathDelta = layoutEntry?.pathDelta ?? 0
    const extraOffset = layoutEntry?.extraOffset ?? 0
    const deltaMultiplier = layoutEntry?.deltaMultiplier ?? 300

    const {sx, sy, tx, ty} = (()=>{
        // без сортировки связи например с currentDelta 1 и -1 могли накладываться друг на друга, если ведут в разные стороны
        // наверно какие-то математические приколы
        const sorted = [sourceNode,targetNode].sort((a,b)=>a?.id.localeCompare(b?.id))
        return getEdgeParams(sorted[0], sorted[1]);
    })()
    const {path, labelX, labelY} = getSpecialPath({
        sourceX: sx,
        sourceY: sy,
        targetX: tx,
        targetY: ty
    }, pathDelta, deltaMultiplier, extraOffset);

    const strokeColor = (()=>{
        if(isGenerallyMarkedForDelete) return "#ff000044";
        if(data.sourceOrCreated == "created") return  "#328f4b";
        return "#b1b1b7";
    })();

    return (
        <>
            <BaseEdge
                id={thisEdgeId}
                className="react-flow__edge-path"
                path={path}
                markerEnd={markerEnd}
                style={{...style, stroke: strokeColor}}
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
                            backgroundColor: data.isExplicitlyMarkedForDelete ? "red" : data.sourceOrCreated == "created" ? "green" : "white",
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
                                        <div>{pathDelta}</div>
                                        <div>{extraOffset}</div>
                                        <div>{path}</div>
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
