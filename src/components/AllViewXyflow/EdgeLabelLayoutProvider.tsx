// import {useStore} from "@xyflow/react";
// import {type ReactNode, useCallback, useContext, useMemo, useState} from "react";
// import {EdgeLabelLayoutContext, EdgeLabelSizeContext} from "./Contexts.ts";
// import {computeEdgeLabelLayout, type LabelSize} from "./edgeLabelLayout.ts";
// import type {XfEdge} from "./XyFlowTypeAliases.ts";
// import {ForceRerenderContext} from "../../contexts/ForceRerenderContext.ts";

// type EdgeLabelLayoutProviderProps = {
//     children: ReactNode;
// };

// export function EdgeLabelLayoutProvider({children}: EdgeLabelLayoutProviderProps) {
//     const edges = useStore((state) => state.edges as XfEdge[]);
//     const nodeLookup = useStore((state) => state.nodeLookup);
//     // Signature must react to both node positions AND their measured sizes,
//     // otherwise the layout keeps using stale/absent dimensions.
//     const nodesSignature = useStore((state) => {
//         const parts: string[] = [];
//         state.nodeLookup.forEach((node, nodeId) => {
//             const {x, y} = node.internals.positionAbsolute;
//             const width = node.measured?.width ?? 0;
//             const height = node.measured?.height ?? 0;
//             parts.push(`${nodeId}:${x.toFixed(1)},${y.toFixed(1)},${width}x${height}`);
//         });
//         return parts.join("|");
//     });
//     const {forcedRerenderValue} = useContext(ForceRerenderContext);

//     // Real, freshly measured sizes of the rendered relationship label cards.
//     const [labelSizes, setLabelSizes] = useState<ReadonlyMap<string, LabelSize>>(() => new Map());

//     const reportSize = useCallback((edgeId: string, size: LabelSize) => {
//         setLabelSizes((previous) => {
//             const existing = previous.get(edgeId);
//             // Ignore sub-pixel jitter to avoid an endless measure → relayout loop.
//             if (
//                 existing &&
//                 Math.abs(existing.width - size.width) < 2 &&
//                 Math.abs(existing.height - size.height) < 2
//             ) {
//                 return previous;
//             }
//             const next = new Map(previous);
//             next.set(edgeId, size);
//             return next;
//         });
//     }, []);

//     const layout = useMemo(
//         () => computeEdgeLabelLayout(edges, nodeLookup, labelSizes),
//         [edges, nodeLookup, nodesSignature, forcedRerenderValue, labelSizes],
//     );

//     const sizeContextValue = useMemo(
//         () => ({sizes: labelSizes, reportSize}),
//         [labelSizes, reportSize],
//     );

//     return (
//         <EdgeLabelSizeContext.Provider value={sizeContextValue}>
//             <EdgeLabelLayoutContext.Provider value={layout}>
//                 {children}
//             </EdgeLabelLayoutContext.Provider>
//         </EdgeLabelSizeContext.Provider>
//     );
// }
