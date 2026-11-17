import {
	type ConnectionLineComponentProps,
	getStraightPath,
} from '@xyflow/react'
import type { XfNode } from '../../index'
import RenderCountView from "../../../devOnly/RenderCountView.tsx";
import useRenderCountLogging from "../../../devOnly/useRenderCountLogging.tsx";

function CustomConnectionLine({
	fromX,
	fromY,
	toX,
	toY,
	connectionLineStyle,
}: ConnectionLineComponentProps<XfNode>) {
	useRenderCountLogging("CustomConnectionLine")

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

export default CustomConnectionLine
