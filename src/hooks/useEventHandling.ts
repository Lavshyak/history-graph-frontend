import {useEffect} from "react";
import type {EventHandler, NormalListenableEvent} from "../lib/event.ts";

export function useEventHandling<TPayload>(
    event: NormalListenableEvent<TPayload>,
    handler: EventHandler<TPayload>,
    resubscribeOnEventRefChange: boolean = true,
    resubscribeOnHandlerRefChange: boolean = false) {
    useEffect(() => {
        event.on(handler)

        return () => event.off(handler)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [resubscribeOnEventRefChange ? event : null, resubscribeOnHandlerRefChange ? handler : null])
}