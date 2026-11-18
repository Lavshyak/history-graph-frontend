import {isDevLoggingEnabled} from "./isDevLoggingEnabled.ts";

const objectIds = new WeakMap<object, number>();
let nextId = 1;

export default function devGetOrSetObjectId(obj: object, isThisEnabled?: boolean): number {
    if(!isDevLoggingEnabled || !isThisEnabled){
        return 0
    }

    let id = objectIds.get(obj);
    if (id === undefined) {
        id = nextId++;
        objectIds.set(obj, id);
    }
    return id;
}