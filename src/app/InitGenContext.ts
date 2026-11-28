import {createContext} from "react";

export type InitGenContextNotUndefinedValueType = {
    sort: 'prettify' | 'desc',
    createdNodesCount: number,
    createdEdgesCount: number,
    sourceNodesCount: number,
    sourceEdgesCount: number,
}

export const InitGenContext = createContext<undefined | InitGenContextNotUndefinedValueType>(undefined)