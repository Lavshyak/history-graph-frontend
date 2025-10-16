import {type ReactNode, useRef} from "react";
import {createNodeDatasStateManager} from "../../coolerState/coolerNodesState.ts";
import {NodeDatasStateManagerContext} from "../../contexts/NodeDatasStateManagerContext.ts";

export function NodeDatasStateManagerContextWrapper({children}: { children: ReactNode }) {
    const nodeDatasStateManager = useRef(createNodeDatasStateManager()).current

    return (<NodeDatasStateManagerContext value={nodeDatasStateManager}>
        {children}
    </NodeDatasStateManagerContext>)
}