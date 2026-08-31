const assert = require('node:assert/strict')
const test = require('node:test')

const { countWeeklySoloEntitlements } = require('../models/BookingRequest.ts')

const weekStart = new Date('2026-08-30T00:00:00.000Z')

function booking(overrides = {}) {
    return {
        type: 'solo',
        status: 'pending',
        weeklyEntitlementConsumed: false,
        startTime: '2026-08-31T10:00:00.000Z',
        ...overrides
    }
}

test('pending bookings do not consume an approved entitlement', () => {
    assert.equal(countWeeklySoloEntitlements([booking()], weekStart), 0)
})

test('waitlisted bookings do not consume an approved entitlement', () => {
    assert.equal(countWeeklySoloEntitlements([booking({ status: 'waitlisted' })], weekStart), 0)
})

test('denied bookings do not consume an approved entitlement', () => {
    assert.equal(countWeeklySoloEntitlements([booking({ status: 'denied', weeklyEntitlementConsumed: true })], weekStart), 0)
})

test('approved qualifying solo bookings consume an entitlement', () => {
    assert.equal(countWeeklySoloEntitlements([booking({ status: 'approved', weeklyEntitlementConsumed: true })], weekStart), 1)
})

test('cancelled approved solo bookings retain their consumed entitlement', () => {
    assert.equal(countWeeklySoloEntitlements([booking({ status: 'cancelled', weeklyEntitlementConsumed: true })], weekStart), 1)
})

test('cancelled bookings that were never approved do not consume an entitlement', () => {
    assert.equal(countWeeklySoloEntitlements([booking({ status: 'cancelled' })], weekStart), 0)
})

test('multiple qualifying bookings in one week are counted', () => {
    assert.equal(countWeeklySoloEntitlements([
        booking({ status: 'approved', weeklyEntitlementConsumed: true }),
        booking({ status: 'cancelled', weeklyEntitlementConsumed: true, startTime: '2026-09-05T10:00:00.000Z' })
    ], weekStart), 2)
})

test('separate weeks are counted independently', () => {
    const bookings = [
        booking({ status: 'approved', weeklyEntitlementConsumed: true }),
        booking({ status: 'approved', weeklyEntitlementConsumed: true, startTime: '2026-09-06T10:00:00.000Z' })
    ]

    assert.equal(countWeeklySoloEntitlements(bookings, weekStart), 1)
    assert.equal(countWeeklySoloEntitlements(bookings, new Date('2026-09-06T00:00:00.000Z')), 1)
})

test('band bookings do not consume the solo entitlement', () => {
    assert.equal(countWeeklySoloEntitlements([booking({ type: 'band', status: 'approved', weeklyEntitlementConsumed: true })], weekStart), 0)
})

test('non-qualifying records do not consume the solo entitlement', () => {
    assert.equal(countWeeklySoloEntitlements([
        booking({ status: 'approved' }),
        booking({ status: 'denied', weeklyEntitlementConsumed: true }),
        booking({ status: 'approved', weeklyEntitlementConsumed: true, startTime: '2026-08-29T10:00:00.000Z' })
    ], weekStart), 0)
})