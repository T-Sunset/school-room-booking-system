const test = require('node:test')
const assert = require('node:assert/strict')

const { getStrikeStatusFromStrikes } = require('../services/strikeService.ts')

const DAY_MS = 7 * 24 * 60 * 60 * 1000

function makeStrike(id, issuedAt, expiresAt) {
  return {
    id,
    userId: 'student-1',
    schoolId: 'school-1',
    issuedBy: 'teacher-1',
    issuedAt,
    expiresAt,
    reason: 'Test reason'
  }
}

test('no active strikes produces a clear status', () => {
  const now = Date.parse('2026-01-10T00:00:00.000Z')
  const strikes = [makeStrike(
    'strike-1',
    '2026-01-01T00:00:00.000Z',
    '2026-01-08T00:00:00.000Z'
  )]

  assert.deepEqual(getStrikeStatusFromStrikes(strikes, now), {
    activeStrikeCount: 0,
    hasWarning: false,
    isBanned: false,
    banExpiresAt: null
  })
})

test('one active strike produces a warning without a ban', () => {
  const now = Date.parse('2026-01-05T00:00:00.000Z')
  const strikes = [makeStrike(
    'strike-1',
    '2026-01-01T00:00:00.000Z',
    '2026-01-08T00:00:00.000Z'
  )]

  const status = getStrikeStatusFromStrikes(strikes, now)

  assert.equal(status.activeStrikeCount, 1)
  assert.equal(status.hasWarning, true)
  assert.equal(status.isBanned, false)
  assert.equal(status.banExpiresAt, null)
})

test('a second strike issued while the first is active starts a seven-day ban', () => {
  const secondIssuedAt = '2026-01-03T00:00:00.000Z'
  const strikes = [
    makeStrike('strike-1', '2026-01-01T00:00:00.000Z', '2026-01-08T00:00:00.000Z'),
    makeStrike('strike-2', secondIssuedAt, '2026-01-10T00:00:00.000Z')
  ]

  const status = getStrikeStatusFromStrikes(strikes, Date.parse('2026-01-04T00:00:00.000Z'))

  assert.equal(status.activeStrikeCount, 2)
  assert.equal(status.isBanned, true)
  assert.equal(status.banExpiresAt, new Date(Date.parse(secondIssuedAt) + DAY_MS).toISOString())
})

test('the ban remains active after the first strike expires', () => {
  const strikes = [
    makeStrike('strike-1', '2026-01-01T00:00:00.000Z', '2026-01-08T00:00:00.000Z'),
    makeStrike('strike-2', '2026-01-03T00:00:00.000Z', '2026-01-10T00:00:00.000Z')
  ]

  const status = getStrikeStatusFromStrikes(strikes, Date.parse('2026-01-09T00:00:00.000Z'))

  assert.equal(status.activeStrikeCount, 1)
  assert.equal(status.isBanned, true)
  assert.equal(status.banExpiresAt, '2026-01-10T00:00:00.000Z')
})

test('a later strike cannot shorten the current ban and extends it when triggered', () => {
  const strikes = [
    makeStrike('strike-1', '2026-01-01T00:00:00.000Z', '2026-01-08T00:00:00.000Z'),
    makeStrike('strike-2', '2026-01-03T00:00:00.000Z', '2026-01-10T00:00:00.000Z'),
    makeStrike('strike-3', '2026-01-04T00:00:00.000Z', '2026-01-11T00:00:00.000Z')
  ]

  const status = getStrikeStatusFromStrikes(strikes, Date.parse('2026-01-05T00:00:00.000Z'))

  assert.equal(status.isBanned, true)
  assert.equal(status.banExpiresAt, '2026-01-11T00:00:00.000Z')
})

test('expired strikes remain in history but do not create current status', () => {
  const strikes = [
    makeStrike('strike-1', '2026-01-01T00:00:00.000Z', '2026-01-08T00:00:00.000Z'),
    makeStrike('strike-2', '2026-01-02T00:00:00.000Z', '2026-01-09T00:00:00.000Z')
  ]

  const status = getStrikeStatusFromStrikes(strikes, Date.parse('2026-01-10T00:00:00.000Z'))

  assert.equal(strikes.length, 2)
  assert.equal(status.activeStrikeCount, 0)
  assert.equal(status.hasWarning, false)
  assert.equal(status.isBanned, false)
  assert.equal(status.banExpiresAt, null)
})

test('identical issue times use strike ID as a deterministic tie-breaker', () => {
  const issuedAt = '2026-01-01T00:00:00.000Z'
  const strikes = [
    makeStrike('strike-b', issuedAt, '2026-01-08T00:00:00.000Z'),
    makeStrike('strike-a', issuedAt, '2026-01-08T00:00:00.000Z')
  ]

  const status = getStrikeStatusFromStrikes(strikes, Date.parse('2026-01-02T00:00:00.000Z'))

  assert.equal(status.activeStrikeCount, 2)
  assert.equal(status.isBanned, true)
  assert.equal(status.banExpiresAt, '2026-01-08T00:00:00.000Z')
})
