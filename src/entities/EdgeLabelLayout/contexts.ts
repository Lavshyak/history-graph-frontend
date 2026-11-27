import { createContext } from 'react'
import type { EdgeLabelLayoutEntry, LabelSize } from '@/entities/EdgeLabelLayout/edgeLabelLayout.ts'

export const EditableContext = createContext(false)

export const EdgeLabelLayoutContext = createContext<
	ReadonlyMap<string, EdgeLabelLayoutEntry>
>(new Map())

// Рёбра читают свою запись из карты и перерисовываются при новой раскладке.

// Real, freshly measured sizes of the rendered relationship label cards, keyed
// by edge id. Карточки только сообщают свой размер; сам набор размеров живёт
// внутри EdgeLabelLayoutProvider. Контекст отдаёт одну стабильную функцию, чтобы
// замер одного лейбла не ре-рендерил все рёбра графа.
export const EdgeLabelReportSizeContext = createContext<
	(edgeId: string, size: LabelSize) => void
>(() => {})
