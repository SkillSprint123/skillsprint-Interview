import { expect, test } from '@jest/globals'
import { formatHeaderDate } from '../../src/shared/composables/use-current-date.ts'

test('the header shows the actual weekday and Russian calendar date', () => {
  expect(formatHeaderDate(new Date('2026-10-24T12:00:00Z'), 'Europe/Moscow')).toBe(
    'Суббота, 24 октября',
  )
})

test('the day changes at midnight in the user time zone, not at UTC midnight', () => {
  expect(formatHeaderDate(new Date('2026-10-24T20:59:59Z'), 'Europe/Moscow')).toBe(
    'Суббота, 24 октября',
  )
  expect(formatHeaderDate(new Date('2026-10-24T21:00:00Z'), 'Europe/Moscow')).toBe(
    'Воскресенье, 25 октября',
  )
})

test('one instant can belong to different days in different user time zones', () => {
  const instant = new Date('2026-01-01T01:00:00Z')
  expect(formatHeaderDate(instant, 'Europe/Moscow')).toBe('Четверг, 1 января')
  expect(formatHeaderDate(instant, 'America/Los_Angeles')).toBe('Среда, 31 декабря')
})

test('Russian dates remain correct across a daylight-saving transition', () => {
  expect(formatHeaderDate(new Date('2026-03-29T00:30:00Z'), 'Europe/Berlin')).toBe(
    'Воскресенье, 29 марта',
  )
  expect(formatHeaderDate(new Date('2026-03-29T01:30:00Z'), 'Europe/Berlin')).toBe(
    'Воскресенье, 29 марта',
  )
})
