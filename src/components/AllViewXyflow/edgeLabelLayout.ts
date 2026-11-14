// import type {InternalNode} from "@xyflow/react";
// import {getEdgeParams} from "./utils.ts";
// import {getSpecialPath} from "./GetSpecialPath.ts";
// import type {XfEdge} from "./XyFlowTypeAliases.ts";

// // Fallback card size, used only until the real card has been measured for the
// // first time. The real size is adaptive and measured from the rendered card
// // (see EdgeLabelLayoutProvider / FloatingEdge).
// export const DEFAULT_LABEL_CARD_WIDTH = 200;
// export const DEFAULT_LABEL_CARD_HEIGHT = 120;
// // Extra margin added around a card when testing overlaps. Kept at 0 so a card is
// // only displaced when it *actually* collides — otherwise even a small margin
// // makes a card that almost fits between two nodes flee far away ("scattered").
// export const LABEL_CARD_PADDING = 0;
// // Extra margin added around a node card when testing overlaps (0 for the same
// // reason as above).
// export const NODE_BOX_MARGIN = 0;
// // Fine sliding granularity for collision resolution. Small steps make the greedy
// // search return the *nearest* free position, keeping cards close to their edges.
// const COLLISION_STEP = 16;

// export type LabelSize = {
//     width: number;
//     height: number;
// };

// const DEFAULT_LABEL_SIZE: LabelSize = {
//     width: DEFAULT_LABEL_CARD_WIDTH,
//     height: DEFAULT_LABEL_CARD_HEIGHT,
// };

// export type EdgeLabelLayoutEntry = {
//     pathDelta: number;
//     extraOffset: number;
//     deltaMultiplier: number;
// };

// type EdgeGeometry = {
//     edgeId: string;
//     labelX: number;
//     labelY: number;
//     nx: number;
//     ny: number;
//     pathDelta: number;
//     deltaMultiplier: number;
//     size: LabelSize;
// };

// type LabelBox = {
//     left: number;
//     right: number;
//     top: number;
//     bottom: number;
// };

// function getParallelEdgeGroupKey(source: string, target: string): string {
//     return [source, target].sort((a, b) => a.localeCompare(b)).join("::");
// }

// export function computeParallelEdgeDeltas(edgeIds: readonly string[]): Map<string, number> {
//     const sorted = [...edgeIds].sort((a, b) => a.localeCompare(b));
//     const middleIdx = Math.floor(sorted.length / 2);
//     const deltas = new Map<string, number>();

//     let i1 = 0;
//     for (let i = 0; i <= middleIdx; i++) {
//         deltas.set(sorted[i], i1--);
//     }
//     let i2 = 1;
//     for (let i = middleIdx + 1; i < sorted.length; i++) {
//         deltas.set(sorted[i], i2++);
//     }

//     return deltas;
// }

// // Base spacing between parallel edges' curves. Intentionally independent of the
// // measured card size: otherwise the path string (and thus the card width) would
// // depend on the size again, closing the measurement feedback loop. Real card
// // separation is done by the collision resolution below.
// const PARALLEL_EDGE_BASE_SPACING = 200;

// export function computeDeltaMultiplier(parallelEdgeCount: number): number {
//     return PARALLEL_EDGE_BASE_SPACING * Math.max(1, Math.ceil(parallelEdgeCount / 2));
// }

// function getLabelCenter(geometry: EdgeGeometry, extraOffset: number) {
//     return {
//         x: geometry.labelX + geometry.nx * extraOffset,
//         y: geometry.labelY + geometry.ny * extraOffset,
//     };
// }

// function getLabelBox(geometry: EdgeGeometry, extraOffset: number): LabelBox {
//     const {x, y} = getLabelCenter(geometry, extraOffset);
//     const halfW = geometry.size.width / 2 + LABEL_CARD_PADDING;
//     const halfH = geometry.size.height / 2 + LABEL_CARD_PADDING;

//     return {
//         left: x - halfW,
//         right: x + halfW,
//         top: y - halfH,
//         bottom: y + halfH,
//     };
// }

// function boxesOverlap(a: LabelBox, b: LabelBox): boolean {
//     return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
// }

// function getNodeBoxes(nodeLookup: Map<string, InternalNode>): LabelBox[] {
//     const boxes: LabelBox[] = [];

//     for (const node of nodeLookup.values()) {
//         // Use the real, measured node size instead of a guess so relationship
//         // cards are pushed away from actual node cards.
//         const width = node.measured?.width;
//         const height = node.measured?.height;
//         if (width == null || height == null) {
//             continue;
//         }

//         const x = node.internals.positionAbsolute.x;
//         const y = node.internals.positionAbsolute.y;

//         boxes.push({
//             left: x - NODE_BOX_MARGIN,
//             right: x + width + NODE_BOX_MARGIN,
//             top: y - NODE_BOX_MARGIN,
//             bottom: y + height + NODE_BOX_MARGIN,
//         });
//     }

//     return boxes;
// }

