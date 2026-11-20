import { useContext, useState, useMemo, useEffect, useRef } from 'react'
import { NodeDatasStateManagerContext } from '@/model/graph/nodeDatasStateManagerContext.ts'
import { Collapse, Flex } from 'antd'
import { useToggleStore } from '@/shared/UiStore/useToggleStore.ts'

import sort from '@/shared/assets/sort.svg'
import '@/widgets/SortAndSearchPanel/style.css'

// Сколько результатов рисуем в панели. Каждый результат — отдельный antd
// Collapse; на графе в 1000 нод открытие панели строило 1000 компонентов и
// перерисовывало их на каждый символ в поиске.
const SEARCH_RESULT_LIMIT = 200

export default function SortAndSearchPanel() {
	const nodeDatasStateManager = useContext(NodeDatasStateManagerContext)

	const initialData = useMemo(
		() => Array.from(nodeDatasStateManager.allNodeDatasMap.values()),
		[nodeDatasStateManager],
	)

	const [data, setData] = useState(initialData.map(el => el.currentData))
	const [search, setSearch] = useState<string>('')
	const [operand, setOperand] = useState<boolean>(false)
	const ref = useRef<HTMLDivElement>(null)

	const toggleOpenPanelSearchAndSort = useToggleStore(
		state => state.toggleOpenPanelSearchAndSort,
	)

	useEffect(() => {
		setData(
			initialData
				.map(el => el.currentData)
				.sort(
					(a, b) => new Date(a.timeTo).getTime() - new Date(b.timeTo).getTime(),
				),
		)
	}, [initialData])

	const onChangeClosePanel = (event: React.MouseEvent<HTMLDivElement>) => {
		const ref_ = ref.current
		if (ref && event.target instanceof Node && event.target.contains(ref_)) {
			toggleOpenPanelSearchAndSort(false) // close panel (state from zustand)
		}
	}

	useEffect(() => {
		const searchLowerCaseAndTrim = search.toLowerCase().trim()

		const findSearch = initialData
			.map(el => el.currentData)
			.filter(
				obj =>
					obj.title.toLowerCase().trim().includes(searchLowerCaseAndTrim) ||
					obj.description
						.toLowerCase()
						.trim()
						.includes(searchLowerCaseAndTrim) ||
					obj.keywords.some(el =>
						el.toLowerCase().trim().includes(searchLowerCaseAndTrim),
					),
			)

		setData(
			findSearch.sort((a, b) =>
				operand
					? b.timeTo.getTime() - a.timeTo.getTime()
					: a.timeTo.getTime() - b.timeTo.getTime(),
			),
		)
	}, [operand, search, initialData])

	return (
		<div
			ref={ref}
			className='container-panel'
			style={{
				width: '100%',
				height: '100%',
				position: 'relative',
				zIndex: '1000',
			}}
			onClick={event => onChangeClosePanel(event)}
		>
			<div
				className='panel'
				style={{
					position: 'absolute',
					right: '3rem',
					top: '50%',
					transform: 'translateY(-50%)',
					width: '30%',
					height: '80%',
					backgroundColor: '#ffffff',
					boxShadow: '0px 0px 30px #aaaaaa',
					borderRadius: '2rem',
					overflowY: 'scroll',
					overflowX: 'hidden',
					scrollbarColor: '#aaaaaa #ffffff',
					scrollbarWidth: 'thin',
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'center',
				}}
			>
				<div className='panel-header' style={{ display: 'flex', width: '90%' }}>
					<input
						style={{
							width: '80%',
							margin: '1rem',
							backgroundColor: 'transparent',
							outline: 'none',
							border: '1px solid #aaa',
							borderRadius: '0.9rem',
							padding: '10px',
							color: '#797979',
							fontFamily: 'system-ui, Avenir, Helvetica, Arial, sans-serif',
						}}
						placeholder='Search...'
						value={search}
						onChange={e => setSearch(e.target.value.toLowerCase())}
					/>
					<img
						src={sort}
						alt='sort'
						className={`panel-sort_icon ${operand ? 'panel-sort_icon-revert' : 'panel-sort_icon-norevert'}`}
						width={18}
						style={{ cursor: 'pointer', transition: 'all 0.3s ease' }}
						onClick={() => setOperand(!operand)}
					/>
				</div>
				<ul
					className='panel-list'
					style={{
						height: '100%',
						padding: '0 2rem',
						margin: '0',
						width: '85%',
					}}
				>
					{data.slice(0, SEARCH_RESULT_LIMIT).map(el => (
						<Collapse
							style={{ marginBottom: '1rem' }}
							key={el.id}
							items={[
								{
									label: (
										<Flex vertical>
											<div>title: {el.title}</div>
										</Flex>
									),
									children: (
										<Flex vertical>
											<div>description: {el.description}</div>
											<div>label: {el.label}</div>
											<div>keywords: [{el.keywords.join(', ')}]</div>
											<div>timeFrom: {el.timeFrom.toISOString()}</div>
											<div>timeTo: {el.timeTo.toISOString()}</div>
										</Flex>
									),
								},
							]}
						/>
					))}
					{data.length > SEARCH_RESULT_LIMIT && (
						<li style={{ color: '#797979', padding: '0.5rem 0', listStyle: 'none' }}>
							показано {SEARCH_RESULT_LIMIT} из {data.length} — уточните запрос
						</li>
					)}
				</ul>
			</div>
		</div>
	)
}
