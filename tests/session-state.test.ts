import { afterEach, beforeEach, expect, test, vi } from 'vite-plus/test'
import { effectScope, type EffectScope } from 'vue'
import { useInterview } from '../src/features/interview/use-interview'
import * as service from '../src/features/interview/demo-service'

let scopes: EffectScope[]

beforeEach(() => {
  vi.useFakeTimers()
  scopes = []
})

afterEach(async () => {
  for (const scope of scopes) scope.stop()
  await Promise.resolve()
  expect(vi.getTimerCount()).toBe(0)
  vi.restoreAllMocks()
  vi.useRealTimers()
})

function session() {
  const scope = effectScope()
  scopes.push(scope)
  const interview = scope.run(useInterview)!
  return { scope, ...interview }
}

test('only feedback allows advancing, and duplicate submits do not create more results', async () => {
  const interview = session()
  interview.next()
  expect(interview.index.value).toBe(0)
  interview.answer.value = 'Мой ответ'
  const pending = interview.submit()
  interview.next()
  await interview.submit()
  expect(interview.phase.value).toBe('submitting')
  expect(interview.index.value).toBe(0)
  await vi.advanceTimersByTimeAsync(650)
  await pending
  await interview.submit()
  expect(interview.results.value).toHaveLength(1)
  expect(interview.feedback.value?.answer).toBe('Мой ответ')
})

test('a failed service preserves the draft and lets the user retry', async () => {
  vi.spyOn(service, 'requestDemoFeedback').mockRejectedValueOnce(new Error('Service unavailable'))
  const interview = session()
  interview.answer.value = 'Черновик, который нельзя потерять'
  await interview.submit()
  expect(interview.phase.value).toBe('answering')
  expect(interview.error.value).toContain('Ответ сохранён')
  expect(interview.answer.value).toBe('Черновик, который нельзя потерять')
  expect(interview.results.value).toHaveLength(0)
  const retry = interview.submit()
  await vi.advanceTimersByTimeAsync(650)
  await retry
  expect(interview.phase.value).toBe('feedback')
  expect(interview.error.value).toBe('')
})

test('restart cancels the old request without losing cancellation of a newer request', async () => {
  const signals: AbortSignal[] = []
  const request = service.requestDemoFeedback
  vi.spyOn(service, 'requestDemoFeedback').mockImplementation((question, answer, signal) => {
    signals.push(signal)
    return request(question, answer, signal)
  })
  const interview = session()
  interview.answer.value = 'Первый ответ'
  const first = interview.submit()
  interview.restart()
  expect(signals[0]?.aborted).toBe(true)
  expect(interview.phase.value).toBe('answering')
  expect(interview.answer.value).toBe('')
  interview.answer.value = 'Новый ответ'
  const second = interview.submit()
  await first
  interview.scope.stop()
  expect(signals[1]?.aborted).toBe(true)
  await second
  expect(interview.results.value).toHaveLength(0)
})

test('a late successful response cannot update a disposed interview', async () => {
  let resolve: (feedback: ReturnType<typeof service.evaluateDemoAnswer>) => void = () => {
    throw new Error('Request has not started')
  }
  vi.spyOn(service, 'requestDemoFeedback').mockImplementation(
    () =>
      new Promise((done) => {
        resolve = done
      }),
  )
  const interview = session()
  interview.answer.value = 'Поздний ответ'
  const pending = interview.submit()
  interview.scope.stop()
  resolve(service.evaluateDemoAnswer(interview.question.value, 'Поздний ответ'))
  await pending
  expect(interview.results.value).toHaveLength(0)
})
