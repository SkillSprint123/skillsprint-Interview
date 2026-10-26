import { assertNanoInstance, assertNanoModule } from '@skillsprint/contracts'
import type { NanoContext, NanoInstance, NanoModule } from '@skillsprint/contracts'
import * as nano from '../src/index'
import { css } from 'goober'

const fixture = document.querySelector<HTMLDivElement>('#fixture')!
const result = document.querySelector<HTMLPreElement>('#result')!
const context: NanoContext = {
  basePath: '/interview',
  apiBaseUrl: '/api',
  user: null,
  navigate: () => {},
}
let preview: NanoInstance | undefined

function check(value: unknown, message: string) {
  if (!value) throw new Error(message)
}

async function checkKeyboardFlow(container: HTMLElement) {
  for (let questionIndex = 0; questionIndex < 3; questionIndex += 1) {
    const answer = container.querySelector('textarea')!
    answer.value = 'Пример ответа для проверки перехода по Enter'
    answer.dispatchEvent(new Event('input', { bubbles: true }))
    container
      .querySelector('form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    const deadline = Date.now() + 3000
    while (!container.querySelector('[aria-keyshortcuts="Enter"]') && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 20))
    }
    check(
      container.querySelector('[aria-keyshortcuts="Enter"]'),
      `Feedback must offer a next action for question ${questionIndex + 1}`,
    )
    const title = container.querySelector<HTMLElement>('h3[tabindex="-1"]')!
    check(document.activeElement === title, 'Feedback title must receive focus')
    for (const options of [{ repeat: true }, { isComposing: true }, { shiftKey: true }]) {
      title.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Enter',
          bubbles: true,
          cancelable: true,
          ...options,
        }),
      )
      await Promise.resolve()
      check(title.isConnected, 'Held Enter, IME and Shift+Enter must not advance the question')
    }
    const summaryEnter = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
    })
    container.querySelector('summary')!.dispatchEvent(summaryEnter)
    check(
      !summaryEnter.defaultPrevented && title.isConnected,
      'Enter must preserve native summary behavior',
    )
    title.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }),
    )
    await new Promise((resolve) => setTimeout(resolve, 0))
    if (questionIndex < 2) {
      check(
        answer.value === '' && !answer.readOnly,
        'Enter must open the next question with an empty answer',
      )
      check(document.activeElement === answer, 'The next answer must receive focus')
      check(
        !container.querySelector('[role="alert"]'),
        'Advancing must not also submit an empty answer',
      )
    } else {
      check(
        !container.querySelector('textarea'),
        'Enter after the last question must open the report',
      )
      check(
        document.activeElement === container.querySelector('h2[tabindex="-1"]'),
        'The report must receive focus',
      )
    }
  }
}

