import {useRef} from "react";
import {isDevLoggingEnabled} from "./isDevLoggingEnabled.ts";

export default function useDevRenderCountLogging(context?: string, isThisEnabled?: boolean) {
    if(!isDevLoggingEnabled || !isThisEnabled){
        return;
    }
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const renderCount = useRef(0);
    renderCount.current += 1
    console.log("rc", context, renderCount.current);
}