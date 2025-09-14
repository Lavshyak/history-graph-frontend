// prettifyGraph.ts
// async функция: можно await или .then()
// мутирует переданный nodes (устанавливает .x, .y и .position)
// гарантированно возвращает { nodes, edges }
export type NodeInput = {
    id: string;
    // произвольные доп. поля (data и т.п.)
    [k: string]: any;
};

export type EdgeInput = {
    id?: string;
    source: string;
    target: string;
    label?: string;
    [k: string]: any;
};

export type PrettifyOpts = {
    width?: number;
    height?: number;
    iterations?: number;
    linkDistance?: number;
    charge?: number;
    nodeRadius?: number;
};

export default async function prettifyGraph3(
    nodes: NodeInput[],
    edges: EdgeInput[],
    opts?: PrettifyOpts
): Promise<{ nodes: NodeInput[]; edges: EdgeInput[] }> {
    const {
        width = 800,
        height = 600,
        iterations = 300,
        linkDistance = 120,
        charge = -300,
        nodeRadius = 30,
    } = opts ?? {};

    if (!nodes || nodes.length === 0) return { nodes, edges };

    // Попытка использовать d3-force динамически — если не установлен, будет fallback
    try {
        const d3 = await import("d3-force");
        const { forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide } = d3;

        // используем копии для симуляции, чтобы не ломать входные объекты до финала
        const simNodes = nodes.map((n) => ({ ...n }));
        const simLinks = edges.map((e) => ({ ...e }));

        const sim = forceSimulation(simNodes as any)
            .force(
                "link",
                forceLink(simLinks as any)
                    .id((d: any) => String(d.id))
                    .distance(linkDistance)
                    .strength(1)
            )
            .force("charge", forceManyBody().strength(charge))
            .force("center", forceCenter(width / 2, height / 2))
            .force("collide", forceCollide(nodeRadius));

        // синхронный цикл тиков — проще и детерминированнее в среде сборки
        for (let i = 0; i < iterations; i++) sim.tick();
        sim.stop();

        // запишем позиции обратно в оригинальные nodes (мутируем, как ты ожидал)
        for (let i = 0; i < simNodes.length; i++) {
            const s = simNodes[i];
            const x = typeof s.x === "number" ? s.x : 0;
            const y = typeof s.y === "number" ? s.y : 0;
            nodes[i].x = x;
            nodes[i].y = y;
            nodes[i].position = { x, y };
        }

        // убедимся, что edges содержат source/target как id-строки
        for (let i = 0; i < simLinks.length; i++) {
            const l = simLinks[i] as any;
            const src = typeof l.source === "object" ? String(l.source.id ?? l.source) : String(l.source);
            const tgt = typeof l.target === "object" ? String(l.target.id ?? l.target) : String(l.target);
            edges[i].source = src;
            edges[i].target = tgt;
        }

        return { nodes, edges };
    } catch (err) {
        // Если d3 не доступен — fallback: простой grid layout
        const count = nodes.length;
        const cols = Math.ceil(Math.sqrt(count));
        const spacingX = Math.max(60, width / cols);
        const spacingY = Math.max(60, height / Math.ceil(count / cols));

        nodes.forEach((n, idx) => {
            const row = Math.floor(idx / cols);
            const col = idx % cols;
            const x = spacingX / 2 + col * spacingX;
            const y = spacingY / 2 + row * spacingY;
            n.x = x;
            n.y = y;
            n.position = { x, y };
        });

        // edges остаются как есть (source/target должны быть id-строками в исходном массиве)
        return { nodes, edges };
    }
}
