import {isDevLoggingEnabled} from "@/shared/dev/isDevLoggingEnabled.ts";

export default function devInvokeIfDevLoggingEnabled(action: ()=>void, isThisEnabled?: boolean) {
    if(isDevLoggingEnabled && isThisEnabled){
        action()
    }
}