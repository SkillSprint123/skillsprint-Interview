<script setup lang="ts">
import { inject, nextTick, ref, useId, watch } from 'vue'
import { Flame, Send, Sparkles } from '@lucide/vue'
import { cssKey } from '../../app/context'
import { useInterview } from '../../features/interview/use-interview'
import { useCurrentDate } from '../../shared/use-current-date'
import { createStyles } from './styles'

const css = inject(cssKey)
if (!css) throw new Error('Interview styles must be provided by mount')
const s = createStyles(css)
const { today } = useCurrentDate()
const {
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
  questions,
} = useInterview()
const input = ref<HTMLTextAreaElement>()
const feedbackTitle = ref<HTMLHeadingElement>()
const reportTitle = ref<HTMLHeadingElement>()
const id = useId()
const pageTitleId = `${id}-page-title`
const answerId = `${id}-answer`
const answerHintId = `${id}-answer-hint`
const errorId = `${id}-error`
const demoNoteId = `${id}-demo-note`
const feedbackTitleId = `${id}-feedback-title`
const reportTitleId = `${id}-report-title`

watch(phase, async (value) => {
  await nextTick()
  if (value === 'feedback') feedbackTitle.value?.focus()
  if (value === 'complete') reportTitle.value?.focus()
  if (value === 'answering') input.value?.focus()
})

async function handleSubmit() {
  await submit()
  if (error.value) input.value?.focus()
}

function handleAnswerKeydown(event: KeyboardEvent) {
  if (phase.value === 'feedback') return
  // Let the input method finish composing text before treating Enter as submit.
  if (event.isComposing || event.keyCode === 229 || event.shiftKey) return
  event.preventDefault()
  if (!event.repeat) void handleSubmit()
}

function handlePageKeydown(event: KeyboardEvent) {
  if (
    phase.value !== 'feedback' ||
    event.defaultPrevented ||
    event.isComposing ||
    event.keyCode === 229 ||
    event.repeat ||
    event.shiftKey ||
    event.ctrlKey ||
    event.metaKey ||
    event.altKey
  )
    return

  // Keep native Enter behavior for buttons, links and expandable explanations.
  const target = event.target
  if (
    target instanceof Element &&
    target.closest(
      'button, a, summary, input, select, [contenteditable]:not([contenteditable="false"])',
    )
  )
    return

  event.preventDefault()
  next()
}
</script>

