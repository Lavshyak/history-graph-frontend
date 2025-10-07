import {
    calculateCurrentEdgeData,
    calculateHasEdgeDataUpdates,
    type EdgeData,
    type EdgeDataIdType, type EdgeSourceData,
    type EdgeUpdatedData
} from "../types/EdgeData.ts";
import type {NodeDataIdType} from "../types/NodeData.ts";
import {coolerMitt, type CoolerMittForEmittersType, type CoolerMittType} from "../coolerMitt/coolerMitt.ts";
import type {DeepReadonly} from "../lib/DeepReadonly.ts";
import {produce} from "immer";


export type EdgesMap = Map<EdgeDataIdType, EdgeData>
export type NodesIdsEdgesIdsMap = Map<NodeDataIdType, EdgeDataIdType[]>


type CoolerEdgesStateEvents = {
    edgeDataMutated: {
        additionalKey: string;
        payload: DeepReadonly<EdgeData>;
    };
    someEdgeDataMutated: {
        additionalKey: undefined;
        payload: DeepReadonly<EdgeData>;
    };

    someEdgeAddedFromSource: {
        additionalKey: undefined;
        payload: DeepReadonly<EdgeData>;
    };
    someEdgeRemoved: {
        additionalKey: undefined;
        payload: { edgeId: EdgeDataIdType };
    };
    someEdgeCreated: {
        additionalKey: undefined;
        payload: DeepReadonly<EdgeData>;
    };
};

function coolerEdgesState() {
    const allEdges: EdgesMap = new Map<EdgeDataIdType, EdgeData>()
    const nodesIdsEdgesIds: NodesIdsEdgesIdsMap = new Map<NodeDataIdType, EdgeDataIdType[]>

    const mitt: CoolerMittType<CoolerEdgesStateEvents> = coolerMitt<CoolerEdgesStateEvents>()

    mitt.on({key: "someEdgeDataMutated"}, edgeData => mitt.emit({
        key: "edgeDataMutated",
        additionalKey: edgeData.sourceData.id
    }, edgeData))

    return {
        updateEdgeData(entry: { id: EdgeDataIdType; updatedData: Partial<EdgeUpdatedData> }) {
            const edgeData = allEdges.get(entry.id)
            if (!edgeData) return;
            const mutated = produce(edgeData, draft => {
                draft.updatedData = {...edgeData.updatedData, ...entry.updatedData}
                draft.currentData = calculateCurrentEdgeData(edgeData.sourceData, edgeData.updatedData)
                draft.tech.hasDataUpdates = calculateHasEdgeDataUpdates(edgeData.sourceData, edgeData.updatedData)
            })

            allEdges.set(entry.id, mutated)

            mitt.emit({key: "someEdgeDataMutated"}, mutated)
        },
        markEdgeForDelete(entry: { id: EdgeDataIdType; markForDelete: boolean }) {
            const edgeData = allEdges.get(entry.id)
            if (!edgeData) return;

            const mutated = produce(edgeData, draft => {
                draft.tech.isExplicitlyMarkedForDelete = entry.markForDelete;
                draft.tech.isGenerallyMarkedForDelete = draft.tech.isExplicitlyMarkedForDelete || draft.tech.markedForDeleteBecauseNodes.length > 0
            })

            allEdges.set(entry.id, mutated)
            mitt.emit({key: "someEdgeDataMutated"}, mutated)
        },
        addEdgeFromSource(entry: { edgeSourceData: EdgeSourceData }) {
            const isExisting = allEdges.get(entry.edgeSourceData.id)
            if (isExisting) {
                throw new Error(`edge with same id (${entry.edgeSourceData.id}) already exist`)
            }

            const edgeData: EdgeData = {
                sourceData: entry.edgeSourceData,
                currentData: calculateCurrentEdgeData(entry.edgeSourceData, undefined),
                tech: {
                    isExplicitlyMarkedForDelete: false,
                    isGenerallyMarkedForDelete: false,
                    markedForDeleteBecauseNodes: [],
                    hasDataUpdates: false,
                    sourceOrCreated: "source"
                },
                updatedData: undefined
            }

            allEdges.set(entry.edgeSourceData.id, edgeData)
            mitt.emit({key: "someEdgeAddedFromSource"}, edgeData)
        },
        createEdge(entry: { edgeSourceData: EdgeSourceData }) {
            const isExisting = allEdges.get(entry.edgeSourceData.id)
            if (isExisting) {
                throw new Error(`edge with same id (${entry.edgeSourceData.id}) already exist`)
            }

            const edgeData: EdgeData = {
                sourceData: entry.edgeSourceData,
                currentData: calculateCurrentEdgeData(entry.edgeSourceData, undefined),
                tech: {
                    isExplicitlyMarkedForDelete: false,
                    isGenerallyMarkedForDelete: false,
                    markedForDeleteBecauseNodes: [],
                    hasDataUpdates: false,
                    sourceOrCreated: "created"
                },
                updatedData: undefined
            }

            allEdges.set(entry.edgeSourceData.id, edgeData)
            mitt.emit({key: "someEdgeCreated"}, edgeData)
        },
        removeEdge(entry: { edgeId: EdgeDataIdType }) {
            const isDeleted = allEdges.delete(entry.edgeId)
            if (isDeleted) {
                mitt.emit({key: "someEdgeRemoved"}, {edgeId: entry.edgeId})
            }
        }
    }
}