import * as React from "react";
import {useEffect} from "react";
import type {UseQueryResult} from "@tanstack/react-query";
import type {DtoEventsAndRelationships} from "../../../gen";
import type {XYPosition} from "@xyflow/react";
import type {NodeDatasStateManager} from "../../../coolerState/coolerNodesState.ts";
import type {EdgeDatasStateManager} from "../../../coolerState/coolerEdgesState.ts";
import {devDtoEventsAndRelationshipsMock} from "../../../components/dev.ts";
import type {NodeSourceData} from "../../../types/NodeData.ts";
import type {EdgeSourceData} from "../../../types/EdgeData.ts";
import {prettifyGraph} from "../../types/prettifyGraph.ts";
import type {ResponseConfig, ResponseErrorConfig} from "@kubb/plugin-client/clients/axios";

export function useInitializeEffect(isInitialized: React.RefObject<boolean>,
                                    getAllQuery: UseQueryResult<ResponseConfig<DtoEventsAndRelationships>, ResponseErrorConfig<Error>> & {},
                                    recommendedNodePositionsOnAdd: Map<string, XYPosition>,
                                    nodeDatasStateManager: NodeDatasStateManager,
                                    edgeDatasStateManager: EdgeDatasStateManager
) {
    return useEffect(() => {
        if (isInitialized.current) return
        isInitialized.current = true

        const rawData = getAllQuery.data?.data ?? devDtoEventsAndRelationshipsMock

        if (!rawData.events.length) return

        const newNodeSourceDatas: NodeSourceData[] = rawData.events.map(n => ({
            description: n.description,
            label: 'label',
            keywords: n.keywords,
            timeFrom: n.timeFrom,
            timeTo: n.timeTo,
            title: n.title,
            id: n.id,
        }))

        const newEdgeSourceDatas: EdgeSourceData[] = rawData.relationships.map(
            r => ({
                id: r.id.toString(),
                label: r.label,
                fromId: r.fromId.toString(),
                toId: r.toId.toString(),
            }),
        )

        prettifyGraph(
            newNodeSourceDatas.map(nsd => nsd.id),
            newEdgeSourceDatas.map(esd => ({
                id: esd.id,
                source: esd.fromId,
                target: esd.toId,
            })),
        ).then(nodeIdsPositions => {
            nodeIdsPositions.forEach(idAndPosition => {
                recommendedNodePositionsOnAdd.set(
                    idAndPosition.nodeId,
                    idAndPosition.position,
                )
            })

            newNodeSourceDatas.forEach(nodeSourceData => {
                nodeDatasStateManager.addNodeFromSource(nodeSourceData)
            })

            newEdgeSourceDatas.forEach(edgeSourceData => {
                edgeDatasStateManager.addEdgeFromSource(edgeSourceData)
            })
        })
    }, [])
}