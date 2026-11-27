import { createContext } from 'react'
import type { XfEdge } from '@/shared/types/xyflow.ts'

export const XfEdgesContext = createContext<readonly XfEdge[]>([])
