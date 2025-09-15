export type GetSpecialPathParams = {
    sourceX: number;
    sourceY: number;
    targetX: number;
    targetY: number;
};

/**
 *
 * @param sourceX
 * @param sourceY
 * @param targetX
 * @param targetY
 * @param delta - position when multiple edges
 * @param deltaMultiplier - offset multiplier
 */
export const getSpecialPath = (
    {sourceX, sourceY, targetX, targetY}: GetSpecialPathParams,
    delta: number,
    deltaMultiplier: number,
) => {
    /*
    * delta:
    * если нодов 3, то их delta: [-1,0,1]
    * т.е. если это нод под индексом 0, то его delta == -1.
    * это нужно для отклонения.
    *
    * deltaMultiplier: это множитель отклонения
    */
    const dx = targetX - sourceX;
    const dy = targetY - sourceY;

    // середина
    const rawCenterX = (sourceX + targetX) / 2;
    const rawCenterY = (sourceY + targetY) / 2;

    // длина вектора
    const length = Math.sqrt(dx * dx + dy * dy);

    // нормализованный перпендикуляр
    const nx = -dy / length;
    const ny = dx / length;

    // смещаем контрольную точку
    const centerX = rawCenterX + nx * delta * deltaMultiplier;
    const centerY = rawCenterY + ny * delta * deltaMultiplier;

    // чето кароче чтоб направляющую какой-то там кривой привести к реальной вершине этой кривой, куда потом лейбл втыкать
    const t = 0.5;
    const labelX =
        (1 - t) * (1 - t) * sourceX +
        2 * (1 - t) * t * centerX +
        t * t * targetX;
    const labelY =
        (1 - t) * (1 - t) * sourceY +
        2 * (1 - t) * t * centerY +
        t * t * targetY;

    return {
        path: `M ${sourceX} ${sourceY} Q ${centerX} ${centerY} ${targetX} ${targetY}`,
        labelX,
        labelY,
    };
};