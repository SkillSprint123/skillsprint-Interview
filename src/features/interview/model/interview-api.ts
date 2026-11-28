import { StatusCodes } from 'http-status-codes'
import { ZodError } from 'zod'
import { interviewSessionSchema } from './schemas.ts'
import type { GoalInput } from './types.ts'

class InterviewHttpError extends Error {
  readonly status: number

  constructor(status: number) {
    super(`SkillSprint API: ${status}`)
    this.status = status
  }
}

class InvalidInterviewResponseError extends Error {}

const httpErrorMessages: Partial<Record<number, string>> = {
  [StatusCodes.BAD_REQUEST]: 'Проверь поля формы и попробуй ещё раз.',
  [StatusCodes.UNAUTHORIZED]: 'Вход истёк. Войди снова, чтобы продолжить.',
  [StatusCodes.NOT_FOUND]: 'Сессия недоступна.',
  [StatusCodes.CONFLICT]: 'Состояние интервью изменилось. Проверь текущий вопрос.',
  [StatusCodes.SERVICE_UNAVAILABLE]: 'Сервис AI временно недоступен. Попробуй ещё раз.',
  [StatusCodes.GATEWAY_TIMEOUT]: 'Сервер не успел ответить. Попробуй ещё раз.',
}

export function hasInterviewHttpStatus(error: unknown, ...statuses: number[]) {
  return error instanceof InterviewHttpError && statuses.includes(error.status)
}

export function interviewErrorMessage(error: unknown) {
  if (error instanceof InvalidInterviewResponseError) {
    return 'Сервер прислал данные в неожиданном формате. Попробуй ещё раз.'
  }

  if (!(error instanceof InterviewHttpError)) {
    return 'Не удалось связаться с сервером. Попробуй ещё раз.'
  }

  return httpErrorMessages[error.status] ?? 'Сервер не смог обработать запрос. Попробуй ещё раз.'
}

export function createInterviewApi(baseUrl: string, onUnauthorized: () => void) {
  async function request(path: string, options: RequestInit) {
    const response = await fetch(baseUrl + path, {
      ...options,
      credentials: 'same-origin',
      headers:
        options.body == null
          ? undefined
          : {
              'Content-Type': 'application/json',
              'X-SkillSprint-Request': '1',
            },
    })

    if (!response.ok) {
      if (response.status === StatusCodes.UNAUTHORIZED && !options.signal?.aborted) onUnauthorized()
      throw new InterviewHttpError(response.status)
    }

    return response
  }

  async function requestSession(path: string, options: RequestInit) {
    const response = await request(path, options)
    try {
      return interviewSessionSchema.parse(await response.json())
    } catch (cause) {
      if (cause instanceof SyntaxError || cause instanceof ZodError) {
        throw new InvalidInterviewResponseError('Invalid interview session response', { cause })
      }
      throw cause
    }
  }

  return {
    loadLatest(signal: AbortSignal) {
      return requestSession('/interview-sessions/latest', { signal })
    },
    loadSession(sessionId: number, signal: AbortSignal) {
      return requestSession(`/interview-sessions/${sessionId}`, { signal })
    },
    startSession(signal: AbortSignal) {
      return requestSession('/interview-sessions', { signal, method: 'POST', body: '{}' })
    },
    async saveGoal(goal: GoalInput, signal: AbortSignal) {
      await request('/goal', { signal, method: 'PUT', body: JSON.stringify(goal) })
    },
    submitAnswer(sessionId: number, questionId: number, answer: string, signal: AbortSignal) {
      return requestSession(`/interview-sessions/${sessionId}/answers`, {
        signal,
        method: 'POST',
        body: JSON.stringify({ question_id: questionId, answer }),
      })
    },
  }
}
