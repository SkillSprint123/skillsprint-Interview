import { answerSchema, feedbackSchema } from './schemas.ts'
import type { Feedback, Question } from './types.ts'

// Keyword matching is a demo aid, not a semantic assessment by an AI model.
export function evaluateDemoAnswer(question: Question, input: string): Feedback {
  const answer = answerSchema.parse(input)
  const normalized = answer.toLocaleLowerCase('ru')
  const mentioned: string[] = []
  const toReview: string[] = []
  for (const criterion of question.criteria) {
    const found = criterion.keywords.some((keyword) => normalized.includes(keyword))
    if (found) mentioned.push(criterion.label)
    else toReview.push(criterion.label)
  }
  return feedbackSchema.parse({
    questionId: question.id,
    answer,
    mentioned,
    toReview,
    reference: question.reference,
  })
}

// Replace this adapter with the server API later; secrets never belong here.
export function requestDemoFeedback(
  question: Question,
  answer: string,
  signal: AbortSignal,
): Promise<Feedback> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(signal.reason)
      return
    }
    const abort = () => {
      clearTimeout(timer)
      reject(signal.reason)
    }
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', abort)
      try {
        resolve(evaluateDemoAnswer(question, answer))
      } catch (error) {
        reject(error)
      }
    }, 650)
    signal.addEventListener('abort', abort, { once: true })
  })
}
