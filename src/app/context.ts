import type { InjectionKey } from 'vue'
import type { NanoContext } from '@skillsprint/contracts'
import type { CssFunction } from './types'

export const cssKey: InjectionKey<CssFunction> = Symbol('interview-css')
export const contextKey: InjectionKey<NanoContext> = Symbol('interview-context')
