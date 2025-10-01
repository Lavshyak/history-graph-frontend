export function immutableDictionary<TKey extends string | number | symbol, TValue>(record: Readonly<Record<TKey, TValue>>): ImmutableDictionary<TKey, TValue> {
    return {
        ...record,
        keys: Object.keys(record) as TKey[],
        values: Object.values(record) as TValue[],
    }
}

export type ImmutableDictionary<TKey extends string | number | symbol, TValue> = Readonly<Record<TKey, TValue>> & {
    readonly values: readonly TValue[];
    readonly keys: readonly TKey[];
}

type Entity = {
    id: string;
    something: number
}

export function Add(initial: ImmutableDictionary<string,Entity>, newEntities: readonly Entity[]) : ImmutableDictionary<string,Entity> {
    if (newEntities.length < 1) {
        return initial;
    }

    //const result: Record<string, Entity> = {...initial} // так норм
    const result = {...initial} // так return выебывается

    newEntities.forEach(e => {
        result[e.id] = e
    })

    return immutableDictionary(result)
    // TS2322: Type
    // ImmutableDictionary<string | number, Entity | readonly Entity[] | readonly string[]>
    // is not assignable to type ImmutableDictionary<string, Entity>
}
