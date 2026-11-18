import {type ReactNode, useRef} from "react";
import {createNodeDatasStateManager} from "../../coolerState/coolerNodesState.ts";
import {NodeDatasStateManagerContext} from "../../contexts/NodeDatasStateManagerContext.ts";
import useDevRenderCountLogging from "../../devOnly/useRenderCountLogging.tsx";

export function NodeDatasStateManagerContextWrapper({children}: { children: ReactNode }) {
    useDevRenderCountLogging("NodeDatasStateManagerContextWrapper")
    const nodeDatasStateManager = useRef(createNodeDatasStateManager()).current

    return (<NodeDatasStateManagerContext value={nodeDatasStateManager}>
        {children}
    </NodeDatasStateManagerContext>)
}