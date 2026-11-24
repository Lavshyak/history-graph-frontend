import {devLog} from "@/shared/dev/isDevLoggingEnabled.ts";

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
 * @param extraOffset - collision offset. The whole edge is stretched by it so its
 *   apex (the point the label sits on) lands exactly where the card is placed, so
 *   the card always stays ON its edge instead of floating next to it.
 */
export const getSpecialPath = (
    {sourceX, sourceY, targetX, targetY}: GetSpecialPathParams,
    delta: number,
    deltaMultiplier: number,
    extraOffset = 0,
) => {
    devLog("getSpecialPath", true)
    /*
    * delta:
    * если связей 3, то их delta: [-1,0,1]
    * т.е. если это связь под индексом 0, то его delta == -1.
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
    const length = Math.sqrt(dx * dx + dy * dy) || 1;

    // нормализованный перпендикуляр
    const nx = -dy / length;
    const ny = dx / length;

    // Контрольная точка выгибает ребро и на параллельное смещение (delta), и на
    // collision-смещение (extraOffset). Точка кривой при t = 0.5 уезжает на
    // половину смещения контрольной точки, поэтому extraOffset удваивается —
    // тогда вершина кривой (и лейбл на ней) смещается ровно на extraOffset, а
    // ребро «вытягивается» вслед за карточкой.
    const controlOffset = delta * deltaMultiplier + extraOffset * 2;
    const centerX = rawCenterX + nx * controlOffset;
    const centerY = rawCenterY + ny * controlOffset;

    // Вершина квадратичной кривой Безье при t = 0.5 — точка, куда «втыкается» лейбл.
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