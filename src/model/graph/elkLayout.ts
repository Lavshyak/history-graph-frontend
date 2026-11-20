import ElkApi, {type ELK, type ElkNode} from 'elkjs/lib/elk-api.js'
import ElkWorker from 'elkjs/lib/elk-worker.min.js?worker'
import ElkConstructor from 'elkjs'

export type ElkLayoutNode = {id: string; x?: number; y?: number}
export type ElkLayoutResult = {children?: ElkLayoutNode[]}

let workerElk: ELK | null = null
let mainThreadElk: ELK | null = null

function getMainThreadElk(): ELK {
    mainThreadElk ??= new ElkConstructor()
    return mainThreadElk
}

function getWorkerElk(): ELK | null {
    if (workerElk) return workerElk
    try {
        workerElk = new ElkApi({workerFactory: () => new ElkWorker()})
        return workerElk
    } catch (error) {
        console.warn(
            'elkjs: не удалось создать воркер, раскладка будет на главном потоке',
            error,
        )
        return null
    }
}

/**
 * Раскладка через elkjs в отдельном потоке.
 *
 * На главном потоке elk блокировал UI: замер — 1000 нод ≈ 2.3 с, 1000 связей
 * ≈ 0.45 с «мёртвого» интерфейса. В воркере страница остаётся отзывчивой, а
 * результат приходит по завершении.
 *
 * Если воркер недоступен/упал — откатываемся на главный поток, чтобы граф
 * всё равно разложился.
 */
export async function layoutWithElk(graph: ElkNode): Promise<ElkLayoutResult> {
    const worker = getWorkerElk()
    if (worker) {
        try {
            return (await worker.layout(graph)) as ElkLayoutResult
        } catch (error) {
            console.warn('elkjs: воркер упал, раскладка на главном потоке', error)
            workerElk = null
            worker.terminateWorker()
        }
    }

    return (await getMainThreadElk().layout(graph)) as ElkLayoutResult
}
