import { z } from 'zod'

export const answerSchema = z
  .string()
  .trim()
  .min(1, 'Сначала напиши свой ответ.')
  .max(5000, 'Ответ должен быть не длиннее 5000 символов.')

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

export const sessionPhaseSchema = z.enum(['answering', 'submitting', 'feedback', 'complete'])
