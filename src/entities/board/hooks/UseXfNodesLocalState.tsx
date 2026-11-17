import {applyNodeChanges, type NodeChange, type XYPosition} from "@xyflow/react";
import type {NodeDatasStateManager} from "../../../coolerState/coolerNodesState.ts";
import {useLocalState} from "../../../hooks/UseLocalState.ts";
import type {XfNode} from "../../types/XyFlowTypeAliases.ts";
import type {NodeDataIdType} from "../../../types/NodeData.ts";

export function useXfNodesLocalState(recommendedNodePositionsOnAdd: Map<string, XYPosition>, nodeDatasStateManager: NodeDatasStateManager) {
    return useLocalState<{
        xfNodes: readonly Readonly<XfNode>[]
        addXfNode(nodeId: NodeDataIdType): void
        removeXfNode(nodeId: NodeDataIdType): void
        applyXfNodeChanges(nodeChanges: NodeChange<XfNode>[]): void
    }>((set, get) => ({
        xfNodes: [],
        addXfNode(nodeId: NodeDataIdType) {
            let position = recommendedNodePositionsOnAdd.get(nodeId)
            if (!position) {
                console.log(98)
                const nodeData = nodeDatasStateManager.allNodeDatasMap.get(nodeId)
                console.log('nodeData ', nodeData)
                if (nodeData) {
                    if (nodeData.advisoryPosition) {
                        position = {x: 0, y: 0}
                        if (nodeData.advisoryPosition.x) {
                            position.x = nodeData.advisoryPosition.x
                        }
                        if (nodeData.advisoryPosition.y) {
                            position.y = nodeData.advisoryPosition.y
                        }
                    }
                }
            }
            if (!position) {
                console.log(114)
                position = {x: 0, y: 0}
            }

            console.log('position ', position)

            set(state => ({
                xfNodes: [
                    ...state.xfNodes,
                    {id: nodeId, data: {}, position: position, type: 'EventNode'},
                ],
            }))
        },
        removeXfNode(nodeId: NodeDataIdType) {
            set(state => ({
                xfNodes: state.xfNodes.filter(x => x.id !== nodeId),
            }))
        },
        applyXfNodeChanges(nodeChanges: NodeChange<XfNode>[]) {
            const currentNodes = get().xfNodes
            const newNodes = applyNodeChanges(nodeChanges, currentNodes as XfNode[])
            set({
                xfNodes: newNodes,
            })
        },
    }))
}