import type {ReactNode} from "react";
import {useLocalState} from "@/shared/hooks/useLocalState.ts";
import {ForceRerenderContext, type ForceRerenderContextType} from "@/model/graph/forceRerenderContext.ts";
import useDevRenderCountLogging from "@/shared/dev/useRenderCountLogging.ts";

export function ForceRerenderProvider({children}: { children: ReactNode }) {
    useDevRenderCountLogging("ForceRerenderProvider")
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