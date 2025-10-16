import {useEffect} from "react";
import type {EventHandler, NormalKeyedListenableEvent} from "../lib/event.ts";

export function useKeyedEventHandling<TPayload, TKey extends (string | null) = string>(
    event: NormalKeyedListenableEvent<TPayload, TKey>,
    key: TKey,
    handler: EventHandler<TPayload>,
    resubscribeOnEventRefChange: boolean = true,
    resubscribeOnHandlerRefChange: boolean = false,
    resubscribeOnKeyChange: boolean = false) {
    useEffect(() => {
        event.onKeyed(key, handler)
        return () => event.offKeyed(key, handler)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [resubscribeOnEventRefChange ? event : null, resubscribeOnHandlerRefChange ? handler : null, resubscribeOnKeyChange ? key : null])
}