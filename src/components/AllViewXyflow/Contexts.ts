import {createContext} from "react";
import type {EdgeLabelLayoutEntry} from "./edgeLabelLayout.ts";

export const EditableContext = createContext(false);

export const EdgeLabelLayoutContext = createContext<ReadonlyMap<string, EdgeLabelLayoutEntry>>(
    new Map(),
);

/*
export const MarkEdgeForDeleteContext = createContext<{
    markEdgeForDelete: (edgeId: string) => void,
    undoMarkEdgeForDelete: (edgeId: string) => void
}>({
    markEdgeForDelete: () => {
    },
    undoMarkEdgeForDelete: () => {
    }
});

export const MarkNodeForDeleteContext = createContext<{
    markNodeForDelete: (nodeId: string) => void,
    undoMarkNodeForDelete: (nodeId: string) => void
}>({
    markNodeForDelete: () => {
    },
    undoMarkNodeForDelete: () => {
    }
});*/
