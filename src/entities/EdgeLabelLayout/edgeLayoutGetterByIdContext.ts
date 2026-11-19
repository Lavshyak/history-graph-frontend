import {createContext, useContext} from "react";
import type {EdgeLabelLayoutEntry} from "@/entities/EdgeLabelLayout/edgeLabelLayout.ts";

export type EdgeLayoutGetterByIdContextType = {
    readonly get: (edgeId: string) => EdgeLabelLayoutEntry | undefined
}

export const EdgeLayoutGetterByIdContext = createContext<EdgeLayoutGetterByIdContextType>(
    {
        get: () => undefined
    }
)

export function useEdgeLayoutGetterByIdContext() {
    return useContext(EdgeLayoutGetterByIdContext);
}