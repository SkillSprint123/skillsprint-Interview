<script setup lang="ts">
import { computed, inject, nextTick, ref, unref, useId, watch } from 'vue'
import { Flame, Send, Sparkles } from '@lucide/vue'
import { cssKey } from '../../../shared/styles/context'
import { contextKey } from '../../../app/context'
import { useServerInterview } from '../model/use-server-interview'
import { goalInputSchema } from '../model/schemas'
import { useInterview } from '../model/use-interview'
import { useCurrentDate } from '../../../shared/composables/use-current-date'
import { createStyles } from './styles'
import type { StandaloneProp } from './types'

const props = defineProps({
  standalone: { type: Boolean as StandaloneProp, default: false },
})
const css = inject(cssKey)
if (!css) throw new Error('Interview styles must be provided by mount')
const s = createStyles(css, props.standalone)
const today = props.standalone ? useCurrentDate().today : ''
const context = inject(contextKey)
const remote =
  !props.standalone && context?.apiBaseUrl === '/api/go'
    ? useServerInterview(context.apiBaseUrl)
    : undefined
const interview = remote ?? useInterview()
const { phase, index, answer, error, results, question, feedback, submit, next, restart } =
  interview
const questions = computed(() => unref(interview.questions))
const session = computed(() => remote?.session.value)
const score = computed(() => session.value?.questions[index.value]?.score ?? null)
const roleNames = { frontend: 'Frontend', backend: 'Backend', fullstack: 'Fullstack' }
const levelNames = { junior: 'Junior', middle: 'Middle', senior: 'Senior' }
const goal = ref({
  role: 'frontend',
  current_level: 'junior',
  target_level: 'middle',
  interview_date: '',
  daily_minutes: 45,
})