// function boxesOverlapAny(box: LabelBox, others: readonly LabelBox[]): boolean {
//     for (const other of others) {
//         if (boxesOverlap(box, other)) {
//             return true;
//         }
//     }
//     return false;
// }

// // Deterministic greedy placement.
// //
// // Cards are placed one by one. Each card first tries its natural position
// // (extraOffset = 0); if it collides with a node card or with an already placed
// // relationship card, the edge is stretched (the card slides along its own
// // perpendicular) in fine steps until the nearest free spot is found. Because the
// // search only depends on inputs (never on a previous render), the result is
// // stable.
// function findFreeOffset(
//     geometry: EdgeGeometry,
//     nodeBoxes: readonly LabelBox[],
//     placedBoxes: readonly LabelBox[],
// ): number {
//     const step = COLLISION_STEP;
//     const maxSteps = 200;

//     for (let k = 0; k <= maxSteps; k++) {
//         // k = 0 → keep the natural position.
//         // Otherwise try both sides, alternating which one goes first so cards
//         // distribute evenly instead of always stacking on the same side.
//         const candidates = k === 0
//             ? [0]
//             : (k % 2 === 1 ? [k * step, -k * step] : [-k * step, k * step]);

//         for (const offset of candidates) {
//             const box = getLabelBox(geometry, offset);
//             if (!boxesOverlapAny(box, nodeBoxes) && !boxesOverlapAny(box, placedBoxes)) {
//                 return offset;
//             }
//         }
//     }

//     // Fallback: nothing free found within range — keep the natural position.
//     return 0;
// }

// function resolveCollisions(
//     geometries: readonly EdgeGeometry[],
//     nodeBoxes: readonly LabelBox[],
// ): Map<string, number> {
//     // Sort for determinism: the same graph always produces the same layout.
//     const ordered = [...geometries].sort((a, b) => a.edgeId.localeCompare(b.edgeId));

//     const offsets = new Map<string, number>();
//     const placedBoxes: LabelBox[] = [];

//     for (const geometry of ordered) {
//         const offset = findFreeOffset(geometry, nodeBoxes, placedBoxes);
//         offsets.set(geometry.edgeId, offset);
//         placedBoxes.push(getLabelBox(geometry, offset));
//     }

//     return offsets;
// }

// export function computeEdgeLabelLayout(
//     edges: readonly XfEdge[],
//     nodeLookup: Map<string, InternalNode>,
//     labelSizes: ReadonlyMap<string, LabelSize> = new Map(),
// ): Map<string, EdgeLabelLayoutEntry> {
//     const parallelGroups = new Map<string, string[]>();

//     for (const edge of edges) {
//         const key = getParallelEdgeGroupKey(edge.source, edge.target);
//         const group = parallelGroups.get(key);
//         if (group) {
//             group.push(edge.id);
//         } else {
//             parallelGroups.set(key, [edge.id]);
//         }
//     }

//     const geometries: EdgeGeometry[] = [];

//     for (const edge of edges) {
//         const sourceNode = nodeLookup.get(edge.source);
//         const targetNode = nodeLookup.get(edge.target);
//         if (!sourceNode?.measured || !targetNode?.measured) {
//             continue;
//         }

//         const sortedNodes = [sourceNode, targetNode].sort((a, b) => a.id.localeCompare(b.id));
//         const {sx, sy, tx, ty} = getEdgeParams(sortedNodes[0], sortedNodes[1]);

//         const groupKey = getParallelEdgeGroupKey(edge.source, edge.target);
//         const groupEdgeIds = parallelGroups.get(groupKey)!;
//         const pathDelta = computeParallelEdgeDeltas(groupEdgeIds).get(edge.id) ?? 0;
//         const deltaMultiplier = computeDeltaMultiplier(groupEdgeIds.length);
//         const size = labelSizes.get(edge.id) ?? DEFAULT_LABEL_SIZE;
//         const {labelX, labelY} = getSpecialPath(
//             {sourceX: sx, sourceY: sy, targetX: tx, targetY: ty},
//             pathDelta,
//             deltaMultiplier,
//         );

//         const dx = tx - sx;
//         const dy = ty - sy;
//         const length = Math.sqrt(dx * dx + dy * dy) || 1;

//         geometries.push({
//             edgeId: edge.id,
//             labelX,
//             labelY,
//             nx: -dy / length,
//             ny: dx / length,
//             pathDelta,
//             deltaMultiplier,
//             size,
//         });
//     }

//     const nodeBoxes = getNodeBoxes(nodeLookup);
//     const extraOffsets = resolveCollisions(geometries, nodeBoxes);
//     const layout = new Map<string, EdgeLabelLayoutEntry>();

//     for (const geometry of geometries) {
//         layout.set(geometry.edgeId, {
//             pathDelta: geometry.pathDelta,
//             extraOffset: extraOffsets.get(geometry.edgeId) ?? 0,
//             deltaMultiplier: geometry.deltaMultiplier,
//         });
//     }

//     return layout;
// }
