import * as React from 'react'
import { useEffect } from 'react'
import type { UseQueryResult } from '@tanstack/react-query'
import type { DtoEventsAndRelationships } from '@/api/generated/types/DtoEventsAndRelationships.ts'
import type { XYPosition } from '@xyflow/react'
import type { NodeDatasStateManager } from '@/model/node/createNodeDatasStateManager.ts'
import type { EdgeDatasStateManager } from '@/model/edge/createEdgeDatasStateManager.ts'
import type { NodeSourceData } from '@/model/node/nodeData.ts'
import type { EdgeSourceData } from '@/model/edge/edgeData.ts'
import { prettifyGraph } from '@/model/graph/prettifyGraph.ts'
import { useToggleStore } from '@/shared/UiStore/useToggleStore.ts'
import {
	generateDevGraph,
	type DevGraphGeneratorParams,
} from '@/shared/dev/generateDevGraph.ts'
import type {
	ResponseConfig,
	ResponseErrorConfig,
} from '@kubb/plugin-client/clients/axios'

// Параметры dev графа: (source ноды, created ноды, source связи, created связи, seed).
// Крути эти числа, когда хочется поиграться на графе побольше трёх нод.
export const devGraphGeneratorParams: DevGraphGeneratorParams = {
	sourceNodesCount: 50,
	createdNodesCount: 50,
	sourceEdgesCount: 40,
	createdEdgesCount: 40,
	randomSeed: 12345,
}

export function useInitializeEffect(
	isInitialized: React.RefObject<boolean>,
	getAllQuery: UseQueryResult<
		ResponseConfig<DtoEventsAndRelationships>,
		ResponseErrorConfig<Error>
	> & {},
	recommendedNodePositionsOnAdd: Map<string, XYPosition>,
	nodeDatasStateManager: NodeDatasStateManager,
	edgeDatasStateManager: EdgeDatasStateManager,
	fitView: () => void,
) {
	return useEffect(() => {
		if (isInitialized.current) return
		isInitialized.current = true
		const isSortGraph = useToggleStore.getState().isSortGraph

		const rawData = getAllQuery.data?.data

		// Нет данных с сервера — наполняем граф dev генератором.
		if (!rawData || !rawData.events.length) {
			void generateDevGraph(
				devGraphGeneratorParams.sourceNodesCount,
				devGraphGeneratorParams.createdNodesCount,
				devGraphGeneratorParams.sourceEdgesCount,
				devGraphGeneratorParams.createdEdgesCount,
				devGraphGeneratorParams.randomSeed,
				nodeDatasStateManager,
				edgeDatasStateManager,
				isSortGraph,
				recommendedNodePositionsOnAdd,
			).then(() => fitViewAfterPaint(fitView))
			return
		}

		const newNodeSourceDatas: NodeSourceData[] = rawData.events
			.map(n => ({
				description: n.description,
				label: 'label',
				keywords: n.keywords,
				timeFrom: n.timeFrom,
				timeTo: n.timeTo,
				title: n.title,
				id: n.id,
			}))
			.sort((a, b) => a.timeTo.getTime() - b.timeTo.getTime())

		// console.log('newNodeSourceDatas', newNodeSourceDatas)

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
			isSortGraph,
		)
			.then(nodeIdsPositions => {
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
			.then(() => fitViewAfterPaint(fitView))
	}, [])
}

function fitViewAfterPaint(fitView: () => void) {
	const sleep = new Promise(resolve => setTimeout(resolve, 1))
	sleep.then(() => {
		fitView()
	})
}
