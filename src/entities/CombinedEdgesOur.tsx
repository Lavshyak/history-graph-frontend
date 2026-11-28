import {createContext, useContext, useMemo, useRef, useState} from "react";
import {emptyNormalListenableEvent, type NormalListenableEvent} from "@/shared/lib/events.ts";
import type {EdgePathChanging} from "@/entities/FloatingEdge/FloatingEdge.tsx";
import {useEventHandling} from "@/shared/hooks/useEventHandling.ts";

export const EdgePathChangedEventContext = createContext<NormalListenableEvent<EdgePathChanging>>(emptyNormalListenableEvent())

export function CombinedEdgesOur() {

    const edgeIdToPathMap = useRef<Map<string, {path: string, markerEnd: string}>>(new Map()).current
    const [combinedPath, setCombinedPath] = useState("")

    const edgePathChangedEvent = useContext(EdgePathChangedEventContext)
    useEventHandling(edgePathChangedEvent, edgePathChanging => {
        if(edgePathChanging.deleted){
            edgeIdToPathMap.delete(edgePathChanging.edgeId)
        }else{
            edgeIdToPathMap.set(edgePathChanging.edgeId, {path: edgePathChanging.path!, markerEnd: edgePathChanging.markerEnd!})
        }

        let d = '';
        for (const entry of edgeIdToPathMap){
            d += entry[1].path
            //d += entry[1].markerEnd
        }
        setCombinedPath(d)
    })

    return (
            <svg className="react-flow__edges-combined" aria-hidden="true">
                <path className="react-flow__edge-path-combined" d={combinedPath} fill="none" />
            </svg>
    );
}