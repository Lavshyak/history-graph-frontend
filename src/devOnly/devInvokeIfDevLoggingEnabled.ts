import {isDevLoggingEnabled} from "./isDevLoggingEnabled.ts";

export default function devInvokeIfDevLoggingEnabled(action: ()=>void, isThisEnabled?: boolean) {
    if(isDevLoggingEnabled && isThisEnabled){
        action()
    }
}