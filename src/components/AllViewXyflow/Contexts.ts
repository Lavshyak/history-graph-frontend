import {createContext} from "react";

export const EditableContext = createContext(false);

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
});