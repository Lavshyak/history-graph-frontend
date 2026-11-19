import {createStore, type StateCreator} from "zustand/vanilla";
import {useRef} from "react";
import {useStore} from "zustand/react";

export function useLocalState<StateT>(initializer: StateCreator<StateT, [], [], StateT>): StateT {
    const storeRef = useRef(createStore<StateT>(initializer))
    return useStore(storeRef.current)
}