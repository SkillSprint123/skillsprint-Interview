import type { InjectionKey } from 'vue'
import type { CssFunction } from './types'

export const cssKey: InjectionKey<CssFunction> = Symbol('interview-css')
