export function ImmutableDictionary<TKey extends string | number | symbol, TValue>(record: Readonly<Record<TKey, TValue>>): ImmutableDictionary<TKey, TValue> {
    return {
        keys: [], values: [],
        ...record
    }
}


export type ImmutableDictionary<TKey extends string | number | symbol, TValue> = Readonly<Record<TKey, TValue>> & {
    readonly values: readonly TValue[];
    readonly keys: readonly TKey[];
}