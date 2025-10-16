import {type ConnectionLineComponentProps, getStraightPath} from '@xyflow/react';
import type {XfNode} from "./XyFlowTypeAliases.ts";

function CustomConnectionLine({
                                  fromX,
                                  fromY,
                                  toX,
                                  toY,
                                  connectionLineStyle
                              }: ConnectionLineComponentProps<XfNode>) {
    console.log("CustomConnectionLine rendering")

    const [edgePath] = getStraightPath({
        sourceX: fromX,
        sourceY: fromY,
        targetX: toX,
        targetY: toY,
    });

    return (
        <>
            <g>
                <path style={connectionLineStyle} fill="none" d={edgePath}/>
            </g>
        </>

    );
}

export default CustomConnectionLine;
