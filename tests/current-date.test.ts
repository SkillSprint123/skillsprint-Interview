import assert from 'node:assert/strict'
import { test } from 'vite-plus/test'
import { formatHeaderDate } from '../src/shared/use-current-date.ts'

test('the header shows the actual weekday and Russian calendar date', () => {
  assert.equal(
    formatHeaderDate(new Date('2026-10-24T12:00:00Z'), 'Europe/Moscow'),
    'Суббота, 24 октября',
  )
})

test('the day changes at midnight in the user time zone, not at UTC midnight', () => {
  assert.equal(
    formatHeaderDate(new Date('2026-10-24T20:59:59Z'), 'Europe/Moscow'),
    'Суббота, 24 октября',
  )
  assert.equal(
    formatHeaderDate(new Date('2026-10-24T21:00:00Z'), 'Europe/Moscow'),
    'Воскресенье, 25 октября',
  )
})

test('one instant can belong to different days in different user time zones', () => {
  const instant = new Date('2026-01-01T01:00:00Z')
  assert.equal(formatHeaderDate(instant, 'Europe/Moscow'), 'Четверг, 1 января')
  assert.equal(formatHeaderDate(instant, 'America/Los_Angeles'), 'Среда, 31 декабря')
})

test('Russian dates remain correct across a daylight-saving transition', () => {
  assert.equal(
    formatHeaderDate(new Date('2026-03-29T00:30:00Z'), 'Europe/Berlin'),
    'Воскресенье, 29 марта',
  )
  assert.equal(
    formatHeaderDate(new Date('2026-03-29T01:30:00Z'), 'Europe/Berlin'),
    'Воскресенье, 29 марта',
  )
})
