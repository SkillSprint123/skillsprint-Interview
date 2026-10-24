import { afterEach, beforeEach, describe, expect, test, vi } from 'vite-plus/test'
import { nextTick } from 'vue'
import type { NanoContext } from '@skillsprint/contracts'
import { contractVersion, mount } from '../src/index'

const context: NanoContext = {
  basePath: '/interview',
  apiBaseUrl: '/api',
  user: null,
  navigate: () => {},
}

let instances: ReturnType<typeof mount>[]
let headStyleCount: number

beforeEach(() => {
  // Keep jsdom's own immediate DOM tasks real; control only application timeouts and time.
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] })
  vi.setSystemTime(new Date(2026, 9, 24, 12))
  instances = []
  headStyleCount = document.head.querySelectorAll('style').length
})

afterEach(async () => {
  for (const instance of instances) await instance.unmount()
  try {
    await flushUi()
    // Flush pending DOM tasks, without advancing the interview or midnight timers.
    await vi.advanceTimersByTimeAsync(0)
    expect(vi.getTimerCount()).toBe(0)
    expect(document.head.querySelectorAll('style')).toHaveLength(headStyleCount)
  } finally {
    vi.useRealTimers()
    document.body.replaceChildren()
  }
})

async function flushUi() {
  await nextTick()
  // The focus watcher resumes after Vue has patched the new question/report.
  await nextTick()
}

function render(target = document.createElement('div')) {
  document.body.append(target)
  const instance = mount(target, context)
  instances.push(instance)
  return { target, instance }
}

function input(target: HTMLElement) {
  return target.querySelector('textarea')!
}

function typeAnswer(target: HTMLElement, value: string) {
  const field = input(target)
  field.value = value
  field.dispatchEvent(new Event('input', { bubbles: true }))
  return field
}

function enter(target: HTMLElement, options: KeyboardEventInit = {}) {
  const event = new KeyboardEvent('keydown', {
    key: 'Enter',
    bubbles: true,
    cancelable: true,
    ...options,
  })
  target.dispatchEvent(event)
  return event
}

async function reviewAnswer(target: HTMLElement, answer = 'Функция сохраняет внешние переменные.') {
  enter(typeAnswer(target, answer))
  await flushUi()
  expect(target.querySelector('button')?.disabled).toBe(true)
  await vi.advanceTimersByTimeAsync(650)
  await flushUi()
  const title = target.querySelector<HTMLHeadingElement>('h3[tabindex="-1"]')!
  expect(title.textContent).toBe('Разбор твоего ответа')
  expect(document.activeElement).toBe(title)
  return title
}

