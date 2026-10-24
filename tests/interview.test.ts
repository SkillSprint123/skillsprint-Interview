import assert from 'node:assert/strict'
import { test } from 'vite-plus/test'
import { demoQuestions } from '../src/features/interview/demo-data.ts'
import { evaluateDemoAnswer, requestDemoFeedback } from '../src/features/interview/demo-service.ts'

test('whitespace and oversized answers are rejected', () => {
  assert.throws(() => evaluateDemoAnswer(demoQuestions[0]!, ' \n '))
  assert.throws(() => evaluateDemoAnswer(demoQuestions[0]!, 'a'.repeat(5001)))
})

test('feedback distinguishes mentioned concepts from concepts to review', () => {
  const result = evaluateDemoAnswer(
    demoQuestions[0]!,
    '  Функция сохраняет внешние переменные. Например, счётчик.  ',
  )
  assert.deepEqual(result.mentioned, ['Доступ к внешним переменным', 'Практический пример'])
  assert.deepEqual(result.toReview, ['Лексическое окружение'])
  assert.equal(result.answer, 'Функция сохраняет внешние переменные. Например, счётчик.')
  assert.equal(result.questionId, 'closures')
})

test('a long unrelated answer does not earn credit', () => {
  const result = evaluateDemoAnswer(demoQuestions[1]!, 'Не знаю. '.repeat(20))
  assert.equal(result.mentioned.length, 0)
  assert.equal(result.toReview.length, 3)
})

test('cancellation stops a pending demo request', async () => {
  const controller = new AbortController()
  const request = requestDemoFeedback(demoQuestions[0]!, 'Мой ответ', controller.signal)
  controller.abort()
  await assert.rejects(request, { name: 'AbortError' })
})

test('an already cancelled request never starts', async () => {
  const controller = new AbortController()
  controller.abort()
  await assert.rejects(requestDemoFeedback(demoQuestions[0]!, 'Мой ответ', controller.signal), {
    name: 'AbortError',
  })
})
