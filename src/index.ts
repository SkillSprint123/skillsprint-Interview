import type {
  NanoContext as ModuleContext,
  NanoInstance as ModuleInstance,
} from '@skillsprint/contracts'
import { mountInterview } from './app/mount'
import InterviewPage from './features/interview/ui/InterviewPage.vue'

type StandNavigation = { push: (path: string) => void }

let standaloneInstance: ModuleInstance | undefined

// BroJS passes the nested default export to mount when opening the standalone app.
export default { default: InterviewPage }

export const contractVersion = 1 as const

export function mount(component: unknown, element: HTMLElement, navigation: StandNavigation): void
export function mount(element: HTMLElement, context: ModuleContext): ModuleInstance
export function mount(
  ...args:
    | [element: HTMLElement, context: ModuleContext]
    | [component: unknown, element: HTMLElement, navigation: StandNavigation]
): ModuleInstance | void {
  if (args.length === 2) return mountInterview(...args)

  const [, element, { push }] = args
  void unmount()
  standaloneInstance = mountInterview(
    element,
    { basePath: '/interview', apiBaseUrl: '/api', user: null, navigate: push },
    true,
  )
}

export function unmount() {
  const instance = standaloneInstance
  standaloneInstance = undefined
  return instance?.unmount()
}