describe('the mounted interview', () => {
  test('publishes the v1 contract and keeps shell content on repeated unmount', async () => {
    expect(contractVersion).toBe(1)
    const host = document.createElement('div')
    const shell = document.createElement('p')
    shell.textContent = 'Shell content'
    host.append(shell)
    const { instance } = render(host)
    expect(host.querySelector('[data-interview-styles] style')?.textContent).toBeTruthy()
    expect(host.querySelector('textarea')).not.toBeNull()
    await instance.unmount()
    await instance.unmount()
    expect([...host.children]).toEqual([shell])
  })

  test('rejects an invalid context before changing the host', () => {
    const host = document.createElement('div')
    expect(() => mount(host, { ...context, user: undefined } as unknown as NanoContext)).toThrow()
    expect(host.childElementCount).toBe(0)
    expect(vi.getTimerCount()).toBe(0)
  })

  test.each(['   ', 'x'.repeat(5001)])(
    'rejects an invalid answer without advancing',
    async (answer) => {
      const { target } = render()
      enter(typeAnswer(target, answer))
      await flushUi()
      expect(target.querySelector('[role="alert"]')?.textContent).toBeTruthy()
      expect(target.textContent).toContain('Вопрос 1 из 3')
      expect(target.querySelector('button')?.disabled).toBe(false)
      expect(document.activeElement).toBe(input(target))
      typeAnswer(target, 'Исправленный ответ')
      await flushUi()
      expect(target.querySelector('[role="alert"]')).toBeNull()
    },
  )

  test.each([{ shiftKey: true }, { isComposing: true }, { keyCode: 229 }, { repeat: true }])(
    'does not submit on Shift+Enter, IME confirmation or held Enter: %o',
    async (options) => {
      const { target } = render()
      const event = enter(typeAnswer(target, 'Ещё набираю ответ'), options)
      await flushUi()
      expect(target.querySelector('button')?.disabled).toBe(false)
      expect(target.querySelector('[role="alert"]')).toBeNull()
      if (!options.repeat) expect(event.defaultPrevented).toBe(false)
    },
  )

  test.each([{ ctrlKey: true }, { metaKey: true }])(
    'keeps the submit shortcut %o',
    async (options) => {
      const { target } = render()
      enter(typeAnswer(target, 'Мой ответ'), options)
      await flushUi()
      expect(target.querySelector('button')?.disabled).toBe(true)
      await vi.advanceTimersByTimeAsync(650)
      expect(target.querySelector('[aria-keyshortcuts="Enter"]')).not.toBeNull()
    },
  )

  test('ignores duplicate submissions while feedback is pending', async () => {
    const { target } = render()
    const field = typeAnswer(target, 'Мой ответ')
    enter(field)
    enter(field)
    target
      .querySelector('form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await vi.advanceTimersByTimeAsync(650)
    expect(target.querySelectorAll('h3[tabindex="-1"]')).toHaveLength(1)
    const title = target.querySelector<HTMLElement>('h3[tabindex="-1"]')!
    enter(title)
    await flushUi()
    expect(target.textContent).toContain('Вопрос 2 из 3')
    expect(input(target).value).toBe('')
    expect(document.activeElement).toBe(input(target))
    expect(target.querySelector('[role="alert"]')).toBeNull()
  })

  test('keeps Enter on native controls and ignores held Enter in feedback', async () => {
    const { target } = render()
    const title = await reviewAnswer(target)
    for (const options of [
      { repeat: true },
      { shiftKey: true },
      { isComposing: true },
      { altKey: true },
    ]) {
      enter(title, options)
    }
    const summary = target.querySelector('summary')!
    expect(enter(summary).defaultPrevented).toBe(false)
    const nextButton = target.querySelector<HTMLButtonElement>('[aria-keyshortcuts="Enter"]')!
    expect(enter(nextButton).defaultPrevented).toBe(false)
    await flushUi()
    expect(title.isConnected).toBe(true)
    nextButton.click()
    await flushUi()
    expect(target.textContent).toContain('Вопрос 2 из 3')
  })

  test('completes all three questions via Enter and starts a fresh session', async () => {
    const { target } = render()
    const answers = [
      'Ответ 1. Лексическое окружение, внешние переменные. Например, счётчик.',
      'Ответ 2. Синхронный код в стеке, микрозадачи Promise, таймер setTimeout.',
      'Ответ 3. Контракт API и события, изолированное состояние, отписки и очистка таймеров.',
    ]
    for (let index = 0; index < 3; index += 1) {
      const title = await reviewAnswer(target, answers[index]!)
      enter(title)
      await flushUi()
    }
    expect(target.querySelector('textarea')).toBeNull()
    expect(target.querySelectorAll('article')).toHaveLength(3)
    for (const index of [1, 2, 3]) expect(target.textContent).toContain(`Ответ ${index}`)
    expect(target.textContent).toContain('Итоги тренировки')
    expect(document.activeElement).toBe(target.querySelector('h2[tabindex="-1"]'))
    target.querySelector('button')!.click()
    await flushUi()
    expect(input(target).value).toBe('')
    expect(target.textContent).toContain('Вопрос 1 из 3')
    expect(target.querySelectorAll('article')).toHaveLength(0)
    expect(document.activeElement).toBe(input(target))
  })

  test('keeps two instances isolated and cancels requests on unmount', async () => {
    const first = render()
    const second = render()
    expect(input(first.target).id).not.toBe(input(second.target).id)
    enter(typeAnswer(first.target, 'Ответ только в первом экземпляре'))
    await flushUi()
    expect(input(second.target).value).toBe('')
    expect(second.target.querySelector('button')?.disabled).toBe(false)
    await first.instance.unmount()
    await vi.advanceTimersByTimeAsync(1000)
    expect(first.target.childElementCount).toBe(0)
    expect(input(second.target).value).toBe('')
    await reviewAnswer(second.target)
    const remounted = render(first.target)
    expect(input(remounted.target).value).toBe('')
    expect(remounted.target.textContent).toContain('Вопрос 1 из 3')
  })
})

describe('the live header date', () => {
  test('changes at local midnight without reloading the interview', async () => {
    vi.setSystemTime(new Date(2026, 9, 24, 23, 59, 59, 900))
    const { target } = render()
    typeAnswer(target, 'Черновик ответа')
    expect(target.textContent).toContain('Суббота, 24 октября')
    expect(target.textContent).toContain('Серия: —')
    await vi.advanceTimersByTimeAsync(100)
    await flushUi()
    expect(target.textContent).toContain('Воскресенье, 25 октября')
    expect(input(target).value).toBe('Черновик ответа')
  })

  test('refreshes on tab return and removes listeners and timers on unmount', async () => {
    const { target, instance } = render()
    expect(vi.getTimerCount()).toBe(1)
    vi.setSystemTime(new Date(2026, 9, 26, 12))
    window.dispatchEvent(new Event('focus'))
    await flushUi()
    expect(target.textContent).toContain('Понедельник, 26 октября')
    vi.setSystemTime(new Date(2026, 9, 27, 12))
    document.dispatchEvent(new Event('visibilitychange'))
    await flushUi()
    expect(target.textContent).toContain('Вторник, 27 октября')
    expect(vi.getTimerCount()).toBe(1)
    await instance.unmount()
    window.dispatchEvent(new Event('focus'))
    document.dispatchEvent(new Event('visibilitychange'))
    expect(vi.getTimerCount()).toBe(0)
  })
})
