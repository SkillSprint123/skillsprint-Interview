import { z } from 'zod'

export const interviewPagePropsSchema = z.object({
  standalone: z.boolean(),
})
