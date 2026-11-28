import { afterEach, beforeEach, describe, expect, test, jest } from '@jest/globals'
import { nextTick } from 'vue'
import type { NanoContext as ModuleContext } from '@skillsprint/contracts'
import standApp, { contractVersion, mount, unmount } from '../../src/index'

const context: ModuleContext = {
  basePath: '/interview',
  apiBaseUrl: '/api',
  user: null,
  navigate: () => {},
}

let instances: ReturnType<typeof mount>[]
let headStyleCount: number

beforeEach(() => {
  // Keep jsdom's own immediate DOM tasks real; control only application timeouts and time.
  jest.useFakeTimers({
    doNotFake: [
      'nextTick',
      'queueMicrotask',
      'setImmediate',
      'clearImmediate',
      'performance',
      'requestAnimationFrame',
      'cancelAnimationFrame',
    ],
  })
  jest.setSystemTime(new Date(2026, 9, 24, 12))
  instances = []
  headStyleCount = document.head.querySelectorAll('style').length
})

afterEach(async () => {
  for (const instance of instances) await instance.unmount()
  try {
    await unmount()
    await flushUi()
    // Flush pending DOM tasks, without advancing the interview or midnight timers.
    await jest.advanceTimersByTimeAsync(0)
    expect(jest.getTimerCount()).toBe(0)
    expect(document.head.querySelectorAll('style')).toHaveLength(headStyleCount)
  } finally {
    jest.useRealTimers()
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

function renderStandalone() {
  const target = document.createElement('div')
  document.body.append(target)
  mount(standApp.default, target, { push: context.navigate })
  return target
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
  await jest.advanceTimersByTimeAsync(650)
  await flushUi()
  const title = target.querySelector<HTMLHeadingElement>('h3[tabindex="-1"]')!
  expect(title.textContent).toBe('Разбор твоего ответа')
  expect(document.activeElement).toBe(title)
  return title
}

describe('the mounted interview', () => {
  test('leaves shell chrome to the host when mounted as a module', () => {
    const { target } = render()
    expect(target.querySelector('main')).toBeNull()
    expect(target.querySelectorAll('h1')).toHaveLength(1)
    expect(target.textContent).not.toContain('Репетиция собеседования')
    expect(target.textContent).not.toContain('Серия:')
    expect(target.textContent).not.toContain('Практикуйся в своём темпе.')
    expect(target.textContent).toContain('Ответы не отправляются на сервер.')
    expect(jest.getTimerCount()).toBe(0)
  })

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
    expect(() => mount(host, { ...context, user: undefined } as unknown as ModuleContext)).toThrow()
    expect(host.childElementCount).toBe(0)
    expect(jest.getTimerCount()).toBe(0)
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
      await jest.advanceTimersByTimeAsync(650)
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
    await jest.advanceTimersByTimeAsync(650)
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
    await jest.advanceTimersByTimeAsync(1000)
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
    jest.setSystemTime(new Date(2026, 9, 24, 23, 59, 59, 900))
    const target = renderStandalone()
    typeAnswer(target, 'Черновик ответа')
    expect(target.textContent).toContain('Суббота, 24 октября')
    expect(target.textContent).toContain('Серия: —')
    await jest.advanceTimersByTimeAsync(100)
    await flushUi()
    expect(target.textContent).toContain('Воскресенье, 25 октября')
    expect(input(target).value).toBe('Черновик ответа')
  })

  test('refreshes on tab return and removes listeners and timers on unmount', async () => {
    const target = renderStandalone()
    expect(jest.getTimerCount()).toBe(1)
    jest.setSystemTime(new Date(2026, 9, 26, 12))
    window.dispatchEvent(new Event('focus'))
    await flushUi()
    expect(target.textContent).toContain('Понедельник, 26 октября')
    jest.setSystemTime(new Date(2026, 9, 27, 12))
    document.dispatchEvent(new Event('visibilitychange'))
    await flushUi()
    expect(target.textContent).toContain('Вторник, 27 октября')
    expect(jest.getTimerCount()).toBe(1)
    await unmount()
    window.dispatchEvent(new Event('focus'))
    document.dispatchEvent(new Event('visibilitychange'))
    expect(jest.getTimerCount()).toBe(0)
  })
})

const firstServerQuestion = {
  id: 11,
  position: 1,
  text: 'Первый вопрос',
  answer: null,
  feedback: null,
  score: null,
}
const secondServerQuestion = {
  id: 12,
  position: 2,
  text: 'Второй вопрос',
  answer: null,
  feedback: null,
  score: null,
}
const serverSession = {
  id: 9,
  role: 'backend',
  current_level: 'junior',
  target_level: 'middle',
  mode: 'gigachat',
  status: 'active',
  current_position: 1,
  average_score: null,
  questions: [firstServerQuestion, secondServerQuestion],
}

const serverContext = {
  ...context,
  apiBaseUrl: '/api/go',
  user: { id: '1', displayName: 'Участник' },
}
const response = (body: unknown, status = 200) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }) as Response