function saveGoal() {
  const parsed = goalInputSchema.safeParse(goal.value)
  if (!parsed.success) {
    error.value = 'Проверь дату и время подготовки.'
    return
  }
  void remote?.saveGoal(parsed.data)
}
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
  <component
    :is="standalone ? 'main' : 'section'"
    :class="s.page"
    :aria-labelledby="pageTitleId"
    @keydown.enter="handlePageKeydown"
  >
    <div :class="s.content">
      <div v-if="standalone" :class="s.topbar">
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

      <section
        :class="s.card"
        :aria-label="remote ? 'Собеседование' : 'Демонстрационное AI-собеседование'"
      >
        <div :class="s.interviewer">
          <div :class="s.symbol">
            <Sparkles :size="18" :class="s.icon" aria-hidden="true" />
          </div>
          <div :class="s.role">
            <h2>Твой AI-интервьюер</h2>
            <p v-if="session">
              {{ roleNames[session.role] }} · {{ levelNames[session.current_level] }} →
              {{ levelNames[session.target_level] }}
            </p>
            <p v-else-if="!remote">Frontend · Junior → Middle</p>
          </div>
          <span v-if="!remote || session" :class="s.badge">{{
            session?.mode === 'gigachat' ? 'GigaChat' : 'Демосессия'
          }}</span>
        </div>

        <div v-if="phase === 'loading'" :class="s.setup" role="status">Загружаем интервью…</div>
        <form
          v-else-if="phase === 'goal' || phase === 'saving-goal'"
          :class="s.setup"
          @submit.prevent="saveGoal"
        >
          <h3>Цель подготовки</h3>
          <fieldset :class="s.goalFields" :disabled="phase === 'saving-goal'">
            <label>
              Направление
              <select v-model="goal.role">
                <option v-for="(label, value) in roleNames" :key="value" :value="value">
                  {{ label }}
                </option>
              </select>
            </label>
            <label>
              Текущий уровень
              <select v-model="goal.current_level">
                <option v-for="(label, value) in levelNames" :key="value" :value="value">
                  {{ label }}
                </option>
              </select>
            </label>
            <label>
              Целевой уровень
              <select v-model="goal.target_level">
                <option v-for="(label, value) in levelNames" :key="value" :value="value">
                  {{ label }}
                </option>
              </select>
            </label>
            <label>
              Дата собеседования
              <input v-model="goal.interview_date" type="date" required />
            </label>
            <label>
              Минут в день
              <input v-model.number="goal.daily_minutes" type="number" min="5" max="480" required />
            </label>
          </fieldset>
          <p v-if="error" :class="s.error" role="alert">{{ error }}</p>
          <button :class="s.primary" type="submit" :disabled="phase === 'saving-goal'">
            Сохранить цель
          </button>
        </form>
        <div
          v-else-if="phase === 'ready' || phase === 'unavailable' || phase === 'syncing'"
          :class="s.setup"
        >
          <p v-if="error" :class="s.error" role="alert">{{ error }}</p>
          <button v-if="phase === 'ready'" :class="s.primary" type="button" @click="restart">
            Начать интервью
          </button>
          <button
            v-else-if="phase === 'syncing'"
            :class="s.primary"
            type="button"
            @click="remote?.retrySync()"
          >
            Проверить отправку ответа
          </button>
          <button v-else :class="s.primary" type="button" @click="remote?.restore()">
            Повторить загрузку
          </button>
        </div>
        <template v-else-if="phase !== 'complete' && question">
          <div :class="s.question" aria-live="polite" aria-atomic="true">
            <p>
              Вопрос {{ index + 1 }} из {{ questions.length
              }}<template v-if="question.topic"> · {{ question.topic }}</template>
            </p>
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
              :maxlength="remote ? undefined : 5000"
              :readonly="phase !== 'answering'"
              :aria-invalid="Boolean(error)"
              :aria-describedby="`${answerHintId} ${error ? errorId : remote ? '' : demoNoteId}`"
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
            <template v-if="remote">
              <p v-if="score !== null">Оценка · {{ score }} из 100</p>
              <p :class="s.serverFeedback">{{ feedback.reference }}</p>
            </template>
            <template v-else>
              <p :class="s.muted">
                Сравни свой ответ с примером и проверь, какие темы стоит раскрыть подробнее. Разбор
                ищет ключевые слова: их наличие не подтверждает правильность объяснения, а
                отсутствие не означает ошибку.
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
            </template>
            <div :class="s.actions">
              <span :class="s.muted">Вопрос {{ index + 1 }} из {{ questions.length }}</span>
              <button type="button" :class="s.primary" aria-keyshortcuts="Enter" @click="next">
                {{ index === questions.length - 1 ? 'Посмотреть итог' : 'Следующий вопрос' }}
              </button>
            </div>
          </section>
        </template>

        <section
          v-else-if="phase === 'complete'"
          :class="s.report"
          :aria-labelledby="reportTitleId"
        >
          <h2 :id="reportTitleId" ref="reportTitle" tabindex="-1">Итоги тренировки</h2>
          <template v-if="remote">
            <p>Отвечено · {{ results.length }} из {{ questions.length }}</p>
            <p v-if="session?.average_score != null">
              Средняя оценка ·
              {{
                new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 }).format(
                  session.average_score,
                )
              }}
              из 100
            </p>
            <p v-else>Демо-интервью пройдено без AI-оценки.</p>
          </template>
          <template v-else>
            <p>Ты ответил на {{ results.length }} вопроса. Выбери темы для следующей тренировки.</p>
            <p :class="s.muted">Результаты доступны до перезагрузки или выхода из раздела.</p>
          </template>
          <p v-if="error" :class="s.error" role="alert">{{ error }}</p>
          <article
            v-for="(result, resultIndex) in results"
            :key="result.questionId"
            :class="s.reportItem"
          >
            <h3>
              {{ resultIndex + 1 }}.
              {{ remote ? questions[resultIndex]?.prompt : questions[resultIndex]?.topic }}
            </h3>
            <details :class="s.reference">
              <summary>
                {{ remote ? 'Твой ответ и разбор' : 'Сравнить твой ответ с примером' }}
              </summary>
              <blockquote>{{ result.answer }}</blockquote>
              <p :class="remote ? s.serverFeedback : undefined">{{ result.reference }}</p>
            </details>
            <p v-if="remote && session?.questions[resultIndex]?.score != null">
              Оценка · {{ session.questions[resultIndex]?.score }} из 100
            </p>
            <template v-if="!remote">
              <p v-if="result.toReview.length">
                <strong>Проверь раскрытие этих тем:</strong> {{ result.toReview.join(', ') }}.
              </p>
              <p v-else>Найдены ключевые слова всех тем. Проверь объяснение по примеру.</p>
              <p><strong>Попробуй на практике:</strong> {{ questions[resultIndex]?.task }}</p>
            </template>
          </article>
          <div :class="s.actions">
            <span :class="s.muted">Практика важнее идеального ответа</span>
            <button type="button" :class="s.primary" @click="restart">Пройти ещё раз</button>
          </div>
        </section>
      </section>

      <div :class="s.footer">
        <p v-if="standalone">Практикуйся в своём темпе.</p>
        <p v-if="!remote" :id="demoNoteId" :class="s.demoNote">
          Демосессия: 3 подготовленных вопроса и разбор по ключевым словам, без оценки нейросетью.
          Ответы не отправляются на сервер.
        </p>
      </div>
    </div>
  </component>
</template>
