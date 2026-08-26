import assert from 'node:assert/strict'
import test from 'node:test'
import { isOverlapping } from '../models/BookingRequest.ts'

test('booking intervals overlap when their time ranges intersect', () => {
    assert.equal(
        isOverlapping(
            new Date('2026-08-26T10:00:00.000Z'),
            new Date('2026-08-26T11:00:00.000Z'),
            new Date('2026-08-26T10:30:00.000Z'),
            new Date('2026-08-26T11:30:00.000Z')
        ),
        true
    )
})

test('booking intervals that only touch at an endpoint do not overlap', () => {
    assert.equal(
        isOverlapping(
            new Date('2026-08-26T10:00:00.000Z'),
            new Date('2026-08-26T11:00:00.000Z'),
            new Date('2026-08-26T11:00:00.000Z'),
            new Date('2026-08-26T12:00:00.000Z')
        ),
        false
    )
})

