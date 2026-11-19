import {createContext} from "react";

export type ForceRerenderContextType = {forcedRerenderValue:number, forceRerender():void}

export const ForceRerenderContext = createContext<ForceRerenderContextType>({forcedRerenderValue: 0, forceRerender: ()=>{}})