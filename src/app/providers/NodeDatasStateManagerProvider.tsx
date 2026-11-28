import {type ReactNode, useRef} from "react";
import {createNodeDatasStateManager} from "@/model/node/createNodeDatasStateManager.ts";
import {NodeDatasStateManagerContext} from "@/model/graph/nodeDatasStateManagerContext.ts";
import useDevRenderCountLogging from "@/shared/dev/useRenderCountLogging.ts";

export function NodeDatasStateManagerProvider({children}: { children: ReactNode }) {
    useDevRenderCountLogging("NodeDatasStateManagerProvider", true)
    const nodeDatasStateManager = useRef(createNodeDatasStateManager()).current

    return (<NodeDatasStateManagerContext value={nodeDatasStateManager}>
        {children}
    </NodeDatasStateManagerContext>)
}