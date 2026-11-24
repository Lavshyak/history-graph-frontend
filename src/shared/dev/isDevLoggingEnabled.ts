export const isDevLoggingEnabled = false

export function devLog(context: string, isThisEnabled: boolean){
    if(!isThisEnabled || !isDevLoggingEnabled){
        return;
    }
    console.log(context)
}