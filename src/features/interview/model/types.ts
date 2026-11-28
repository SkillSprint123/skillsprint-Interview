import type { z } from 'zod'
import type {
  answerSchema,
  feedbackSchema,
  goalInputSchema,
  interviewSessionSchema,
  questionSchema,
  sessionPhaseSchema,
} from './schemas.ts'

export type Answer = z.infer<typeof answerSchema>
export type Question = z.infer<typeof questionSchema>
export type Feedback = z.infer<typeof feedbackSchema>
export type SessionPhase = z.infer<typeof sessionPhaseSchema>

export type GoalInput = z.infer<typeof goalInputSchema>
export type InterviewSession = z.infer<typeof interviewSessionSchema>
