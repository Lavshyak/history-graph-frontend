import { Handle, type NodeProps, Position } from '@xyflow/react'
import { Button, Collapse, Flex } from 'antd'
import {createContext, type CSSProperties, memo, useContext, useMemo, useState} from 'react'

import type { XfNode } from '@/shared/types/xyflow.ts'
import { NodeDatasStateManagerContext } from '@/model/graph/nodeDatasStateManagerContext.ts'
import { useKeyedEventHandling } from '@/shared/hooks/useKeyedEventHandling.ts'
import { EditableContext } from '@/entities/EdgeLabelLayout/contexts.ts'
import RenderCountView from '@/shared/dev/RenderCountView.tsx'
import {devLog} from "@/shared/dev/isDevLoggingEnabled.ts";
import type {NormalListenableEvent, NormalListenableEventsContainer} from "@/shared/lib/events.ts";
import {useEventHandling} from "@/shared/hooks/useEventHandling.ts";

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
	padding: '0',
	fontSize: '14px',
	fontFamily: 'system-ui, Avenir, Helvetica, Arial, sans-serif',
}

// memo: после измерения нод xyflow перерисовывает все NodeWrapper'ы, а внутри
// у нас тяжёлый antd Collapse. На графе в 1000 нод эта волна ре-рендеров давала
// ~секунду блокировки сразу после монтирования.
export const EventNode = memo(EventNode1)

/* Подписка только на то, что реально нужно узлу. useConnection() подписан на
	// весь объект соединения, который меняется на каждый mousemove при
	// протягивании связи — и тогда перерисовывались бы ВСЕ ноды графа.
	// Одна подписка вместо двух: возвращаем либо null (соединения нет), либо id
	// ноды-источника. На графе в 1000 нод это вдвое меньше уведомлений на кадр.
	/*const connectionFromNodeId = useStore(state =>
		state.connection.inProgress
			? state.connection.fromNode?.id ?? ''
			: null,
	)*/
// есть процесс соединения => string, нет процесса соединения => undefined
const ConnectionFromNodeIdEventContext = createContext<NormalListenableEvent<string|undefined>>({on: ()=>{console.log("провайдер ConnectionFromNodeIdEventContext не реализован")}, off:()=>{}})

function EventNode1({ id: thisNodeId }: NodeProps<XfNode>) {
	devLog("EventNode1", true)
	const nodeDatasStateContext = useContext(NodeDatasStateManagerContext)
	const initialData = useMemo(
		() => nodeDatasStateContext.allNodeDatasMap.get(thisNodeId),
		[nodeDatasStateContext, thisNodeId],
	)

	const [data, setData] = useState(initialData)
	const [isEdit, setIsEdit] = useState<boolean>(false)

	const [connectionFromNodeId, setConnectionFromNodeId] = useState<string|undefined>(undefined)
	const isConnectionInProgress = connectionFromNodeId !== undefined
	const isTarget = isConnectionInProgress && connectionFromNodeId !== thisNodeId
	const connectionFromNodeIdEvent = useContext(ConnectionFromNodeIdEventContext)
	useEventHandling(connectionFromNodeIdEvent, v=>{
		setConnectionFromNodeId(v)
	})

	const isEditable = useContext(EditableContext)

	const handleChangeEditEventNode = (
		editableField: string,
		editString: string,
	) => {
		nodeDatasStateContext.updateNodeData(thisNodeId, {
			[editableField]: editString,
		})
	}

	const handleSaveEdit = (
		e: React.KeyboardEvent<HTMLElement>,
		editableField: string,
	) => {
		e.stopPropagation()
		if (e.key === 'Enter') {
			setIsEdit(false)
			// @ts-expect-error .value красное мол нет такого свойства там
			handleChangeEditEventNode(editableField, e.target.value)
		}
	}

	useKeyedEventHandling(
		nodeDatasStateContext.nodesStateEvents.nodeDataUpdatedEvent,
		thisNodeId,
		({ newNodeData }) => {
			setData(newNodeData)
		},
	)
	if (!data) {
		return <>no data for node id {thisNodeId}</>
	}

	return (
		<div>
			{/* We want to disable the target handle, if the connection was started from this node */}
			{(!isConnectionInProgress || isTarget) && (
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
											<RenderCountView />
											<div style={{ textAlign: 'start' }}>
												title:{' '}
												{isEdit ? (
													<input
														style={styleEditableFieldInNode}
														type='text'
														value={data.currentData.title}
														onChange={event =>
															handleChangeEditEventNode(
																'title',
																event.target.value,
															)
														}
														onKeyDown={e => handleSaveEdit(e, 'title')}
													/>
												) : (
													<span style={styleEditableFieldInNode}>
														{data.currentData.title}
													</span>
												)}
											</div>
											<div style={{ fontSize: 11, textAlign: 'start' }}>
												id: {thisNodeId}
											</div>
										</Flex>
									),
									children: (
										<Flex vertical align='flex-start'>
											<div>
												description:
												{isEdit ? (
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
														onKeyDown={e => handleSaveEdit(e, 'description')}
													/>
												) : (
													<span style={styleEditableFieldInNode}>
														{data.currentData.description}
													</span>
												)}
											</div>
											<div>
												label:{' '}
												{isEdit ? (
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
														onKeyDown={e => handleSaveEdit(e, 'label')}
													/>
												) : (
													<span style={styleEditableFieldInNode}>
														{data.currentData.label}
													</span>
												)}
											</div>
											<div>
												keywords:
												{isEdit ? (
													<input
														style={styleEditableFieldInNode}
														type='text'
														disabled={!isEdit}
														value={`[${data.currentData.keywords}]`}
														onChange={event =>
															handleChangeEditEventNode(
																'keywords',
																// ругается на символ \. хз что это.
																// eslint-disable-next-line no-useless-escape
																event.target.value.replace(/[\[\]]/g, ''),
															)
														}
														onKeyDown={e => handleSaveEdit(e, 'keywords')}
													/>
												) : (
													<span style={styleEditableFieldInNode}>
														{`[${data.currentData.keywords}]`}
													</span>
												)}
											</div>
											<div>
												timeFrom: {data.currentData.timeFrom.toISOString()}
											</div>
											<div>timeTo: {data.currentData.timeTo.toISOString()}</div>
											<div>sourceOrCreated: {data.sourceOrCreated}</div>
											<div
												style={{
													display: 'flex',
													flexDirection: 'column',
													width: '100%',
												}}
											>
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
											</div>
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
							{!isConnectionInProgress && (
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
