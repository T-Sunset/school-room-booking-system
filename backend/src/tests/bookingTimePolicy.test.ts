const test = require('node:test')
const assert = require('node:assert/strict')

const {
  getDurationMinutes,
  parseBookingInterval,
  validateBookingInterval
} = require('../services/bookingTimePolicy.ts')

const rules = {
  maxBookingHours: 2,
  openHour: 9,
  closeHour: 17,
  allowedDays: [1, 2, 3, 4, 5]
}

function validate(startTime, endTime, overrides = {}) {
  return validateBookingInterval(startTime, endTime, { ...rules, ...overrides })
}

test('accepts valid 30-minute, 60-minute, and 90-minute intervals', () => {
  assert.equal(getDurationMinutes(validate('2026-08-24T09:00:00.000Z', '2026-08-24T09:30:00.000Z')), 30)
  assert.equal(getDurationMinutes(validate('2026-08-24T10:00:00.000Z', '2026-08-24T11:00:00.000Z')), 60)
  assert.equal(getDurationMinutes(validate('2026-08-24T11:00:00.000Z', '2026-08-24T12:30:00.000Z')), 90)
})

test('rejects invalid timestamps and non-increasing intervals', () => {
  assert.throws(() => parseBookingInterval('not-a-date', '2026-08-24T09:30:00.000Z'), /Invalid date format/i)
  assert.throws(() => validate('2026-08-24T10:00:00.000Z', '2026-08-24T10:00:00.000Z'), /after startTime/i)
  assert.throws(() => validate('2026-08-24T10:30:00.000Z', '2026-08-24T10:00:00.000Z'), /after startTime/i)
})

test('rejects timestamps that are not aligned to 30-minute boundaries', () => {
  assert.throws(() => validate('2026-08-24T09:15:00.000Z', '2026-08-24T09:45:00.000Z'), /30-minute boundaries/i)
})

test('rejects zero or negative durations', () => {
  assert.throws(() => validate('2026-08-24T09:00:00.000Z', '2026-08-24T09:00:00.000Z'), /after startTime/i)
  assert.throws(() => validate('2026-08-24T09:30:00.000Z', '2026-08-24T09:00:00.000Z'), /after startTime/i)
})

test('rejects durations exceeding the room maximum', () => {
  assert.throws(() => validate('2026-08-24T09:00:00.000Z', '2026-08-24T11:30:00.000Z'), /maximum hours/i)
})

test('accepts opening and closing boundaries', () => {
  assert.doesNotThrow(() => validate('2026-08-24T09:00:00.000Z', '2026-08-24T09:30:00.000Z'))
  assert.doesNotThrow(() => validate('2026-08-24T16:30:00.000Z', '2026-08-24T17:00:00.000Z'))
  assert.throws(() => validate('2026-08-24T17:00:00.000Z', '2026-08-24T17:30:00.000Z'), /opening hours/i)
})

test('rejects intervals outside opening hours or on disallowed weekdays', () => {
  assert.throws(() => validate('2026-08-24T08:30:00.000Z', '2026-08-24T09:00:00.000Z'), /opening hours/i)
  assert.throws(() => validate('2026-08-24T16:30:00.000Z', '2026-08-24T17:30:00.000Z'), /opening hours/i)
  assert.throws(() => validate('2026-08-23T09:00:00.000Z', '2026-08-23T09:30:00.000Z'), /not available/i)
})

test('uses the same interval contract for creation and approval inputs', () => {
  const validIntervals = [
    ['2026-08-24T09:00:00.000Z', '2026-08-24T09:30:00.000Z'],
    ['2026-08-24T09:30:00.000Z', '2026-08-24T11:00:00.000Z']
  ]

  for (const [startTime, endTime] of validIntervals) {
    assert.doesNotThrow(() => validateBookingInterval(startTime, endTime, rules))
  }

  for (const [startTime, endTime] of [
    ['2026-08-24T09:15:00.000Z', '2026-08-24T09:45:00.000Z'],
    ['2026-08-24T09:00:00.000Z', '2026-08-24T11:30:00.000Z']
  ]) {
    assert.throws(() => validateBookingInterval(startTime, endTime, rules))
  }
})
