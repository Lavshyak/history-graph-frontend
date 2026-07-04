import type {ReactNode} from "react";
import {useLocalState} from "../../hooks/UseLocalState.ts";
import {ForceRerenderContext, type ForceRerenderContextType} from "../../contexts/ForceRerenderContext.ts";

export function ForceRerenderContextWrapper({children}: { children: ReactNode }) {
    const value = useLocalState<ForceRerenderContextType>((setState, getState, store) => ({
        forcedRerenderValue: 0,
        forceRerender: () => {
            setState((prev) => ({...prev, forcedRerenderValue: prev.forcedRerenderValue + 1}))
        }
    }));
    return <ForceRerenderContext value={value}>
        {children}
    </ForceRerenderContext>;
}