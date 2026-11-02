import type {InternalNode} from "@xyflow/react";
import {getEdgeParams} from "./utils.ts";
import {getSpecialPath} from "./GetSpecialPath.ts";
import type {XfEdge} from "./XyFlowTypeAliases.ts";

export const LABEL_CARD_WIDTH = 100;
export const LABEL_CARD_HEIGHT = 100;
export const LABEL_CARD_PADDING = 100;

export type EdgeLabelLayoutEntry = {
    pathDelta: number;
    extraOffset: number;
    deltaMultiplier: number;
};

type EdgeGeometry = {
    edgeId: string;
    labelX: number;
    labelY: number;
    nx: number;
    ny: number;
    pathDelta: number;
    deltaMultiplier: number;
};

type LabelBox = {
    left: number;
    right: number;
    top: number;
    bottom: number;
};

function getParallelEdgeGroupKey(source: string, target: string): string {
    return [source, target].sort((a, b) => a.localeCompare(b)).join("::");
}

export function computeParallelEdgeDeltas(edgeIds: readonly string[]): Map<string, number> {
    const sorted = [...edgeIds].sort((a, b) => a.localeCompare(b));
    const middleIdx = Math.floor(sorted.length / 2);
    const deltas = new Map<string, number>();

    let i1 = 0;
    for (let i = 0; i <= middleIdx; i++) {
        deltas.set(sorted[i], i1--);
    }
    let i2 = 1;
    for (let i = middleIdx + 1; i < sorted.length; i++) {
        deltas.set(sorted[i], i2++);
    }

    return deltas;
}

export function computeDeltaMultiplier(parallelEdgeCount: number): number {
    const spacing = LABEL_CARD_WIDTH + LABEL_CARD_PADDING;
    return spacing * Math.max(1, Math.ceil(parallelEdgeCount / 2));
}

function getLabelCenter(geometry: EdgeGeometry, extraOffset: number) {
    return {
        x: geometry.labelX + geometry.nx * extraOffset,
        y: geometry.labelY + geometry.ny * extraOffset,
    };
}

function getLabelBox(geometry: EdgeGeometry, extraOffset: number): LabelBox {
    const {x, y} = getLabelCenter(geometry, extraOffset);
    const halfW = LABEL_CARD_WIDTH / 2 + LABEL_CARD_PADDING;
    const halfH = LABEL_CARD_HEIGHT / 2 + LABEL_CARD_PADDING;

    return {
        left: x - halfW,
        right: x + halfW,
        top: y - halfH,
        bottom: y + halfH,
    };
}

function boxesOverlap(a: LabelBox, b: LabelBox): boolean {
    return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

function getStepSize(nx: number, ny: number): number {
    // Perpendicular direction (nx, ny) determines which axis we're separating along:
    // - |nx| > |ny| → primarily horizontal separation → use label width + padding
    // - |ny| > |nx| → primarily vertical separation → use label height + padding
    if (Math.abs(nx) > Math.abs(ny)) {
        return LABEL_CARD_WIDTH + LABEL_CARD_PADDING;
    }
    return LABEL_CARD_HEIGHT + LABEL_CARD_PADDING;
}

function resolveCollisions(geometries: readonly EdgeGeometry[]): Map<string, number> {
    const offsets = new Map(geometries.map((geometry) => [geometry.edgeId, 0]));

    for (let iteration = 0; iteration < geometries.length * 8; iteration++) {
        let moved = false;

        for (let i = 0; i < geometries.length; i++) {
            for (let j = i + 1; j < geometries.length; j++) {
                const left = geometries[i];
                const right = geometries[j];
                const leftOffset = offsets.get(left.edgeId)!;
                const rightOffset = offsets.get(right.edgeId)!;
                const leftBox = getLabelBox(left, leftOffset);
                const rightBox = getLabelBox(right, rightOffset);

                if (!boxesOverlap(leftBox, rightBox)) {
                    continue;
                }

                const leftCenter = getLabelCenter(left, leftOffset);
                const rightCenter = getLabelCenter(right, rightOffset);
                const vx = rightCenter.x - leftCenter.x;
                const vy = rightCenter.y - leftCenter.y;

                const leftSign = left.nx * vx + left.ny * vy >= 0 ? 1 : -1;
                const rightSign = right.nx * vx + right.ny * vy >= 0 ? 1 : -1;

                // Choose step size based on the edge's perpendicular direction:
                // vertical edges (horizontal perp) → width-based step
                // horizontal edges (vertical perp) → height-based step
                // this prevents label cards from overlapping when edges are vertical
                const step = getStepSize(left.nx, left.ny);

                offsets.set(left.edgeId, leftOffset - leftSign * step * 0.5);
                offsets.set(right.edgeId, rightOffset + rightSign * step * 0.5);
                moved = true;
            }
        }

        if (!moved) {
            break;
        }
    }

    return offsets;
}

export function computeEdgeLabelLayout(
    edges: readonly XfEdge[],
    nodeLookup: Map<string, InternalNode>,
): Map<string, EdgeLabelLayoutEntry> {
    const parallelGroups = new Map<string, string[]>();

    for (const edge of edges) {
        const key = getParallelEdgeGroupKey(edge.source, edge.target);
        const group = parallelGroups.get(key);
        if (group) {
            group.push(edge.id);
        } else {
            parallelGroups.set(key, [edge.id]);
        }
    }

    const geometries: EdgeGeometry[] = [];

    for (const edge of edges) {
        const sourceNode = nodeLookup.get(edge.source);
        const targetNode = nodeLookup.get(edge.target);
        if (!sourceNode?.measured || !targetNode?.measured) {
            continue;
        }

        const sortedNodes = [sourceNode, targetNode].sort((a, b) => a.id.localeCompare(b.id));
        const {sx, sy, tx, ty} = getEdgeParams(sortedNodes[0], sortedNodes[1]);

        const groupKey = getParallelEdgeGroupKey(edge.source, edge.target);
        const groupEdgeIds = parallelGroups.get(groupKey)!;
        const pathDelta = computeParallelEdgeDeltas(groupEdgeIds).get(edge.id) ?? 0;
        const deltaMultiplier = computeDeltaMultiplier(groupEdgeIds.length);
        const {labelX, labelY} = getSpecialPath(
            {sourceX: sx, sourceY: sy, targetX: tx, targetY: ty},
            pathDelta,
            deltaMultiplier,
        );

        const dx = tx - sx;
        const dy = ty - sy;
        const length = Math.sqrt(dx * dx + dy * dy) || 1;

        geometries.push({
            edgeId: edge.id,
            labelX,
            labelY,
            nx: -dy / length,
            ny: dx / length,
            pathDelta,
            deltaMultiplier,
        });
    }

    const extraOffsets = resolveCollisions(geometries);
    const layout = new Map<string, EdgeLabelLayoutEntry>();

    for (const geometry of geometries) {
        layout.set(geometry.edgeId, {
            pathDelta: geometry.pathDelta,
            extraOffset: extraOffsets.get(geometry.edgeId) ?? 0,
            deltaMultiplier: geometry.deltaMultiplier,
        });
    }

    return layout;
}
