import { useMemo } from 'react';
import {
    getBezierPath,
    useNodesStore,
    ViewportPortal,
    Position,
    type Edge,
    type InternalNode,
} from '@xyflow/react';

/**
 * Draws every edge of the flow as a single SVG <path> element.
 *
 * Why: React Flow renders one <g> + one or two <path> per edge. With hundreds of
 * edges that is hundreds of SVG elements, and Firefox is noticeably slower than
 * Chromium at hit-testing and re-rasterizing that many SVG nodes during pan/zoom.
 * Collapsing all edges into one element removes ~N * 2 DOM nodes and makes the
 * whole edge layer a single paint/hit-test target.
 *
 * The path only depends on node geometry, not on the viewport, so it is *not*
 * recomputed while panning/zooming — the surrounding `.react-flow__viewport`
 * transform already moves it. It is rendered through <ViewportPortal /> so it
 * lives in the same coordinate system as the nodes.
 */

// Node-relative handle geometry, as produced by React Flow's measurement.
type MeasuredHandle = {
    id?: string | null;
    x: number;
    y: number;
    width: number;
    height: number;
    position: Position;
};

// Mirrors React Flow's own `getHandle` lookup: an explicit handle id wins,
// otherwise the first declared handle of that type is used.
function pickHandle(
    handles: MeasuredHandle[] | null | undefined,
    handleId: string | null | undefined,
): MeasuredHandle | null {
    if (!handles || handles.length === 0) return null;
    if (!handleId) return handles[0] ?? null;
    return handles.find((handle) => handle.id === handleId) ?? null;
}

// Mirrors React Flow's `getHandlePosition`: the point is on the *edge* of the
// handle (not its center), so the combined path lands exactly where the built-in
// edges would.
function getHandlePosition(node: InternalNode, handle: MeasuredHandle) {
    const x = handle.x + node.internals.positionAbsolute.x;
    const y = handle.y + node.internals.positionAbsolute.y;
    const { width, height } = handle;

    switch (handle.position) {
        case Position.Top:
            return { x: x + width / 2, y };
        case Position.Right:
            return { x: x + width, y: y + height / 2 };
        case Position.Left:
            return { x, y: y + height / 2 };
        case Position.Bottom:
        default:
            return { x: x + width / 2, y: y + height };
    }
}

type CombinedEdgesProps = {
    edges: Edge[];
};

export function CombinedEdges({ edges }: CombinedEdgesProps) {
    // `nodes` changes reference whenever a node moves or is (re)measured, which is
    // what drives recomputation. `nodeLookup` is a stable, mutated-in-place Map that
    // holds the measured node internals (absolute position + handle bounds).
    const nodes = useNodesStore((state) => state.nodes);
    const nodeLookup = useNodesStore((state) => state.nodeLookup);
    const nodesInitialized = useNodesStore((state) => state.nodesInitialized);

    const path = useMemo(() => {
        if (!nodesInitialized || nodes.length === 0) return '';

        let d = '';
        for (const edge of edges) {
            const sourceNode = nodeLookup.get(edge.source);
            const targetNode = nodeLookup.get(edge.target);
            if (!sourceNode || !targetNode) continue;

            const sourceHandle = pickHandle(
                sourceNode.internals.handleBounds?.source,
                edge.sourceHandle,
            );
            const targetHandle = pickHandle(
                targetNode.internals.handleBounds?.target,
                edge.targetHandle,
            );
            if (!sourceHandle || !targetHandle) continue;

            const source = getHandlePosition(sourceNode, sourceHandle);
            const target = getHandlePosition(targetNode, targetHandle);

            const [segment] = getBezierPath({
                sourceX: source.x,
                sourceY: source.y,
                sourcePosition: sourceHandle.position,
                targetX: target.x,
                targetY: target.y,
                targetPosition: targetHandle.position,
            });
            d += segment;
        }
        return d;
    }, [edges, nodeLookup, nodes, nodesInitialized]);

    return (
        <ViewportPortal>
            <svg className="react-flow__edges-combined" aria-hidden="true">
                <path className="react-flow__edge-path-combined" d={path} fill="none" />
            </svg>
        </ViewportPortal>
    );
}

