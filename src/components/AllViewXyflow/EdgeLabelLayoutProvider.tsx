import {useStore} from "@xyflow/react";
import {type ReactNode, useContext, useMemo} from "react";
import {EdgeLabelLayoutContext} from "./Contexts.ts";
import {computeEdgeLabelLayout} from "./edgeLabelLayout.ts";
import type {XfEdge, XfNode} from "./XyFlowTypeAliases.ts";
import {ForceRerenderContext} from "../../contexts/ForceRerenderContext.ts";

type EdgeLabelLayoutProviderProps = {
    children: ReactNode;
};

export function EdgeLabelLayoutProvider({children}: EdgeLabelLayoutProviderProps) {
    const edges = useStore((state) => state.edges as XfEdge[]);
    const nodeLookup = useStore((state) => state.nodeLookup);
    const nodesSignature = useStore((state) =>
        (state.nodes as XfNode[])
            .map((node) => `${node.id}:${node.position.x.toFixed(1)},${node.position.y.toFixed(1)}`)
            .join("|"),
    );
    const {forcedRerenderValue} = useContext(ForceRerenderContext);

    const layout = useMemo(
        () => computeEdgeLabelLayout(edges, nodeLookup),
        [edges, nodeLookup, nodesSignature, forcedRerenderValue],
    );

    return (
        <EdgeLabelLayoutContext.Provider value={layout}>
            {children}
        </EdgeLabelLayoutContext.Provider>
    );
}
