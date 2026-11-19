import * as React from "react";
import {useCallback} from "react";
import type {Edge, Node, ReactFlowInstance, Viewport} from "@xyflow/react";
import type {ContextMenuParams} from "@/widgets/ContextMenu/ContextMenuParams.ts";

export function useOnNodeContextMenuCallback(reactFlowComponentRef: React.RefObject<HTMLDivElement | null>, reactFlowInstance: ReactFlowInstance<Node, Edge>, viewport: Viewport, setMenu: React.Dispatch<React.SetStateAction<ContextMenuParams | null>>) {
    return useCallback((event: React.MouseEvent | MouseEvent) => {
            // Prevent native context menu from showing
            event.preventDefault()
            console.log('onNodeContextMenu event ', event)

            // Calculate position of the context menu. We want to make sure it
            // doesn't get positioned off-screen.
            const pane = reactFlowComponentRef.current?.getBoundingClientRect()
            console.log(
                'onNodeContextMenu ref.current.getBoundingClientRect() ',
                reactFlowComponentRef.current?.getBoundingClientRect(),
            )
            console.log('onNodeContextMenu viewport ', viewport)

            const flowXY = reactFlowInstance.screenToFlowPosition({
                x: event.pageX,
                y: event.pageY,
            })
            const menu = {
                id: 'contextMenu1',
                top: event.pageY - (pane?.top ?? 0),
                left: event.pageX - (pane?.left ?? 0),
                xSpawn: flowXY.x - 100,
                ySpawn: flowXY.y - 100,
            }
            setMenu(menu)
        },
        [reactFlowComponentRef, reactFlowInstance, setMenu, viewport])
}