import {
	type ConnectionLineComponentProps,
	getStraightPath,
} from '@xyflow/react'
import type { XfNode } from '@/shared/types/xyflow.ts'
import RenderCountView from "@/shared/dev/RenderCountView.tsx";
import useRenderCountLogging from "@/shared/dev/useRenderCountLogging.ts";

/**
 * Видна при соединении нод
 */
function ConnectionLine({
	fromX,
	fromY,
	toX,
	toY,
	connectionLineStyle,
}: ConnectionLineComponentProps<XfNode>) {
	useRenderCountLogging("ConnectionLine", true)

	const [edgePath] = getStraightPath({
		sourceX: fromX,
		sourceY: fromY,
		targetX: toX,
		targetY: toY,
	})

	return (
		<>
			<g>
				<path style={connectionLineStyle} fill='none' d={edgePath} />
			</g>
		</>
	)
}

export default ConnectionLine
