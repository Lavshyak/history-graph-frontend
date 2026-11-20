import * as React from "react";
import {useCallback} from "react";
import type {Edge, Node, ReactFlowInstance} from "@xyflow/react";
import type {ContextMenuParams} from "@/widgets/ContextMenu/ContextMenuParams.ts";

export function useOnNodeContextMenuCallback(reactFlowComponentRef: React.RefObject<HTMLDivElement | null>, reactFlowInstance: ReactFlowInstance<Node, Edge>, setMenu: React.Dispatch<React.SetStateAction<ContextMenuParams | null>>) {
    return useCallback((event: React.MouseEvent | MouseEvent) => {
            // Prevent native context menu from showing
            event.preventDefault()

            // Calculate position of the context menu. We want to make sure it
            // doesn't get positioned off-screen.
            const pane = reactFlowComponentRef.current?.getBoundingClientRect()

            const flowXY = reactFlowInstance.screenToFlowPosition({
                x: event.clientX,
                y: event.clientY,
            })
            const menu = {
                id: 'contextMenu1',
                top: event.clientY - (pane?.top ?? 0),
                left: event.clientX - (pane?.left ?? 0),
                xSpawn: flowXY.x - 100,
                ySpawn: flowXY.y - 100,
            }
            setMenu(menu)
        },
        [reactFlowComponentRef, reactFlowInstance, setMenu])
}