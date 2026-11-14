import type { z } from 'zod'
import type { PropType } from 'vue'
import type { interviewPagePropsSchema } from './schemas'

export type InterviewPageProps = z.infer<typeof interviewPagePropsSchema>
export type StandaloneProp = PropType<InterviewPageProps['standalone']>
