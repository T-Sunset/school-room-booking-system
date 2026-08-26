const test = require('node:test');
const assert = require('node:assert/strict');

const { validateBandMemberIds } = require('../services/bandService.ts');

test.test('band validation keeps creator and deduplicates repeated creator IDs', () => {
  const result = validateBandMemberIds(
    ['creator-1', 'student-2', 'creator-1'],
    'creator-1',
    'school-1',
    [
      { id: 'creator-1', role: 'student', schoolId: 'school-1' },
      { id: 'student-2', role: 'student', schoolId: 'school-1' }
    ]
  );

  assert.deepEqual(result, ['creator-1', 'student-2']);
});

test.test('band validation rejects a proposal with only the creator', () => {
  assert.throws(
    () => validateBandMemberIds(
      ['creator-1'],
      'creator-1',
      'school-1',
      [{ id: 'creator-1', role: 'student', schoolId: 'school-1' }]
    ),
    /at least two students/i
  );
});

test.test('band validation rejects members that are not same-school students', () => {
  assert.throws(
    () => validateBandMemberIds(
      ['creator-1', 'teacher-1'],
      'creator-1',
      'school-1',
      [
        { id: 'creator-1', role: 'student', schoolId: 'school-1' },
        { id: 'teacher-1', role: 'teacher', schoolId: 'school-1' }
      ]
    ),
    /not a student|same-school/i
  );
});

test.test('band validation rejects members from another school even if the ID is otherwise valid', () => {
  assert.throws(
    () => validateBandMemberIds(
      ['creator-1', 'student-from-other-school'],
      'creator-1',
      'school-1',
      [
        { id: 'creator-1', role: 'student', schoolId: 'school-1' },
        { id: 'student-from-other-school', role: 'student', schoolId: 'other-school' }
      ]
    ),
    /same school/i
  );
});
