import {useRef} from "react";

export function useRenderCountDictRef(){
    return useRef<{[context: string]: number}>({})
}

export function useRenderCountDictIncreasing(context: string){

}

export function createRenderCountDict(){
    const dictionary : Map<string, {rc: number, deps?: never}> = new Map()

    return {
        increaseRenderCountDict: (context: string, deps? : never) => {
            const value = dictionary.get(context)
            if(value){
                value.deps = deps
                //dictionary.set(context, value+1)
            } else{
                dictionary.set(context, {rc:1, deps:value})
            }

        },
        renderCountDictView: () => <div>
            ыы
                {[...dictionary.entries()].map(entry => {
                    return <div>
                        {entry[0]}: {entry[1].rc} ({JSON.stringify(entry[1].deps)})
                    </div>
                })}
            </div>

    }
}