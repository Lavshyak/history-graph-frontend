import type {XYPosition} from '@xyflow/react'
import type {NodeDatasStateManager} from '@/model/node/createNodeDatasStateManager.ts'
import type {EdgeDatasStateManager} from '@/model/edge/createEdgeDatasStateManager.ts'
import type {NodeDataIdType, NodeSourceData} from '@/model/node/nodeData.ts'
import type {EdgeSourceData} from '@/model/edge/edgeData.ts'
import {prettifyGraph} from '@/model/graph/prettifyGraph.ts'

export type DevGraphGeneratorParams = Readonly<{
    sourceNodesCount: number
    createdNodesCount: number
    sourceEdgesCount: number
    createdEdgesCount: number
    randomSeed: number
}>

const DAY_MS = 24 * 60 * 60 * 1000
const BASE_TIME_MS = Date.UTC(1900, 0, 1)

// Детерминированный ПСЧ (mulberry32): один и тот же seed даёт один и тот же граф.
function createSeededRandom(seed: number): () => number {
    let state = seed >>> 0
    return () => {
        state = (state + 0x6d2b79f5) >>> 0
        let t = state
        t = Math.imul(t ^ (t >>> 15), t | 1)
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}

function randomInt(random: () => number, min: number, max: number): number {
    return min + Math.floor(random() * (max - min + 1))
}

function generateNodeSourceData(
    id: NodeDataIdType,
    random: () => number,
): NodeSourceData {
    const startDay = randomInt(random, 0, 40000)
    const durationDays = randomInt(random, 1, 3650)
    const timeFrom = new Date(BASE_TIME_MS + startDay * DAY_MS)
    const timeTo = new Date(timeFrom.getTime() + durationDays * DAY_MS)

    const keywordsCount = randomInt(random, 1, 5)
    const keywords = Array.from(
        {length: keywordsCount},
        (_, index) => `keyword-${id}-${index + 1}`,
    )

    return {
        id,
        label: `node-${id}`,
        timeFrom,
        timeTo,
        keywords,
        title: `Node ${id}`,
        description: `Dev generated node ${id}`,
    }
}

/**
 * Dev генератор графа: заполняет переданные менеджеры синтетическими нодами и связями.
 *
 * Идентификаторы — короткие числовые строки ("1", "2", "3", ...), а не GUID,
 * чтобы карточки связей в GUI не были широкими.
 *
 * Аргументы (в порядке перечисления):
 *  - sourceNodesCount — кол-во source нод
 *  - createdNodesCount — кол-во created нод
 *  - sourceEdgesCount — кол-во source связей
 *  - createdEdgesCount — кол-во created связей
 *  - randomSeed — seed для детерминированной генерации
 */
export async function generateDevGraph(
    sourceNodesCount: number,
    createdNodesCount: number,
    sourceEdgesCount: number,
    createdEdgesCount: number,
    randomSeed: number,
    nodeDatasStateManager: NodeDatasStateManager,
    edgeDatasStateManager: EdgeDatasStateManager,
    recommendedNodePositionsOnAdd: Map<string, XYPosition> = new Map(),
): Promise<void> {
    const random = createSeededRandom(randomSeed)

    const nodeSourceDatas: { data: NodeSourceData; created: boolean }[] = []

    let nextNodeId = 1
    for (let i = 0; i < sourceNodesCount; i++) {
        const id = String(nextNodeId++)
        nodeSourceDatas.push({data: generateNodeSourceData(id, random), created: false})
    }
    for (let i = 0; i < createdNodesCount; i++) {
        const id = String(nextNodeId++)
        nodeSourceDatas.push({data: generateNodeSourceData(id, random), created: true})
    }

    const allNodeIds = nodeSourceDatas.map(n => n.data.id)

    function pickEdgeNodePair(
        pool: NodeDataIdType[],
    ): [NodeDataIdType, NodeDataIdType] | undefined {
        if (pool.length < 2) return undefined

        const fromIndex = randomInt(random, 0, pool.length - 1)
        let toIndex = randomInt(random, 0, pool.length - 1)
        if (toIndex === fromIndex) toIndex = (toIndex + 1) % pool.length

        return [pool[fromIndex], pool[toIndex]]
    }

    const edgeSourceDatas: { data: EdgeSourceData; created: boolean }[] = []
    let nextEdgeId = 1

    // И source, и created связи тянут оба конца из общего пула нод (source + created)
    // с равной вероятностью, поэтому created связи так же могут цепляться к source нодам
    // и наоборот — как и source связи к created нодам.
    for (let i = 0; i < sourceEdgesCount; i++) {
        const pair = pickEdgeNodePair(allNodeIds)
        if (!pair) break

        const id = String(nextEdgeId++)
        edgeSourceDatas.push({
            created: false,
            data: {id, label: `${pair[0]}->${pair[1]}`, fromId: pair[0], toId: pair[1]},
        })
    }

    for (let i = 0; i < createdEdgesCount; i++) {
        const pair = pickEdgeNodePair(allNodeIds)
        if (!pair) break

        const id = String(nextEdgeId++)
        edgeSourceDatas.push({
            created: true,
            data: {id, label: `${pair[0]}->${pair[1]}`, fromId: pair[0], toId: pair[1]},
        })
    }

    // Раскладываем ноды и запоминаем рекомендованные позиции до добавления,
    // чтобы addXfNode сразу взял корректную позицию.
    const nodeIdsPositions = await prettifyGraph(
        allNodeIds,
        edgeSourceDatas.map(e => ({
            id: e.data.id,
            source: e.data.fromId,
            target: e.data.toId,
        })),
    )
    nodeIdsPositions.forEach(idAndPosition => {
        recommendedNodePositionsOnAdd.set(idAndPosition.nodeId, idAndPosition.position)
    })

    // Сначала все ноды, затем связи (как в обычной инициализации из API).
    nodeSourceDatas.forEach(({data, created}) => {
        if (created) {
            nodeDatasStateManager.addNodeFromCreated(data)
        } else {
            nodeDatasStateManager.addNodeFromSource(data)
        }
    })
    edgeSourceDatas.forEach(({data, created}) => {
        if (created) {
            edgeDatasStateManager.addEdgeFromCreated(data)
        } else {
            edgeDatasStateManager.addEdgeFromSource(data)
        }
    })
}
