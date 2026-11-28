import { z } from 'zod'

export const answerSchema = z
  .string()
  .trim()
  .min(1, 'Сначала напиши свой ответ.')
  .max(5000, 'Ответ должен быть не длиннее 5000 символов.')

export const serverAnswerSchema = z
  .string()
  .trim()
  .refine(
    (answer) => answer.length > 0 && Array.from(answer).length <= 10000,
    'Напиши ответ длиной от 1 до 10000 символов.',
  )

export const criterionSchema = z.object({
  label: z.string().min(1),
  keywords: z.array(z.string().min(1)).min(1),
})

export const questionSchema = z.object({
  id: z.string().min(1),
  topic: z.string().min(1),
  prompt: z.string().min(1),
  criteria: z.array(criterionSchema).min(1),
  reference: z.string().min(1),
  task: z.string().min(1),
})

export const feedbackSchema = z.object({
  questionId: z.string(),
  answer: answerSchema,
  mentioned: z.array(z.string()),
  toReview: z.array(z.string()),
  reference: z.string(),
})

export const sessionPhaseSchema = z.enum([
  'answering',
  'submitting',
  'feedback',
  'complete',
  'loading',
  'ready',
  'goal',
  'saving-goal',
  'unavailable',
  'syncing',
])

const role = z.enum(['frontend', 'backend', 'fullstack'])
const level = z.enum(['junior', 'middle', 'senior'])
const id = z.number().int().positive().safe()
const score = z.number().min(0).max(100).nullable()

export const goalInputSchema = z.object({
  role,
  current_level: level,
  target_level: level,
  interview_date: z.string().date(),
  daily_minutes: z.number().int().min(5).max(480),
})

export const interviewSessionSchema = goalInputSchema
  .pick({
    role: true,
    current_level: true,
    target_level: true,
  })
  .extend({
    id,
    mode: z.enum(['demo', 'gigachat']),
    status: z.enum(['active', 'completed']),
    current_position: z.number().int().nonnegative(),
    average_score: score,
    questions: z
      .array(
        z.object({
          id,
          position: z.number().int().positive(),
          text: z.string().min(1),
          answer: z.string().nullable(),
          feedback: z.string().nullable(),
          score,
        }),
      )
      .min(1),
  })
  .refine(
    (session) =>
      session.status === 'completed' ||
      (session.current_position > 0 && session.current_position <= session.questions.length),
    { path: ['current_position'], message: 'Active session must have a current question' },
  )
