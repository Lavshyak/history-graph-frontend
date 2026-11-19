import { create } from 'zustand'

type ToggleState = {
	isOpenPanelSortAndSearch: boolean
	toggleOpenPanelSearchAndSort: (isOpenPanelSortAndSearch: boolean) => void
}

export const useToggleStore = create<ToggleState>(set => ({
	isOpenPanelSortAndSearch: false,
	toggleOpenPanelSearchAndSort: isOpenPanelSortAndSearch =>
		set({ isOpenPanelSortAndSearch: isOpenPanelSortAndSearch }),
}))
