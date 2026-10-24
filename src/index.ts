import { createApp } from 'vue'
import { css } from 'goober'
import { assertNanoContext, nanoElementSchema } from '@skillsprint/contracts'
import type { NanoContext, NanoInstance } from '@skillsprint/contracts'
import InterviewPage from './pages/interview/InterviewPage.vue'
import { contextKey, cssKey } from './app/context'

export const contractVersion = 1 as const

export function mount(element: HTMLElement, context: NanoContext): NanoInstance {
  nanoElementSchema.parse(element)
  assertNanoContext(context)

  const document = element.ownerDocument
  const scope = document.createElement('div')
  scope.dataset.skillsprintInterview = ''
  const styleTarget = document.createElement('div')
  styleTarget.hidden = true
  styleTarget.dataset.interviewStyles = ''
  const host = document.createElement('div')
  scope.append(styleTarget, host)
  element.append(scope)

  const app = createApp(InterviewPage)
  app.config.idPrefix = `ss-interview-${crypto.randomUUID()}`
  const scopedCss = css.bind({ target: styleTarget })
  scope.className = scopedCss({ containerType: 'inline-size' })
  app.provide(cssKey, scopedCss)
  app.provide(contextKey, context)
  let mounted = false
  let disposed = false
  try {
    app.mount(host)
    mounted = true
  } catch (error) {
    try {
      app.unmount()
    } finally {
      scope.remove()
    }
    throw error
  }

  return {
    unmount() {
      if (disposed) return
      disposed = true
      try {
        if (mounted) app.unmount()
      } finally {
        scope.remove()
      }
    },
  }
}