async function runLifecycle(module: NanoModule) {
  await preview?.unmount()
  fixture.replaceChildren()
  const first = document.createElement('div')
  const second = document.createElement('div')
  fixture.append(first, second)
  const headStyles = document.head.querySelectorAll('style').length
  const instances: NanoInstance[] = []
  try {
    assertNanoModule(module)
    const a = await module.mount(first, context)
    const b = await module.mount(second, context)
    instances.push(a, b)
    assertNanoInstance(a)
    assertNanoInstance(b)
    check(first.querySelector('style')?.textContent, 'First mount must own nonempty styles')
    check(second.querySelector('style')?.textContent, 'Second mount must own nonempty styles')
    check(
      document.head.querySelectorAll('style').length === headStyles,
      'Styles must not leak to head',
    )
    const firstAnswer = first.querySelector('textarea')!
    const secondAnswer = second.querySelector('textarea')!
    check(firstAnswer.id !== secondAnswer.id, 'Instance IDs must be unique')
    const icons = first.querySelectorAll('svg[aria-hidden="true"]')
    check(icons.length === 3, 'The header, streak and send button must render icons')
    for (const icon of icons) {
      const bounds = icon.getBoundingClientRect()
      const parent = icon.parentElement!.getBoundingClientRect()
      check(bounds.width > 0 && bounds.height > 0, 'Icons must have explicit dimensions')
      check(
        Math.abs(bounds.top + bounds.height / 2 - parent.top - parent.height / 2) < 1,
        'Icons must be vertically centered in their containers',
      )
    }
    for (const options of [{ shiftKey: true }, { isComposing: true }, { keyCode: 229 }]) {
      const event = new KeyboardEvent('keydown', {
        key: 'Enter',
        bubbles: true,
        cancelable: true,
        ...options,
      })
      firstAnswer.dispatchEvent(event)
      await Promise.resolve()
      check(
        !event.defaultPrevented,
        'Newlines and IME confirmation must keep their default behavior',
      )
      check(!first.querySelector('[role="alert"]'), 'Newlines and IME confirmation must not submit')
    }
    const emptyEnter = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
    })
    firstAnswer.dispatchEvent(emptyEnter)
    await Promise.resolve()
    check(emptyEnter.defaultPrevented, 'Enter must prevent a newline when submitting')
    check(first.querySelector('[role="alert"]'), 'Enter on an empty answer must show validation')
    firstAnswer.value = 'Мой ответ'
    firstAnswer.dispatchEvent(new Event('input', { bubbles: true }))
    firstAnswer.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }),
    )
    await Promise.resolve()
    check(first.querySelector('button')?.disabled, 'Submitted request must enter pending state')
    check(secondAnswer.value === '', 'State must remain isolated')
    await a.unmount()
    await a.unmount()
    check(first.childElementCount === 0, 'Unmount must remove DOM and styles')
    check(second.querySelector('textarea'), 'Unmount must preserve the other instance')
    await new Promise((resolve) => setTimeout(resolve, 800))
    check(first.childElementCount === 0, 'Pending feedback must not restore an unmounted instance')
    await checkKeyboardFlow(second)
    await b.unmount()
    const remounted = await module.mount(first, context)
    instances.push(remounted)
    check(first.querySelector('style')?.textContent, 'Remount must restore scoped styles')
    check(first.querySelector('textarea')?.value === '', 'Remount starts a fresh session')
    await remounted.unmount()
    let rejected = false
    try {
      await module.mount(first, { ...context, user: undefined } as unknown as NanoContext)
    } catch {
      rejected = true
    }
    check(
      rejected && first.childElementCount === 0,
      'Invalid context must be rejected before mount',
    )
    result.textContent =
      'PASS: v1 exports, scoped styles, unique IDs, centered icons, Enter submission and next question/report, native summary behavior, keyboard focus, Shift+Enter and IME, empty answer validation, isolated state, pending cancellation, repeated unmount, remount, invalid context.'
  } catch (error) {
    result.textContent = `FAIL: ${String(error)}`
  } finally {
    for (const instance of instances) await instance.unmount()
    fixture.replaceChildren()
  }
}

document.querySelector('#run')!.addEventListener('click', () => {
  void runLifecycle(nano)
})
document.querySelector('#production')!.addEventListener('click', async () => {
  try {
    const entry = `/dist-nano/index.js?check=${Date.now()}`
    const module: unknown = await import(/* @vite-ignore */ entry)
    assertNanoModule(module)
    await runLifecycle(module)
  } catch (error) {
    result.textContent = `FAIL: ${String(error)}`
  }
})

async function showPreview(width: number) {
  await preview?.unmount()
  fixture.replaceChildren()
  const target = document.createElement('div')
  const styleHost = document.createElement('div')
  styleHost.hidden = true
  fixture.append(styleHost, target)
  target.className = css.bind({ target: styleHost })({ width: `${width}px`, maxWidth: '100%' })
  preview = nano.mount(target, context)
  result.textContent = `${width}px preview`
}
document.querySelector('#mobile')!.addEventListener('click', () => {
  void showPreview(375)
})
document.querySelector('#desktop')!.addEventListener('click', () => {
  void showPreview(819)
})
