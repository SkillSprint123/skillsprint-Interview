import type { InjectionKey } from 'vue'
import type { NanoContext as ModuleContext } from '@skillsprint/contracts'

export const contextKey: InjectionKey<ModuleContext> = Symbol('interview-context')
