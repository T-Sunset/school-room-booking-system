const test = require('node:test');
const assert = require('node:assert/strict');

const { getNextAvailable } = require('../services/roomService.ts');

function makeRoom(overrides = {}) {
  return {
    id: 'room-1',
    schoolId: 'school-1',
    name: 'Practice Room',
    nameNormalised: 'practice room',
    isBookable: true,
    rules: {
      maxBookingHours: 2,
      requiresApproval: false,
      allowedDays: [0, 1, 2, 3, 4, 5, 6],
      openHour: 9,
      closeHour: 17,
      allowedYearLevels: [7, 8, 9, 10, 11, 12],
      agreement: ''
    },
    createdBy: 'admin-1',
    createdAt: '2026-08-01T00:00:00.000Z',
    ...overrides
  };
}

test.test('non-bookable rooms have no next available time', () => {
  const room = makeRoom({ isBookable: false });
  assert.equal(getNextAvailable(room, [], new Date('2026-08-26T10:00:00')), null);
});

test.test('next availability skips disallowed weekdays', () => {
  const room = makeRoom({
    rules: {
      ...makeRoom().rules,
      allowedDays: [1]
    }
  });
  const result = getNextAvailable(room, [], new Date('2026-08-26T10:00:00'));
  assert.equal(new Date(result).getDay(), 1);
});

test.test('next availability skips an approved booking overlap', () => {
  const room = makeRoom();
  const bookings = [{
    roomId: 'room-1',
    startTime: '2026-08-26T10:00:00',
    endTime: '2026-08-26T12:00:00'
  }];
  const result = getNextAvailable(room, bookings, new Date('2026-08-26T09:00:00'));
  assert.equal(new Date(result).getHours(), 12);
});

test.test('next availability starts at the next whole hour when the room is currently open', () => {
  const room = makeRoom();
  const result = getNextAvailable(room, [], new Date('2026-08-26T10:30:00'));
  assert.equal(new Date(result).getHours(), 11);
});