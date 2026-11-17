import {useRef} from "react";

export default function RenderCountView({context, style}:{context?: string, style?: React.CSSProperties | undefined}){
    const renderCount = useRef(0);
    renderCount.current += 1
    //console.log("rc", context, renderCount.current);

    return <div style={{...style, color:"gray"}}>
        rc {context} {renderCount.current}
    </div>
}