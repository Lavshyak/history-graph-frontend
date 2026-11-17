import {useRef} from "react";

export default function useRenderCountLogging(context?: string) {
    const renderCount = useRef(0);
    renderCount.current += 1
    console.log("rc", context, renderCount.current);
}