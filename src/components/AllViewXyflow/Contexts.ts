import {createContext} from "react";
import type {EdgeLabelLayoutEntry, LabelSize} from "./edgeLabelLayout.ts";

export const EditableContext = createContext(false);

export const EdgeLabelLayoutContext = createContext<ReadonlyMap<string, EdgeLabelLayoutEntry>>(
    new Map(),
);

// Real, freshly measured sizes of the rendered relationship label cards, keyed
// by edge id. Layout needs these so cards are positioned using their actual
// dimensions instead of hardcoded guesses.
export const EdgeLabelSizeContext = createContext<{
    sizes: ReadonlyMap<string, LabelSize>;
    reportSize: (edgeId: string, size: LabelSize) => void;
}>({
    sizes: new Map(),
    reportSize: () => {
    },
});

