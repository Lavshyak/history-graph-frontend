import {useRef} from "react";
import {isDevLoggingEnabled} from "@/shared/dev/isDevLoggingEnabled.ts";

export default function RenderCountView({context, style, isThisEnabled}:{context?: string, style?: React.CSSProperties | undefined, isThisEnabled?: boolean}){
    if(!isDevLoggingEnabled || !isThisEnabled){
        return <></>
    }

    // eslint-disable-next-line react-hooks/rules-of-hooks
    const renderCount = useRef(0);
    renderCount.current += 1
    //console.log("rc", context, renderCount.current);

    return <div style={{...style, color:"gray"}}>
        rc {context} {renderCount.current}
    </div>
}