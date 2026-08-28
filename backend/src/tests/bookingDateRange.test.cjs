const assert = require('node:assert/strict')
const test = require('node:test')

const { bookingIntersectsCalendarDay, getLocalCalendarDayRange } = require('../services/bookingDateRange.ts')
const { canApproveBooking } = require('../rbac/can.ts')

test('calendar dates require a valid YYYY-MM-DD value', () => {
    assert.throws(() => getLocalCalendarDayRange('2026-8-28'), /YYYY-MM-DD/)
    assert.throws(() => getLocalCalendarDayRange('2026-02-30'), /valid calendar date/)
    assert.throws(() => getLocalCalendarDayRange('2026-13-01'), /valid calendar date/)
})

test('calendar day range uses local midnight and the following local midnight', () => {
    const range = getLocalCalendarDayRange('2026-08-28')

    assert.equal(range.start.getFullYear(), 2026)
    assert.equal(range.start.getMonth(), 7)
    assert.equal(range.start.getDate(), 28)
    assert.equal(range.start.getHours(), 0)
    assert.equal(range.end.getDate(), 29)
    assert.equal(range.end.getHours(), 0)
})

test('bookings intersecting any part of the calendar day are included', () => {
    const day = getLocalCalendarDayRange('2026-08-28')

    assert.equal(bookingIntersectsCalendarDay(
        new Date('2026-08-27T23:30:00'),
        new Date('2026-08-28T00:30:00'),
        day
    ), true)
    assert.equal(bookingIntersectsCalendarDay(
        new Date('2026-08-28T23:30:00'),
        new Date('2026-08-29T00:30:00'),
        day
    ), true)
})

test('bookings entirely outside the calendar day are excluded', () => {
    const day = getLocalCalendarDayRange('2026-08-28')

    assert.equal(bookingIntersectsCalendarDay(
        new Date('2026-08-27T22:00:00'),
        new Date('2026-08-27T23:00:00'),
        day
    ), false)
    assert.equal(bookingIntersectsCalendarDay(
        new Date('2026-08-29T00:00:00'),
        new Date('2026-08-29T01:00:00'),
        day
    ), false)
})

test('calendar day boundaries are half-open', () => {
    const day = getLocalCalendarDayRange('2026-08-28')

    assert.equal(bookingIntersectsCalendarDay(
        new Date('2026-08-27T23:00:00'),
        day.start,
        day
    ), false)
    assert.equal(bookingIntersectsCalendarDay(
        day.end,
        new Date('2026-08-29T01:00:00'),
        day
    ), false)
    assert.equal(bookingIntersectsCalendarDay(
        day.start,
        new Date('2026-08-28T00:30:00'),
        day
    ), true)
})

test('only staff roles can approve and view school bookings', () => {
    assert.equal(canApproveBooking('student'), false)
    assert.equal(canApproveBooking('teacher'), true)
    assert.equal(canApproveBooking('admin'), true)
})