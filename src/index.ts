import type {
  NanoContext as ModuleContext,
  NanoInstance as ModuleInstance,
} from '@skillsprint/contracts'
import { mountInterview } from './app/mount'

export const contractVersion = 1 as const

export function mount(element: HTMLElement, context: ModuleContext): ModuleInstance {
  return mountInterview(element, context)
}
