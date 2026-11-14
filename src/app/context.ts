import type { InjectionKey } from 'vue'
import type { NanoContext } from '@skillsprint/contracts'

export const contextKey: InjectionKey<NanoContext> = Symbol('interview-context')
