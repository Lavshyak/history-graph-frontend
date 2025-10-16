export type NormalListenableEvent<TPayload> = {
    on(handler: EventHandler<TPayload>): void
    off(handler: EventHandler<TPayload>): void
}

export type NormalEvent<TPayload> = NormalListenableEvent<TPayload> & {
    emit(payload: TPayload): void
}

export type NormalKeyedListenableEvent<TPayload, TKey extends (string | null) = string> =
    NormalListenableEvent<TPayload>
    & {
    // key: undefined = on any key. not undefined = on the same key.
    onKeyed(key: TKey | undefined, handler: EventHandler<TPayload>): void
    // key: undefined = on any key. not undefined = on the same key.
    offKeyed(key: TKey | undefined, handler: EventHandler<TPayload>): void
}

export type NormalKeyedEvent<TPayload, TKey extends (string | null) = string> =
    NormalKeyedListenableEvent<TPayload, TKey>
    & {
    emit(key: TKey, payload: TPayload): void
}

export type EventHandler<TPayload> = (payload: TPayload) => void

export type NormalListenableEventsContainer<T extends Record<PropertyKey, unknown>> = {
    [K in keyof T]:
    T[K] extends NormalKeyedListenableEvent<infer P, infer K2>
        ? NormalKeyedListenableEvent<P, K2>
        : T[K] extends NormalEvent<infer P>
            ? NormalEvent<P>
            : T[K]
}

export function createNormalEvent<TPayload>(): NormalEvent<TPayload> {
    const handlers: ((payload: TPayload) => void)[] = []

    return {
        on(handler: EventHandler<TPayload>) {
            handlers.push(handler);
        },
        off(handler: EventHandler<TPayload>) {
            const callbackIndex = handlers.indexOf(
                handler
            );
            if (callbackIndex > -1)
                handlers.splice(callbackIndex, 1);
        },
        emit(payload: TPayload) {
            handlers.forEach((handler) =>
                handler(payload)
            );
        }
    }
}

export function createNormalKeyedEvent<TPayload, TKey extends (string | null) = string>(): NormalKeyedEvent<TPayload, TKey> {
    const handlers: Map<TKey, ((payload: TPayload) => void)[]> = new Map<TKey, ((payload: TPayload) => void)[]>()
    const eventForUndefinedKey = createNormalEvent<TPayload>()

    function onKeyed(key: TKey | undefined, handler: EventHandler<TPayload>) {
        if (key === undefined) {
            eventForUndefinedKey.on(handler)
        } else {
            let handlersOfKey = handlers.get(key)
            if (!handlersOfKey) {
                handlersOfKey = []
                handlers.set(key, handlersOfKey)
            }
            handlersOfKey.push(handler)
        }
    }

    function offKeyed(key: TKey | undefined, handler: EventHandler<TPayload>) {
        if (key === undefined) {
            eventForUndefinedKey.off(handler)
        } else {
            const handlersOfKey = handlers.get(key)
            if (!handlersOfKey) return;

            const callbackIndex = handlersOfKey.indexOf(
                handler
            );
            if (callbackIndex > -1)
                handlersOfKey.splice(callbackIndex, 1);
        }
    }

    return {
        onKeyed,
        on(handler: EventHandler<TPayload>){
            onKeyed(undefined, handler)
        },
        offKeyed,
        off(handler: EventHandler<TPayload>){
            offKeyed(undefined, handler)
        },
        emit(key: TKey, payload: TPayload) {
            eventForUndefinedKey.emit(payload)

            const handlersOfKey = handlers.get(key)
            if (handlersOfKey){
                handlersOfKey.forEach((handler) =>
                    handler(payload)
                );
            }
        }
    }
}

/*
const nodeChangedEvent = createNormalKeyedEvent<{ nodeId: string }, string | null>()

nodeChangedEvent.on(null, ({nodeId}) => console.log(nodeId))
nodeChangedEvent.on("www", ({nodeId}) => console.log(nodeId))
nodeChangedEvent.on(undefined, ({nodeId}) => console.log(nodeId))

nodeChangedEvent.emit(null, {nodeId: "2"})
nodeChangedEvent.emit("www", {nodeId: "2"})

const events = {
    entityChanged: createNormalEvent<{entityId: number}>(),
    somethingHappened: createNormalEvent<{what: string}>(),
    entityUpdated: createNormalKeyedEvent<{id: number}>()
}

events.somethingHappened.emit({what: "www"})
events.entityUpdated.emit("2", {id: 2})



const eventsWithOnAndOffOnly = events as NormalListenableEventsContainer<typeof events>
eventsWithOnAndOffOnly.somethingHappened.on(()=>{})
eventsWithOnAndOffOnly.entityUpdated.on("2", ()=>{})*/
