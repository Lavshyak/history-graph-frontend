import { Handle, type NodeProps, Position, useConnection } from '@xyflow/react'
import { Button, Collapse, Flex } from 'antd'
import { type CSSProperties, useContext, useMemo, useState } from 'react'

import type { XfNode } from '../../index'
import {
	NodeDatasStateManagerContext,
	useKeyedEventHandling,
	EditableContext,
} from '../../index'

const sourceHandleStyle: CSSProperties = {
	width: '100%',
	height: '50px', // задаём конкретную высоту
	background: 'blue',
	opacity: '0.1',
	left: '50%',
	top: '50%',
	position: 'absolute', // обязательно absolute
	borderRadius: 0,
	margin: 0,
	padding: 0,
}

const targetHandleStyle: CSSProperties = {
	width: '100%',
	height: '100%',
	backgroundColor: 'white',
	borderRadius: '15px',
	border: 'solid 1px',
	opacity: '0.1',
	left: '50%',
	top: '50%',
	position: 'fixed',
	zIndex: '100',
}

const styleEditableFieldInNode: CSSProperties = {
	backgroundColor: 'transparent',
	border: 'none',
	color: 'black',
	outline: 'none',
	fontFamily: 'system-ui, Avenir, Helvetica, Arial, sans-serif',
}

export function EventNode({ id: thisNodeId }: NodeProps<XfNode>) {
	const nodeDatasStateContext = useContext(NodeDatasStateManagerContext)
	const initialData = useMemo(
		() => nodeDatasStateContext.allNodeDatasMap.get(thisNodeId),
		[nodeDatasStateContext, thisNodeId],
	)

	const [data, setData] = useState(initialData)
	const [isEdit, setIsEdit] = useState<boolean>(false)

	useKeyedEventHandling(
		nodeDatasStateContext.nodesStateEvents.nodeDataUpdatedEvent,
		thisNodeId,
		({ newNodeData }) => {
			setData(newNodeData)
		},
	)

	const connection = useConnection()

	const isTarget =
		connection.inProgress && connection.fromNode.id !== thisNodeId

	const isEditable = useContext(EditableContext)

	if (!data) {
		return <>no data for node id {thisNodeId}</>
	}

	const handleChangeEditEventNode = (
		editableField: string,
		editString: string,
	) => {
		nodeDatasStateContext.updateNodeData(thisNodeId, {
			[editableField]: editString,
		})
	}

	return (
		<div>
			{/* We want to disable the target handle, if the connection was started from this node */}
			{(!connection.inProgress || isTarget) && (
				<Handle
					style={targetHandleStyle}
					position={Position.Left}
					type='target'
					isConnectableStart={false}
				/>
			)}
			<div
				style={{
					color: 'black',
					minWidth: '15vh',
					alignSelf: 'center',
					alignItems: 'center',
					justifyContent: 'center',
				}}
			>
				<div
					style={{
						position: 'absolute',
						backgroundColor: data.isExplicitlyMarkedForDelete
							? 'red'
							: data.sourceOrCreated == 'created'
								? 'green'
								: 'white',
						width: '100%',
						height: '100%',
						opacity: data.isExplicitlyMarkedForDelete ? '0.1' : '0.5',
						zIndex: -1,
						borderRadius: 10,
					}}
				/>
				<div style={{ padding: '10px 10px 10px 10px' }}>
					<Flex vertical>
						<Collapse
							items={[
								{
									label: (
										<Flex vertical>
											<div>
												title:{' '}
												<input
													style={styleEditableFieldInNode}
													type='text'
													disabled={!isEdit}
													value={data.currentData.title}
													onChange={event =>
														handleChangeEditEventNode(
															'title',
															event.target.value,
														)
													}
												/>
											</div>
											<div style={{ fontSize: 11, textAlign: 'start' }}>
												id: {thisNodeId}
											</div>
										</Flex>
									),
									children: (
										<Flex vertical>
											<div>
												description:
												<input
													style={styleEditableFieldInNode}
													type='text'
													disabled={!isEdit}
													value={data.currentData.description}
													onChange={event =>
														handleChangeEditEventNode(
															'description',
															event.target.value,
														)
													}
												/>
											</div>
											<div>
												label:{' '}
												<input
													style={styleEditableFieldInNode}
													type='text'
													disabled={!isEdit}
													value={data.currentData.label}
													onChange={event =>
														handleChangeEditEventNode(
															'label',
															event.target.value,
														)
													}
												/>
											</div>
											<div>
												keywords:
												<input
													style={styleEditableFieldInNode}
													type='text'
													disabled={!isEdit}
													value={`[${data.currentData.keywords}]`}
													onChange={event =>
														handleChangeEditEventNode(
															'keywords',
															event.target.value.replace(/[\[\]]/g, ''),
														)
													}
												/>
											</div>
											<div>
												timeFrom: {data.currentData.timeFrom.toISOString()}
											</div>
											<div>timeTo: {data.currentData.timeTo.toISOString()}</div>
											<Button
												disabled={!isEditable}
												onClick={() => {
													nodeDatasStateContext.markNodeForDelete(
														thisNodeId,
														!data.isExplicitlyMarkedForDelete,
													)
												}}
											>
												{data.isExplicitlyMarkedForDelete
													? 'undo delete'
													: 'delete'}
											</Button>
											<Button
												style={{ marginTop: '0.5rem' }}
												onClick={() => setIsEdit(!isEdit)}
											>
												{isEdit ? 'save' : 'edit'}
											</Button>
										</Flex>
									),
								},
							]}
						/>
						<div
							style={{
								position: 'relative',
								width: '100%',
								height: '50px',
							}}
						>
							{/* If handles are conditionally rendered and not present initially, you need to update the node internals https://reactflow.dev/docs/api/hooks/use-update-node-internals/ */}
							{/* In this case we don't need to use useUpdateNodeInternals, since !isConnecting is true at the beginning and all handles are rendered initially. */}
							{!connection.inProgress && (
								<Handle
									style={sourceHandleStyle}
									position={Position.Top}
									type='source'
									/*isConnectableStart={true}*/
									isConnectableStart={isEditable}
								/>
							)}
						</div>
					</Flex>
				</div>
			</div>
		</div>
	)
}
