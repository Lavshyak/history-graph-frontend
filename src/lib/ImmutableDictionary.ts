export type ImmutableMapContainer<TKey, TValue> = {
    readonly map : ReadonlyMap<TKey,TValue>
    readonly values : readonly TValue[];
}

export function immutableMapContainerNoCopy<TKey, TValue>(map : ReadonlyMap<TKey, TValue>) : ImmutableMapContainer<TKey, TValue> {
    const values : TValue[] = [...map.values()]

    return {
        map: {...map},
        values: values
    }
}