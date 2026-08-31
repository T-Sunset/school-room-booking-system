const assert = require('node:assert/strict')
const test = require('node:test')

const { canStudentCancelBooking } = require('../models/BookingRequest.ts')

const now = new Date('2026-08-31T10:00:00.000Z')

function booking(overrides = {}) {
    return {
        createdBy: 'student-1',
        status: 'pending',
        startTime: '2026-08-31T11:00:00.000Z',
        ...overrides
    }
}

test('student can cancel their own pending booking', () => {
    assert.equal(canStudentCancelBooking(booking(), 'student-1', now), true)
})

test('student can cancel their own waitlisted booking', () => {
    assert.equal(canStudentCancelBooking(booking({ status: 'waitlisted' }), 'student-1', now), true)
})

test('student can cancel their own future approved booking', () => {
    assert.equal(canStudentCancelBooking(booking({ status: 'approved' }), 'student-1', now), true)
})

test('student cannot cancel a booking after it starts', () => {
    assert.equal(canStudentCancelBooking(booking({ startTime: '2026-08-31T10:00:00.000Z' }), 'student-1', now), false)
})

test('student cannot cancel another student booking', () => {
    assert.equal(canStudentCancelBooking(booking(), 'student-2', now), false)
})

test('denied bookings cannot be cancelled', () => {
    assert.equal(canStudentCancelBooking(booking({ status: 'denied' }), 'student-1', now), false)
})

test('cancelled bookings cannot be cancelled again', () => {
    assert.equal(canStudentCancelBooking(booking({ status: 'cancelled' }), 'student-1', now), false)
})

test('band booking ownership still requires the booking creator', () => {
    assert.equal(canStudentCancelBooking(booking({ type: 'band' }), 'student-1', now), true)
    assert.equal(canStudentCancelBooking(booking({ type: 'band' }), 'student-2', now), false)
})

test('staff-created bookings are not cancellable by a student who did not create them', () => {
    assert.equal(canStudentCancelBooking(booking({ createdBy: 'staff-1' }), 'student-1', now), false)
})