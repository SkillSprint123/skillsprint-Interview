import { expect, test } from '@jest/globals'
import { demoQuestions } from '../../src/features/interview/demo/demo-data.ts'
import {
  evaluateDemoAnswer,
  requestDemoFeedback,
} from '../../src/features/interview/demo/demo-service.ts'

test('whitespace and oversized answers are rejected', () => {
  expect(() => evaluateDemoAnswer(demoQuestions[0]!, ' \n ')).toThrow()
  expect(() => evaluateDemoAnswer(demoQuestions[0]!, 'a'.repeat(5001))).toThrow()
})

test('feedback distinguishes mentioned concepts from concepts to review', () => {
  const result = evaluateDemoAnswer(
    demoQuestions[0]!,
    '  Функция сохраняет внешние переменные. Например, счётчик.  ',
  )
  expect(result.mentioned).toStrictEqual(['Доступ к внешним переменным', 'Практический пример'])
  expect(result.toReview).toStrictEqual(['Лексическое окружение'])
  expect(result.answer).toBe('Функция сохраняет внешние переменные. Например, счётчик.')
  expect(result.questionId).toBe('closures')
})

test('a long unrelated answer does not earn credit', () => {
  const result = evaluateDemoAnswer(demoQuestions[1]!, 'Не знаю. '.repeat(20))
  expect(result.mentioned.length).toBe(0)
  expect(result.toReview.length).toBe(3)
})

test('cancellation stops a pending demo request', async () => {
  const controller = new AbortController()
  const request = requestDemoFeedback(demoQuestions[0]!, 'Мой ответ', controller.signal)
  controller.abort()
  await expect(request).rejects.toMatchObject({ name: 'AbortError' })
})

test('an already cancelled request never starts', async () => {
  const controller = new AbortController()
  controller.abort()
  await expect(
    requestDemoFeedback(demoQuestions[0]!, 'Мой ответ', controller.signal),
  ).rejects.toMatchObject({
    name: 'AbortError',
  })
})
