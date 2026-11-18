import {useRef} from "react";

export function createRenderCountDict(context?: string) {
    const dictionary: Map<string, { rc: number, deps?: object }> = new Map()

    return {
        increaseRenderCountDict: (context: string, deps?: object) => {
            const value = dictionary.get(context)
            if (value) {
                value.deps = deps
                value.rc += 1
                //dictionary.set(context, value+1)
            } else {
                dictionary.set(context, {rc: 1, deps: value})
            }

        },
        renderCountDictView: () => <div>
            {[...dictionary.entries()].map(entry => {
                return <div>
                    {entry[0]}: {entry[1].rc} ({JSON.stringify(entry[1].deps)})
                </div>
            })}
        </div>,
        renderCountDictLogToConsole: () => {
            if(context){
                console.log("-- ", context, " --")
            }
            for (const entry of dictionary.entries()) {
                console.log(`${entry[0]}: ${entry[1].rc} (${JSON.stringify(entry[1].deps)})`)
            }
        },
        increaseRenderCountDictAndLogToConsole: () => {
            if(context){
                console.log("-- ", context, " --")
            }
            for (const entry of dictionary.entries()) {
                console.log(`${entry[0]}: ${entry[1].rc} (${JSON.stringify(entry[1].deps)})`)
            }
        }
    }
}

export function useRenderCountDictRef(){
    return useRef(createRenderCountDict()).current
}