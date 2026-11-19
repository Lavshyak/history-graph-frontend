import { useContext } from 'react'

import { NodeDatasStateManagerContext } from '@/model/graph/nodeDatasStateManagerContext.ts'
import { EditableContext } from '@/entities/EdgeLabelLayout/contexts.ts'

type ContextMenuParams = {
	id: string
	top: number
	left: number
	onMouseLeave?: () => void
	xSpawn: number
	ySpawn: number
	onClick: () => void
}

export function ContextMenu({
	id,
	top,
	left,
	onMouseLeave,
	xSpawn,
	ySpawn,
	...props
}: ContextMenuParams) {
	const nodeDatasStateManager = useContext(NodeDatasStateManagerContext)
	const isEditable = useContext(EditableContext)


	return (
		<div
			onMouseLeave={onMouseLeave}
			style={{
				zIndex: 1000,
				left: left,
				top: top,
				transform: 'translate(-50%, -50%)',
				position: 'absolute',
				backgroundColor: 'chocolate',
			}}
			className='context-menu'
			{...props}
		>
			<p style={{ margin: '0.5em' }}>
				<small>node: {id}</small>
			</p>
			<button
				disabled={!isEditable}
				onClick={() => {
					console.log('create, advPos ', { x: xSpawn, y: ySpawn })
					nodeDatasStateManager.addNodeFromCreated(
						{
							id: crypto.randomUUID(),
							label: 'default',
							description: '',
							keywords: [],
							timeFrom: new Date(),
							timeTo: new Date(),
							title: '',
						},
						{ x: xSpawn, y: ySpawn },
					)
					if (onMouseLeave) onMouseLeave()
				}}
			>
				create
			</button>
		</div>
	)
}
