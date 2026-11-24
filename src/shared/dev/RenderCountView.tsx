import {useRef, useState} from "react";
import {isDevLoggingEnabled} from "@/shared/dev/isDevLoggingEnabled.ts";
import {createNormalEvent, type NormalEvent, type NormalListenableEvent} from "@/shared/lib/events.ts";
import {useEventHandling} from "@/shared/hooks/useEventHandling.ts";

export type devRenderCountEventType = NormalListenableEvent<[string, number]>


export function useRenderCounterEvent(context: string = "", isThisEnabled: boolean = true, otherEvents?: NormalListenableEvent<[string, number]>[]) : devRenderCountEventType {
    if (!isDevLoggingEnabled || !isThisEnabled) {
        return {on: ()=>{}, off: ()=>{}}
    }

    const renderCount = useRef(0);
    const event = useRef(createNormalEvent<[string, number]>()).current

    if (otherEvents) {
        for (const otherEvent of otherEvents) {
            useEventHandling(otherEvent, x =>
                event.emit(x)
            )
        }
    }

    renderCount.current += 1
    event.emit([context, renderCount.current])

    return event;
}

export default function RenderCountView({context, style, isThisEnabled = true}: {
    context?: string,
    style?: React.CSSProperties | undefined,
    isThisEnabled?: boolean
}) {
    if (!isDevLoggingEnabled || !isThisEnabled) {
        return <></>
    }

    // eslint-disable-next-line react-hooks/rules-of-hooks
    const renderCount = useRef(0);
    renderCount.current += 1
    //console.log("rc", context, renderCount.current);

    return <div style={{...style, color: "gray"}}>
        rc {context} {renderCount.current}
    </div>
}

export function RenderCountViewByEvent({style, isThisEnabled = true, event}: {
    context?: string,
    style?: React.CSSProperties | undefined,
    isThisEnabled?: boolean,
    event: NormalListenableEvent<[string, number]>
}) {
    if (!isDevLoggingEnabled || !isThisEnabled) {
        return <></>
    }

    const dictByRef = useRef(new Map<string, number>()).current
    const [arr, setArr] = useState<[string, number][]>([])

    useEventHandling(event, x => {
        dictByRef.set(x[0], x[1])
        setArr([...dictByRef.entries()])
    })

    //console.log("rc", context, renderCount.current);

    return <div style={{...style, color: "gray"}}>
        {arr.map((item, i) => <div key={i}>rc {item[0]} {item[1]}</div>)}

    </div>
}