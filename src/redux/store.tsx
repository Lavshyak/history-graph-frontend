import { configureStore } from '@reduxjs/toolkit'
import ToggleSlice from './slice/toggleSlice'

export const store = configureStore({
	reducer: {
		ToggleSlice: ToggleSlice,
	},
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
