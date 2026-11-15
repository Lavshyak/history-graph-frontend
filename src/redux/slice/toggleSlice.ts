import { createSlice } from '@reduxjs/toolkit'

type toggleSlice = {
	isOpenPanelSortAndSearch: boolean
}

const initialState: toggleSlice = {
	isOpenPanelSortAndSearch: false,
}

const ToggleSlice = createSlice({
	name: 'sort',
	initialState,
	reducers: {
		toggleOpenPanelSearchAndSort(state, action) {
			state.isOpenPanelSortAndSearch = action.payload
		},
	},
})

export const { toggleOpenPanelSearchAndSort } = ToggleSlice.actions
export default ToggleSlice.reducer
