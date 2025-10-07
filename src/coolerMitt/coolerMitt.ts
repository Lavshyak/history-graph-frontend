export type CoolerMittEventsBase = {
    [key: string]: {
        additionalKey?: string;
        payload?: unknown;
    };
};

export type CoolerMittForListenersType<Events extends CoolerMittEventsBase> = {
    on<K extends keyof Events>(
        params: Events[K]["additionalKey"] extends string
            ? { key: K; additionalKey: Events[K]["additionalKey"] }
            : { key: K },
        handler: (payload: Events[K]["payload"]) => void
    ): void

    off<K extends keyof Events>(
        params: Events[K]["additionalKey"] extends string
            ? { key: K; additionalKey: Events[K]["additionalKey"] }
            : { key: K },
        handler: (payload: Events[K]["payload"]) => void
    ): void
}

export type CoolerMittForEmittersType<Events extends CoolerMittEventsBase> = {
    emit<K extends keyof Events>(
        params: Events[K]["additionalKey"] extends string
            ? { key: K; additionalKey: Events[K]["additionalKey"] }
            : { key: K },
        payload: Events[K]["payload"]
    ): void
}

export type CoolerMittType<Events extends CoolerMittEventsBase> =
    CoolerMittForListenersType<Events>
    & CoolerMittForEmittersType<Events>

export function coolerMitt<Events extends CoolerMittEventsBase>() : CoolerMittType<Events> {
    const handlers = new Map<string, ((payload: unknown) => void)[]>();

    function makeKey(key: string, additionalKey: string | undefined): string {
        return additionalKey ? `${key}?${additionalKey}` : key;
    }

    return {
        on<K extends keyof Events>(
            params: Events[K]["additionalKey"] extends string
                ? { key: K; additionalKey: Events[K]["additionalKey"] }
                : { key: K },
            handler: (payload: Events[K]["payload"]) => void
        ) {
            const key = makeKey(params.key as string, "additionalKey" in params ? params.additionalKey : undefined);
            const list = handlers.get(key) ?? [];
            list.push(handler);
            handlers.set(key, list);
        },

        off<K extends keyof Events>(
            params: Events[K]["additionalKey"] extends string
                ? { key: K; additionalKey: Events[K]["additionalKey"] }
                : { key: K },
            handler: (payload: Events[K]["payload"]) => void
        ) {
            const key = makeKey(params.key as string, "additionalKey" in params ? params.additionalKey : undefined);
            const list = handlers.get(key);
            if (!list)
                return
            const updated = list.filter(h => h !== handler);
            handlers.set(key, updated);
        },

        emit<K extends keyof Events>(
            params: Events[K]["additionalKey"] extends string
                ? { key: K; additionalKey: Events[K]["additionalKey"] }
                : { key: K },
            payload: Events[K]["payload"]
        ) {
            const key = makeKey(params.key as string, "additionalKey" in params ? params.additionalKey : undefined);
            const list = handlers.get(key);
            list?.forEach((h) => h(payload));
        },
    };
}


{
    type MyEvents = {
        entityChanged: {
            additionalKey: string;
            payload: string;
        };
        entitiesArrayChanged: {
            additionalKey: undefined;
            payload: undefined;
        };
    };

    const bus = coolerMitt<MyEvents>()

    bus.emit({key: "entityChanged", additionalKey: "123"}, "stateee")

    bus.on({key: "entityChanged", additionalKey: "334"}, payload => console.log(payload))

    bus.emit({key: "entitiesArrayChanged"}, undefined)

    bus.on({key: "entitiesArrayChanged"}, () => console.log())
}