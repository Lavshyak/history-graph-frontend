import {createContext} from "react";

export const EditableContext = createContext(false);

export const MarkEdgeToDeleteContext = createContext<{
    markEdgeToDelete: (edgeId: string) => void,
    undoMarkEdgeToDelete: (edgeId: string) => void
}>({
    markEdgeToDelete: () => {
    },
    undoMarkEdgeToDelete: () => {
    }
});