import {useRef} from "react";
import {isDevLoggingEnabled} from "@/shared/dev/isDevLoggingEnabled.ts";

export function createRenderCountDict(context?: string) {
    const dictionary: Map<string, { rc: number, deps?: object }> = new Map()

    return {
        increaseRenderCountDict: (context: string, deps?: object, isThisEnabled?: boolean) => {
            if (!isDevLoggingEnabled || !isThisEnabled) {
                return;
            }
            const value = dictionary.get(context)
            if (value) {
                value.deps = deps
                value.rc += 1
                //dictionary.set(context, value+1)
            } else {
                dictionary.set(context, {rc: 1, deps: value})
            }

        },
        renderCountDictView: (props:{isThisEnabled?: boolean}) => {
            if (!isDevLoggingEnabled || !props.isThisEnabled) {
                return <></>
            }

            return <div>
                {[...dictionary.entries()].map(entry => {
                    return <div>
                        {entry[0]}: {entry[1].rc} ({JSON.stringify(entry[1].deps)})
                    </div>
                })}
            </div>
        },
        renderCountDictLogToConsole: (isThisEnabled?: boolean) => {
            if(!isDevLoggingEnabled || !isThisEnabled){
                return;
            }
            if (context) {
                console.log("-- ", context, " --")
            }
            for (const entry of dictionary.entries()) {
                console.log(`${entry[0]}: ${entry[1].rc} (${JSON.stringify(entry[1].deps)})`)
            }
        },
        increaseRenderCountDictAndLogToConsole: (isThisEnabled?: boolean) => {
            if(!isDevLoggingEnabled || !isThisEnabled){
                return;
            }
            if (context) {
                console.log("-- ", context, " --")
            }
            for (const entry of dictionary.entries()) {
                console.log(`${entry[0]}: ${entry[1].rc} (${JSON.stringify(entry[1].deps)})`)
            }
        }
    }
}

export function useRenderCountDictRef() {
    return useRef(createRenderCountDict()).current
}