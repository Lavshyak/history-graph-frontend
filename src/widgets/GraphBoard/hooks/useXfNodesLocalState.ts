import {type NodeChange, type NodeChangeset, type XYPosition} from "@xyflow/react";
import type {NodeDatasStateManager} from "@/model/node/createNodeDatasStateManager.ts";
import {useLocalState} from "@/shared/hooks/useLocalState.ts";
import type {XfNode} from "@/shared/types/xyflow.ts";
import type {NodeDataIdType} from "@/model/node/nodeData.ts";

type XfNodesLocalState = {
    xfNodes: readonly Readonly<XfNode>[]
    addXfNode(nodeId: NodeDataIdType): void
    removeXfNode(nodeId: NodeDataIdType): void
    applyXfNodeChanges(nodeChanges: NodeChangeset<XfNode>): void
    setXfNodePositions(positions: ReadonlyMap<string, XYPosition>): void
}

export function useXfNodesLocalState(recommendedNodePositionsOnAdd: Map<string, XYPosition>, nodeDatasStateManager: NodeDatasStateManager) {
    return useLocalState<XfNodesLocalState>((set, get) => {
        function resolveNodePosition(nodeId: NodeDataIdType): XYPosition {
            const recommendedPosition = recommendedNodePositionsOnAdd.get(nodeId)
            if (recommendedPosition) return recommendedPosition

            const advisoryPosition = nodeDatasStateManager.allNodeDatasMap.get(nodeId)?.advisoryPosition
            if (!advisoryPosition) return {x: 0, y: 0}

            return {
                x: advisoryPosition.x ?? 0,
                y: advisoryPosition.y ?? 0,
            }
        }

        function createXfNode(nodeId: NodeDataIdType): XfNode {
            return {
                id: nodeId,
                data: {},
                position: resolveNodePosition(nodeId),
                type: 'EventNode',
            }
        }

        // Ноды обычно приходят пачкой (инициализация графа, dev-генератор).
        // Копим id и применяем всё одним set в микротаске, иначе каждая нода
        // даёт отдельный ре-рендер доски и O(N) копию массива — суммарно O(N²)
        // и несколько замороженных секунд на большом графе.
        let pendingNodeIds: NodeDataIdType[] = []
        let flushScheduled = false

        function flushPendingNodes() {
            flushScheduled = false
            if (pendingNodeIds.length === 0) return

            const nodeIds = pendingNodeIds
            pendingNodeIds = []

            set(state => ({
                xfNodes: [
                    ...state.xfNodes,
                    ...nodeIds.map(createXfNode),
                ],
            }))
        }

        function scheduleFlush() {
            if (flushScheduled) return
            flushScheduled = true
            queueMicrotask(flushPendingNodes)
        }

        return {
            xfNodes: [],
            addXfNode(nodeId: NodeDataIdType) {
                pendingNodeIds.push(nodeId)
                scheduleFlush()
            },
            removeXfNode(nodeId: NodeDataIdType) {
                pendingNodeIds = pendingNodeIds.filter(pendingNodeId => pendingNodeId !== nodeId)
                set(state => ({
                    xfNodes: state.xfNodes.filter(x => x.id !== nodeId),
                }))
            },
            applyXfNodeChanges(nodeChanges: NodeChangeset<XfNode>) {
                const currentNodes = get().xfNodes
                const newNodes = nodeChanges.applyTo(currentNodes as XfNode[])
                set({
                    xfNodes: newNodes,
                })
            },
            setXfNodePositions(positions: ReadonlyMap<string, XYPosition>) {
                set(state => ({
                    xfNodes: state.xfNodes.map(node => {
                        const position = positions.get(node.id)
                        return position ? { ...node, position } : node
                    }),
                }))
            },
        }
    })
}