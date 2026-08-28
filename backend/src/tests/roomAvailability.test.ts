const test = require('node:test');
const assert = require('node:assert/strict');

const { buildRoomAvailabilityCells, getNextAvailable } = require('../services/roomService.ts');

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

test.test('next availability starts at the next half-hour boundary when the room is currently open', () => {
  const room = makeRoom();
  const result = getNextAvailable(room, [], new Date('2026-08-26T10:30:00'));
  assert.equal(new Date(result).getHours(), 11);
});

test.test('availability uses independent half-hour cells through closing time', () => {
  const room = makeRoom();
  const cells = buildRoomAvailabilityCells(room, [], new Date('2026-08-26T12:00:00'));
  const wednesdayCells = cells.filter(cell => cell.day === 3);

  assert.equal(wednesdayCells.length, 16);
  assert.equal(wednesdayCells[0].startTime, '2026-08-26T09:00:00.000Z');
  assert.equal(wednesdayCells[0].endTime, '2026-08-26T09:30:00.000Z');
  assert.equal(wednesdayCells.at(-1).startTime, '2026-08-26T16:30:00.000Z');
  assert.equal(wednesdayCells.at(-1).endTime, '2026-08-26T17:00:00.000Z');
  assert.equal(wednesdayCells.some(cell => cell.startTime === '2026-08-26T17:00:00.000Z'), false);
});

test.test('next availability respects 30, 60, and 90-minute durations', () => {
  const room = makeRoom();
  const bookings = [{
    roomId: 'room-1',
    startTime: '2026-08-26T09:00:00',
    endTime: '2026-08-26T10:00:00'
  }];

  assert.equal(getNextAvailable(room, bookings, new Date('2026-08-26T09:00:00'), 30).slice(11, 16), '10:00');
  assert.equal(getNextAvailable(room, bookings, new Date('2026-08-26T09:00:00'), 60).slice(11, 16), '10:00');
  assert.equal(getNextAvailable(room, bookings, new Date('2026-08-26T09:00:00'), 90).slice(11, 16), '10:00');
});

test.test('next availability returns the earliest aligned start with enough contiguous time', () => {
  const room = makeRoom();
  const bookings = [{
    roomId: 'room-1',
    startTime: '2026-08-26T10:30:00',
    endTime: '2026-08-26T11:30:00'
  }];

  assert.equal(getNextAvailable(room, bookings, new Date('2026-08-26T09:00:00'), 90).slice(11, 16), '09:00');
  assert.equal(getNextAvailable(room, bookings, new Date('2026-08-26T10:00:00'), 90).slice(11, 16), '11:30');
});

test.test('only 30 minutes remaining qualifies for a 30-minute request', () => {
  const room = makeRoom({ rules: { ...makeRoom().rules, allowedDays: [3] } });
  const bookings = [{
    roomId: 'room-1',
    startTime: '2026-08-26T09:00:00',
    endTime: '2026-08-26T16:30:00'
  }];

  assert.equal(getNextAvailable(room, bookings, new Date('2026-08-26T09:00:00'), 30).slice(11, 16), '16:30');
  assert.equal(getNextAvailable(room, bookings, new Date('2026-08-26T09:00:00'), 60).slice(0, 10), '2026-09-02');
});

test.test('adjacent bookings leave the following half-hour available', () => {
  const room = makeRoom();
  const bookings = [
    { roomId: 'room-1', startTime: '2026-08-26T09:00:00', endTime: '2026-08-26T09:30:00' },
    { roomId: 'room-1', startTime: '2026-08-26T09:30:00', endTime: '2026-08-26T10:00:00' }
  ];

  assert.equal(getNextAvailable(room, bookings, new Date('2026-08-26T09:00:00'), 30).slice(11, 16), '10:00');
  assert.equal(getNextAvailable(room, bookings, new Date('2026-08-26T09:00:00'), 90).slice(11, 16), '10:00');
});

test.test('overlapping approved bookings mark each affected half-hour cell booked', () => {
  const room = makeRoom();
  const cells = buildRoomAvailabilityCells(room, [{
    roomId: 'room-1',
    startTime: '2026-08-26T10:15:00',
    endTime: '2026-08-26T11:00:00'
  }], new Date('2026-08-26T12:00:00'));
  const wednesdayCells = cells.filter(cell => cell.day === 3);

  assert.equal(wednesdayCells.find(cell => cell.startTime === '2026-08-26T10:00:00.000Z').status, 'booked');
  assert.equal(wednesdayCells.find(cell => cell.startTime === '2026-08-26T10:30:00.000Z').status, 'booked');
  assert.equal(wednesdayCells.find(cell => cell.startTime === '2026-08-26T11:00:00.000Z').status, 'available');
});