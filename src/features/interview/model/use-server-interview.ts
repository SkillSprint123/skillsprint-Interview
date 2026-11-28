import {StatusCodes} from 'http-status-codes'
import {computed, onMounted, onScopeDispose, ref} from 'vue'
import {
    createInterviewApi,
    hasInterviewHttpStatus,
    interviewErrorMessage,
} from './interview-api.ts'
import {serverAnswerSchema} from './schemas.ts'
import type {Feedback, GoalInput, InterviewSession, SessionPhase} from './types.ts'

export function useServerInterview(apiBaseUrl: string) {
    const api = createInterviewApi(apiBaseUrl, updateOverview)
    const phase = ref<SessionPhase>('loading')
    const index = ref(0)
    const answer = ref('')
    const error = ref('')
    const session = ref<InterviewSession>()
    const questions = computed(
        () =>
            session.value?.questions.map((item) => ({
                id: String(item.id),
                prompt: item.text,
                topic: '',
                task: '',
            })) ?? [],
    )
    const question = computed(() => questions.value[index.value])
    const results = computed<Feedback[]>(
        () =>
            session.value?.questions.flatMap((item) =>
                item.answer === null
                    ? []
                    : [
                        {
                            questionId: String(item.id),
                            answer: item.answer,
                            reference: item.feedback ?? '',
                            mentioned: [],
                            toReview: [],
                        },
                    ],
            ) ?? [],
    )
    const feedback = computed(() => results.value[index.value])
    let pending: AbortController | undefined
    let uncertainAnswer:
        | { sessionId: number; questionId: number; draft: string; message: string }
        | undefined

    onScopeDispose(() => pending?.abort())

    function updateOverview() {
        window.dispatchEvent(new Event('skillsprint:progress'))
    }

    async function perform(action: (signal: AbortSignal) => Promise<void>) {
        if (pending) return
        error.value = ''
        const controller = new AbortController()
        pending = controller
        try {
            await action(controller.signal)
        } finally {
            pending = undefined
        }
    }

    function showSession(state: InterviewSession) {
        session.value = state
        answer.value = ''
        if (state.status === 'completed') {
            phase.value = 'complete'
            return
        }
        index.value = state.current_position - 1
        phase.value = 'answering'
    }

    async function loadLatest(signal: AbortSignal) {
        try {
            const state = await api.loadLatest(signal)
            if (!signal.aborted) showSession(state)
        } catch (cause) {
            if (signal.aborted) return
            if (hasInterviewHttpStatus(cause, StatusCodes.NOT_FOUND)) {
                session.value = undefined
                phase.value = 'ready'
            } else {
                error.value = interviewErrorMessage(cause)
                phase.value = 'unavailable'
                return false
            }
        }
        return !signal.aborted
    }

    function restore() {
        return perform(async (signal) => {
            phase.value = 'loading'
            await loadLatest(signal)
        })
    }

    function restart() {
        return perform(async (signal) => {
            const previous = session.value?.id
            phase.value = 'loading'
            try {
                const state = await api.startSession(signal)
                if (!signal.aborted) showSession(state)
            } catch (cause) {
                if (signal.aborted) return
                if (hasInterviewHttpStatus(cause, StatusCodes.CONFLICT)) {
                    phase.value = 'goal'
                    return
                }
                // A response can be lost after the server has created the interview.
                const restored = await loadLatest(signal)
                if (restored && session.value?.id === previous) {
                    error.value = interviewErrorMessage(cause)
                }
            }
        })
    }

    function saveGoal(goal: GoalInput) {
        return perform(async (signal) => {
            phase.value = 'saving-goal'
            try {
                await api.saveGoal(goal, signal)
                if (signal.aborted) return
                phase.value = 'ready'
                updateOverview()
            } catch (cause) {
                if (signal.aborted) return
                error.value = interviewErrorMessage(cause)
                phase.value = 'goal'
            }
        })
    }

    function showFeedback(state: InterviewSession, questionId: number) {
        const accepted = state.questions.find((item) => item.id === questionId)
        if (accepted?.answer == null) return false
        session.value = state
        index.value = accepted.position - 1
        answer.value = accepted.answer
        phase.value = 'feedback'
        updateOverview()
        return true
    }

    async function reconcileAnswer(signal: AbortSignal) {
        if (!uncertainAnswer) return
        const {sessionId, questionId, draft, message} = uncertainAnswer
        try {
            const state = await api.loadSession(sessionId, signal)
            if (signal.aborted) return
            uncertainAnswer = undefined
            if (showFeedback(state, questionId)) {
                if (answer.value !== draft) error.value = 'Для этого вопроса уже сохранён другой ответ.'
                return
            }
            showSession(state)
            if (state.questions[index.value]?.id === questionId) answer.value = draft
            error.value = message
        } catch (cause) {
            if (signal.aborted) return
            error.value = interviewErrorMessage(cause)
            if (hasInterviewHttpStatus(cause, StatusCodes.NOT_FOUND)) {
                uncertainAnswer = undefined
                phase.value = 'unavailable'
            } else {
                phase.value = 'syncing'
            }
        }
    }

    function retrySync() {
        return perform(async (signal) => {
            phase.value = 'loading'
            await reconcileAnswer(signal)
        })
    }

    async function submit() {
        const current = session.value
        const questionId = current?.questions[index.value]?.id
        if (!current || questionId === undefined || phase.value !== 'answering') return
        const parsed = serverAnswerSchema.safeParse(answer.value)
        if (!parsed.success) {
            error.value = parsed.error.issues[0]?.message ?? 'Проверь ответ.'
            return
        }
        const draft = parsed.data
        await perform(async (signal) => {
            phase.value = 'submitting'
            try {
                const state = await api.submitAnswer(current.id, questionId, draft, signal)
                if (signal.aborted) return
                if (!showFeedback(state, questionId)) showSession(state)
            } catch (cause) {
                if (signal.aborted) return
                if (hasInterviewHttpStatus(cause, StatusCodes.BAD_REQUEST, StatusCodes.UNAUTHORIZED)) {
                    phase.value = 'answering'
                    error.value = interviewErrorMessage(cause)
                    return
                }
                uncertainAnswer = {
                    sessionId: current.id,
                    questionId,
                    draft,
                    message: interviewErrorMessage(cause),
                }
                await reconcileAnswer(signal)
            }
        })
    }

    function next() {
        if (phase.value !== 'feedback' || !session.value) return
        error.value = ''
        showSession(session.value)
    }

    onMounted(() => void restore())
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
        questions,
        session,
        restore,
        saveGoal,
        retrySync,
    }
}
