import {
	Background,
	MarkerType,
	ReactFlow,
} from '@xyflow/react'
import type { ComponentProps, ReactNode, Ref } from 'react'
import type { StoreApi } from 'zustand/vanilla'
import { useStore } from 'zustand/react'

import ConnectionLine from '@/entities/ConnectionLine/ConnectionLine.tsx'
import { EventNode } from '@/entities/EventNode/EventNode.tsx'
import FloatingEdge from '@/entities/FloatingEdge/FloatingEdge.tsx'
import type { XfNodesLocalState } from '@/widgets/GraphBoard/hooks/useXfNodesLocalState.ts'
import type { XfEdge as GraphXfEdge, XfNode as GraphXfNode } from '@/shared/types/xyflow.ts'

const connectionLineStyle = {
	stroke: '#b1b1b7',
}

const nodeTypes = {
	EventNode,
}

const edgeTypes = {
	FloatingEdge,
}

const defaultEdgeOptions = {
	markerEnd: {
		type: MarkerType.ArrowClosed,
		color: '#b1b1b7',
	},
}

type FlowProps = Omit<
	ComponentProps<typeof ReactFlow>,
	'nodes' | 'edges' | 'children' | 'ref'
>

type GraphFlowCanvasProps = {
	nodesStore: StoreApi<XfNodesLocalState>
	edges: readonly Readonly<GraphXfEdge>[]
	flowRef: Ref<HTMLDivElement>
	flowProps: FlowProps
	children: ReactNode
}

export function GraphFlowCanvas({
	nodesStore,
	edges,
	flowRef,
	flowProps,
	children,
}: GraphFlowCanvasProps) {
	const nodes = useStore(nodesStore, state => state.xfNodes)

	return (
		<ReactFlow
			ref={flowRef}
			nodes={nodes as GraphXfNode[]}
			edges={edges as GraphXfEdge[]}
			nodeTypes={nodeTypes}
			edgeTypes={edgeTypes}
			defaultEdgeOptions={defaultEdgeOptions}
			connectionLineComponent={ConnectionLine}
			connectionLineStyle={connectionLineStyle}
			{...flowProps}
		>
			<Background />
			{children}
		</ReactFlow>
	)
}