function mockServer() {
  const original = globalThis.fetch
  const fetch = jest.fn<typeof globalThis.fetch>()
  globalThis.fetch = fetch
  return {
    fetch,
    restore: () => {
      globalThis.fetch = original
    },
  }
}

function mountServer(target = document.createElement('div')) {
  document.body.append(target)
  const instance = mount(target, serverContext)
  instances.push(instance)
  return { instance, target }
}

function click(target: HTMLElement, label: string) {
  const button = Array.from(target.querySelectorAll('button')).find(
    (candidate) => candidate.textContent?.trim() === label,
  )
  expect(button).toBeDefined()
  button?.click()
  return jest.advanceTimersByTimeAsync(0)
}

test('recovers an accepted answer after a network failure and restores the next question on mount', async () => {
  const accepted = {
    ...serverSession,
    current_position: 2,
    questions: [
      { ...firstServerQuestion, answer: 'Мой ответ', feedback: 'Ответ разобран', score: 0 },
      secondServerQuestion,
    ],
  }
  const { fetch, restore } = mockServer()
  fetch
    .mockResolvedValueOnce(response(serverSession))
    .mockRejectedValueOnce(new TypeError('Network failure'))
    .mockResolvedValueOnce(response(accepted))
    .mockResolvedValueOnce(response(accepted))
  try {
    const { instance, target } = mountServer()
    await jest.advanceTimersByTimeAsync(0)
    expect(target.textContent).toContain('Backend · Junior → Middle')
    enter(typeAnswer(target, 'Мой ответ'))
    await jest.advanceTimersByTimeAsync(0)
    expect(fetch.mock.calls.map(([path]) => path)).toEqual([
      '/api/go/interview-sessions/latest',
      '/api/go/interview-sessions/9/answers',
      '/api/go/interview-sessions/9',
    ])
    expect(fetch.mock.calls[1]?.[1]).toMatchObject({
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'X-SkillSprint-Request': '1' },
      body: JSON.stringify({ question_id: 11, answer: 'Мой ответ' }),
    })
    expect(target.textContent).toContain('Ответ разобран')
    expect(target.textContent).toContain('Оценка · 0 из 100')
    await instance.unmount()

    mountServer(target)
    await jest.advanceTimersByTimeAsync(0)
    expect(fetch.mock.calls[3]?.[0]).toBe('/api/go/interview-sessions/latest')
    expect(target.textContent).toContain('Второй вопрос')
    expect(input(target).value).toBe('')
  } finally {
    restore()
  }
})

test('saves the required goal, completes server demo without a score, and starts a new session', async () => {
  const demo = { ...serverSession, mode: 'demo', questions: [firstServerQuestion] }
  const completed = {
    ...demo,
    status: 'completed',
    current_position: 0,
    questions: [{ ...firstServerQuestion, answer: 'Мой ответ', feedback: 'Ответ сохранён' }],
  }
  const { fetch, restore } = mockServer()
  fetch
    .mockResolvedValueOnce(response(null, 404))
    .mockResolvedValueOnce(response(null, 409))
    .mockResolvedValueOnce(response(null, 400))
    .mockResolvedValueOnce({ ok: true, status: 204 } as Response)
    .mockResolvedValueOnce(response(demo, 201))
    .mockResolvedValueOnce(response(completed))
    .mockResolvedValueOnce(response({ ...demo, id: 10 }, 201))
  try {
    const { target } = mountServer()
    await jest.advanceTimersByTimeAsync(0)
    await click(target, 'Начать интервью')
    expect(target.textContent).toContain('Цель подготовки')
    const date = target.querySelector<HTMLInputElement>('input[type=date]')!
    date.form?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    expect(fetch).toHaveBeenCalledTimes(2)
    date.value = '2099-01-01'
    date.dispatchEvent(new Event('input', { bubbles: true }))
    await click(target, 'Сохранить цель')
    expect(target.textContent).toContain('Проверь поля формы')
    await click(target, 'Сохранить цель')
    expect(fetch.mock.calls[3]?.[0]).toBe('/api/go/goal')
    await click(target, 'Начать интервью')
    enter(input(target))
    await flushUi()
    expect(target.textContent).toContain('Напиши ответ')
    enter(typeAnswer(target, 'Мой ответ'))
    await jest.advanceTimersByTimeAsync(0)
    expect(target.textContent).toContain('Ответ сохранён')
    expect(target.textContent).not.toContain('Оценка ·')
    await click(target, 'Посмотреть итог')
    expect(target.textContent).toContain('Демо-интервью пройдено без AI-оценки')
    await click(target, 'Пройти ещё раз')
    expect(input(target).value).toBe('')
  } finally {
    restore()
  }
})

