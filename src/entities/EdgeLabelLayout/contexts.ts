import { createContext } from 'react'
import type { EdgeLabelLayoutEntry, LabelSize } from '@/entities/EdgeLabelLayout/edgeLabelLayout.ts'

export const EditableContext = createContext(false)

export const EdgeLabelLayoutContext = createContext<
	ReadonlyMap<string, EdgeLabelLayoutEntry>
>(new Map())

// Real, freshly measured sizes of the rendered relationship label cards, keyed
// by edge id. Карточки только сообщают свой размер; сам набор размеров живёт
// внутри EdgeLabelLayoutProvider. Контекст отдаёт одну стабильную функцию, чтобы
// замер одного лейбла не ре-рендерил все рёбра графа.
export const EdgeLabelReportSizeContext = createContext<
	(edgeId: string, size: LabelSize) => void
>(() => {})

// Версия раскладки. Рёбра подписываются на неё, чтобы перерисоваться после
// пересчёта раскладки (например, когда закончилось перетаскивание ноды и
// смещения лейблов изменились). Сама раскладка читается через геттер по id,
// поэтому версия — единственное, что уходит в контекст.
// export const EdgeLabelLayoutVersionContext = createContext(0)
