import { computed, onScopeDispose, ref } from 'vue'
import { demoQuestions } from './demo-data.ts'
import { requestDemoFeedback } from './demo-service.ts'
import { answerSchema } from './schemas.ts'
import type { Feedback, SessionPhase } from './types.ts'

export function useInterview() {
  const phase = ref<SessionPhase>('answering')
  const index = ref(0)
  const answer = ref('')
  const error = ref('')
  const results = ref<Feedback[]>([])
  const question = computed(() => demoQuestions[index.value]!)
  const feedback = computed(() => results.value[index.value])
  let pending: AbortController | undefined

  onScopeDispose(() => pending?.abort())

  async function submit() {
    if (phase.value !== 'answering') return
    const parsed = answerSchema.safeParse(answer.value)
    if (!parsed.success) {
      error.value = parsed.error.issues[0]?.message ?? 'Проверь ответ.'
      return
    }
    error.value = ''
    phase.value = 'submitting'
    const controller = new AbortController()
    pending = controller
    try {
      const result = await requestDemoFeedback(question.value, parsed.data, controller.signal)
      if (controller.signal.aborted) return
      results.value.push(result)
      phase.value = 'feedback'
    } catch {
      if (controller.signal.aborted) return
      error.value = 'Не удалось получить разбор. Ответ сохранён в поле — попробуй ещё раз.'
      phase.value = 'answering'
    } finally {
      if (pending === controller) pending = undefined
    }
  }

  function next() {
    if (phase.value !== 'feedback') return
    if (index.value === demoQuestions.length - 1) {
      phase.value = 'complete'
      return
    }
    index.value += 1
    answer.value = ''
    error.value = ''
    phase.value = 'answering'
  }

  function restart() {
    pending?.abort()
    pending = undefined
    results.value = []
    index.value = 0
    answer.value = ''
    error.value = ''
    phase.value = 'answering'
  }

  return {
    phase,
    index,
    answer,
    error,
    results,
    question,
    feedback,
    submit,
    next,
    restart,
    questions: demoQuestions,
  }
}
