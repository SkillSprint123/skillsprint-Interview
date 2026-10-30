import type { NanoContext, NanoInstance } from '@skillsprint/contracts'
import { mountInterview } from './app/mount'

export const contractVersion = 1 as const

export function mount(element: HTMLElement, context: NanoContext): NanoInstance {
  return mountInterview(element, context)
}