test('retries a read after provider failure and keeps the draft if no answer was stored', async () => {
  const { fetch, restore } = mockServer()
  fetch
    .mockResolvedValueOnce(response(null, 401))
    .mockResolvedValueOnce(response(serverSession))
    .mockResolvedValueOnce(response(null, 503))
    .mockResolvedValueOnce(response(null, 504))
    .mockResolvedValueOnce(response(serverSession))
    .mockResolvedValueOnce(response(null, 400))
  try {
    const { target } = mountServer()
    await jest.advanceTimersByTimeAsync(0)
    expect(target.textContent).toContain('Вход истёк')
    await click(target, 'Повторить загрузку')
    enter(typeAnswer(target, 'Черновик'))
    await jest.advanceTimersByTimeAsync(0)
    expect(target.textContent).toContain('Сервер не успел ответить')
    await click(target, 'Проверить отправку ответа')
    expect(input(target).value).toBe('Черновик')
    expect(target.textContent).toContain('Сервис AI временно недоступен')
    enter(input(target))
    await jest.advanceTimersByTimeAsync(0)
    expect(input(target).value).toBe('Черновик')
    expect(target.textContent).toContain('Проверь поля формы')
  } finally {
    restore()
  }
})

test('uses the latest session after a timeout on start and can leave a missing session', async () => {
  const { fetch, restore } = mockServer()
  fetch
    .mockResolvedValueOnce(response(null, 404))
    .mockResolvedValueOnce(response(null, 504))
    .mockResolvedValueOnce(response(serverSession))
    .mockResolvedValueOnce(response(null, 409))
    .mockResolvedValueOnce(response(null, 404))
    .mockResolvedValueOnce(response(null, 404))
  try {
    const { target } = mountServer()
    await jest.advanceTimersByTimeAsync(0)
    await click(target, 'Начать интервью')
    expect(target.textContent).toContain('Первый вопрос')
    expect(fetch.mock.calls[2]?.[0]).toBe('/api/go/interview-sessions/latest')
    enter(typeAnswer(target, 'Черновик'))
    await jest.advanceTimersByTimeAsync(0)
    expect(target.textContent).toContain('Сессия недоступна')
    await click(target, 'Повторить загрузку')
    expect(target.textContent).toContain('Начать интервью')
  } finally {
    restore()
  }
})

test('shows server and invalid response errors and can retry loading the interview', async () => {
  const { fetch, restore } = mockServer()
  const invalidJson = response(null)
  invalidJson.json = async () => {
    throw new SyntaxError('Expected JSON')
  }
  fetch
    .mockResolvedValueOnce(response(null, 500))
    .mockResolvedValueOnce(invalidJson)
    .mockResolvedValueOnce(response({ ...serverSession, current_position: 0 }))
    .mockResolvedValueOnce(response(serverSession))
  try {
    const { target } = mountServer()
    await jest.advanceTimersByTimeAsync(0)
    expect(target.textContent).toContain('Сервер не смог обработать запрос')

    await click(target, 'Повторить загрузку')
    expect(target.textContent).toContain('Сервер прислал данные в неожиданном формате')
    await click(target, 'Повторить загрузку')
    expect(target.textContent).toContain('Сервер прислал данные в неожиданном формате')

    await click(target, 'Повторить загрузку')
    expect(target.textContent).toContain('Первый вопрос')
  } finally {
    restore()
  }
})