<template>
  <main :class="s.page" :aria-labelledby="pageTitleId" @keydown.enter="handlePageKeydown">
    <div :class="s.content">
      <div :class="s.topbar">
        <p>Репетиция собеседования</p>
        <div :class="s.date">
          <span>{{ today }}</span>
          <span
            :class="s.streak"
            aria-label="Серия занятий: нет данных"
            title="Нет данных о серии занятий"
          >
            <Flame :size="13.5" :class="s.icon" aria-hidden="true" />
            Серия: —
          </span>
        </div>
      </div>

      <header :class="s.heading">
        <h1 :id="pageTitleId">Собеседование начинается здесь</h1>
        <p>Репетируй в спокойном темпе. Уверенность придёт с практикой.</p>
      </header>

      <section :class="s.card" aria-label="Демонстрационное AI-собеседование">
        <div :class="s.interviewer">
          <div :class="s.symbol">
            <Sparkles :size="18" :class="s.icon" aria-hidden="true" />
          </div>
          <div :class="s.role">
            <h2>Твой AI-интервьюер</h2>
            <p>Frontend · Junior → Middle</p>
          </div>
          <span :class="s.badge">Демосессия</span>
        </div>

        <template v-if="phase !== 'complete'">
          <div :class="s.question" aria-live="polite" aria-atomic="true">
            <p>Вопрос {{ index + 1 }} из {{ questions.length }} · {{ question.topic }}</p>
            <p>{{ question.prompt }}</p>
          </div>

          <form :class="s.form" @submit.prevent="handleSubmit">
            <label :for="answerId" :class="s.label">Твой ответ</label>
            <textarea
              :id="answerId"
              ref="input"
              v-model="answer"
              :class="s.textarea"
              placeholder="Расскажи своими словами и приведи пример."
              maxlength="5000"
              :readonly="phase !== 'answering'"
              :aria-invalid="Boolean(error)"
              :aria-describedby="`${answerHintId} ${error ? errorId : demoNoteId}`"
              @keydown.enter="handleAnswerKeydown"
              @input="error = ''"
            />
            <p :id="answerHintId" :class="s.answerHint">
              {{
                phase === 'feedback'
                  ? 'Enter — продолжить'
                  : 'Enter — отправить · Shift+Enter — новая строка'
              }}
            </p>
            <div v-if="error" :id="errorId" :class="s.error" role="alert">{{ error }}</div>

            <div v-if="phase !== 'feedback'" :class="s.actions">
              <span :class="s.muted" aria-live="polite"
                >Вопрос {{ index + 1 }} из {{ questions.length }}</span
              >
              <button
                type="submit"
                :class="s.primary"
                :disabled="phase === 'submitting'"
                :aria-busy="phase === 'submitting'"
              >
                {{ phase === 'submitting' ? 'Готовим разбор…' : 'Отправить ответ' }}
                <Send v-if="phase !== 'submitting'" :size="15" :class="s.icon" aria-hidden="true" />
              </button>
            </div>
          </form>

          <section
            v-if="phase === 'feedback' && feedback"
            :class="s.feedback"
            :aria-labelledby="feedbackTitleId"
          >
            <h3 :id="feedbackTitleId" ref="feedbackTitle" tabindex="-1">Разбор твоего ответа</h3>
            <p :class="s.muted">
              Сравни свой ответ с примером и проверь, какие темы стоит раскрыть подробнее. Разбор
              ищет ключевые слова: их наличие не подтверждает правильность объяснения, а отсутствие
              не означает ошибку.
            </p>
            <div v-if="feedback.mentioned.length" :class="s.feedbackBlock">
              <strong>Упомянутые темы</strong>
              <ul>
                <li v-for="item in feedback.mentioned" :key="item">{{ item }}</li>
              </ul>
            </div>
            <div v-if="feedback.toReview.length" :class="s.feedbackBlock">
              <strong>Проверь раскрытие этих тем</strong>
              <ul>
                <li v-for="item in feedback.toReview" :key="item">{{ item }}</li>
              </ul>
            </div>
            <details :class="s.reference" open>
              <summary>Пример объяснения</summary>
              <p>{{ feedback.reference }}</p>
            </details>
            <div :class="s.actions">
              <span :class="s.muted">Вопрос {{ index + 1 }} из {{ questions.length }}</span>
              <button type="button" :class="s.primary" aria-keyshortcuts="Enter" @click="next">
                {{ index === questions.length - 1 ? 'Посмотреть итог' : 'Следующий вопрос' }}
              </button>
            </div>
          </section>
        </template>

        <section v-else :class="s.report" :aria-labelledby="reportTitleId">
          <h2 :id="reportTitleId" ref="reportTitle" tabindex="-1">Итоги тренировки</h2>
          <p>Ты ответил на {{ results.length }} вопроса. Выбери темы для следующей тренировки.</p>
          <p :class="s.muted">Результаты доступны до перезагрузки или выхода из раздела.</p>
          <article
            v-for="(result, resultIndex) in results"
            :key="result.questionId"
            :class="s.reportItem"
          >
            <h3>{{ resultIndex + 1 }}. {{ questions[resultIndex]?.topic }}</h3>
            <details :class="s.reference">
              <summary>Сравнить твой ответ с примером</summary>
              <blockquote>{{ result.answer }}</blockquote>
              <p>{{ result.reference }}</p>
            </details>
            <p v-if="result.toReview.length">
              <strong>Проверь раскрытие этих тем:</strong> {{ result.toReview.join(', ') }}.
            </p>
            <p v-else>Найдены ключевые слова всех тем. Проверь объяснение по примеру.</p>
            <p><strong>Попробуй на практике:</strong> {{ questions[resultIndex]?.task }}</p>
          </article>
          <div :class="s.actions">
            <span :class="s.muted">Практика важнее идеального ответа</span>
            <button type="button" :class="s.primary" @click="restart">Пройти ещё раз</button>
          </div>
        </section>
      </section>

      <footer :class="s.footer">
        <p>Практикуйся в своём темпе.</p>
        <p :id="demoNoteId" :class="s.demoNote">
          Демосессия: 3 подготовленных вопроса и разбор по ключевым словам, без оценки нейросетью.
          Ответы не отправляются на сервер.
        </p>
      </footer>
    </div>
  </main>
</template>
