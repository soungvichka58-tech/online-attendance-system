import test from 'node:test';
import assert from 'node:assert/strict';
import * as XLSX from 'xlsx';
import { parseRosterRows, parseRosterFile, normalizeStudentId, isValidStudentId, compareRoster, rosterToMap, rosterFromMap, listNameFromFilename, MAX_ROSTER_SIZE } from '../src/utils/roster.js';
import { validateLocationSettings, distanceInMeters, checkStudentLocation, getCurrentPosition } from '../src/utils/location.js';
import { buildSessionRestrictions, locationSettingsFromSession } from '../src/utils/sessionRestrictions.js';

const header = ['Student ID', 'Full Name'];
const classroom = { requiresLocation: true, latitude: 11.5564, longitude: 104.9282, radiusMeters: 100 };
const position = (latitude, longitude, accuracy = 5) => ({ coords: { latitude, longitude, accuracy } });

test('imports reordered headers, normalizes IDs, preserves leading zeros and Unicode names', () => {
  const students = parseRosterRows([[], ['Full Name', 'Student ID'], ['  សុខ   ដារ៉ា ', '  ab_01 '], [], ['Jane Doe', '00123']]);
  assert.deepEqual(students, [{ studentId: 'AB_01', studentName: 'សុខ ដារ៉ា' }, { studentId: '00123', studentName: 'Jane Doe' }]);
});

test('rejects duplicate IDs after case and whitespace normalization', () => {
  assert.throws(() => parseRosterRows([header, ['ab01', 'Student One'], [' AB01 ', 'Student Two']]), /Duplicate Student ID/);
});

test('rejects invalid IDs instead of silently merging punctuation', () => {
  assert.equal(normalizeStudentId(' st/01 '), 'ST/01');
  assert.equal(isValidStudentId('ST/01'), false);
  for (const id of ['A', '', 'A'.repeat(31), 'ST 01', 'ST.01']) {
    assert.throws(() => parseRosterRows([header, [id, 'Student One']]), /Student ID/);
  }
});

test('rejects missing headers, empty files, missing names and partly invalid rosters', () => {
  assert.throws(() => parseRosterRows([]), /empty/);
  assert.throws(() => parseRosterRows([header]), /at least one/);
  assert.throws(() => parseRosterRows([['Email', 'Name'], ['one@example.com', 'Student One']]), /header row/);
  assert.throws(() => parseRosterRows([header, ['ST01', 'Student One'], ['ST02', '']]), /Row 3/);
});

test('accepts 2,000 students and rejects larger rosters without truncation', () => {
  const rows = Array.from({ length: MAX_ROSTER_SIZE }, (_, i) => [`ST${i}`, `Student ${i}`]);
  assert.equal(parseRosterRows([header, ...rows]).length, MAX_ROSTER_SIZE);
  assert.throws(() => parseRosterRows([header, ...rows, ['EXTRA', 'Extra Student']]), /up to 2000/);
});

test('reads CSV bytes and preserves numeric-looking student IDs', () => {
  const bytes = new TextEncoder().encode('Student ID,Full Name\r\n00123,Jane Doe\r\n');
  assert.deepEqual(parseRosterFile(bytes), [{ studentId: '00123', studentName: 'Jane Doe' }]);
});

test('reads actual Excel bytes including formatted leading-zero IDs', () => {
  const sheet = XLSX.utils.aoa_to_sheet([header, [123, 'Jane Doe']]);
  sheet.A2.z = '00000';
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'Students');
  assert.equal(parseRosterFile(XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }))[0].studentId, '00123');
});

test('rejects multiple worksheets instead of silently ignoring student lists', () => {
  const workbook = XLSX.utils.book_new();
  for (const name of ['Class A', 'Class B']) XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([header, ['ST01', 'Student One']]), name);
  assert.throws(() => parseRosterFile(XLSX.write(workbook, { type: 'array', bookType: 'xlsx' })), /exactly one worksheet/);
});

test('matches attendance by normalized ID while retaining roster names and absent students', () => {
  const students = parseRosterRows([header, ['ST01', 'Roster Name'], ['ST02', 'Absent Student']]);
  const records = [{ studentId: ' st01 ', studentName: 'Submitted Name' }, { studentId: 'EXTRA', studentName: 'Unlisted Student' }];
  const rows = compareRoster(students, records);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].studentName, 'Roster Name');
  assert.equal(rows[0].attendance.studentName, 'Submitted Name');
  assert.equal(rows[1].attendance, null);
});

test('validates zero coordinates, coordinate limits and radius limits', () => {
  assert.deepEqual(validateLocationSettings({ ...classroom, latitude: '0', longitude: '0', radiusMeters: '10' }), { latitude: 0, longitude: 0, radiusMeters: 10 });
  for (const invalid of [{ latitude: '' }, { latitude: null }, { latitude: 91 }, { longitude: 181 }, { longitude: NaN }, { radiusMeters: 0 }, { radiusMeters: 9 }, { radiusMeters: 5001 }, { radiusMeters: 10.5 }]) {
    assert.throws(() => validateLocationSettings({ ...classroom, ...invalid }));
  }
  assert.equal(validateLocationSettings({ requiresLocation: false }), null);
});

test('calculates distances correctly including crossing the date line', () => {
  assert.equal(distanceInMeters(0, 0, 0, 0), 0);
  assert.ok(Math.abs(distanceInMeters(0, 0, 0, 1) - 111194.927) < 1);
  assert.ok(distanceInMeters(0, 179.999, 0, -179.999) < 223);
});

test('allows nearby location and rejects out-of-range location and poor accuracy', () => {
  assert.equal(checkStudentLocation(position(classroom.latitude, classroom.longitude), classroom).distanceMeters, 0);
  assert.throws(() => checkStudentLocation(position(11.5664, 104.9282), classroom), /Move within 100 m/);
  assert.throws(() => checkStudentLocation(position(11.5564, 104.9282, 101), classroom), /accuracy/);
  assert.throws(() => checkStudentLocation(position(NaN, 104.9282), classroom), /invalid location/);
});

test('handles points just inside and outside the configured boundary', () => {
  const target = { requiresLocation: true, latitude: 0, longitude: 0, radiusMeters: 100 };
  const longitudeAtMeters = (meters) => meters / 6371000 * 180 / Math.PI;
  assert.ok(checkStudentLocation(position(0, longitudeAtMeters(99.9)), target).distanceMeters < 100);
  assert.throws(() => checkStudentLocation(position(0, longitudeAtMeters(100.1)), target), /Move within/);
});

test('builds the session request and reads location settings back without losing zero', () => {
  const list = { id: 'list-1', name: 'I3 GIC', studentCount: 64 };
  const data = buildSessionRestrictions(list, { ...classroom, latitude: 0, longitude: 0 });
  assert.deepEqual(data, { roster_list_id: 'list-1', location: { latitude: 0, longitude: 0, radius_meters: 100 } });
  const session = { requiresLocation: true, location: { latitude: 0, longitude: 0 }, radiusMeters: 100 };
  assert.deepEqual(locationSettingsFromSession(session), { ...classroom, latitude: 0, longitude: 0 });
  assert.deepEqual(buildSessionRestrictions(null, { requiresLocation: false }), { roster_list_id: null, location: null });
  assert.throws(() => buildSessionRestrictions(null, { ...classroom, radiusMeters: 5 }));
});

test('reads the school class list format with title rows, Khmer names and groups', () => {
  const sheet = XLSX.utils.aoa_to_sheet([
    ['Institute of Technology'], ['Class list I3-GIC'], [], [],
    ['No', 'ID', 'Name', 'Name_KH', 'Groupe'],
    [1, 'e20241406', 'AN THEARAYUK', 'អាន ធារាយុ', 'A'],
    [2, 'e20240202', 'CHAB  SOMAO', 'ចាប សុម៉ៅ', 'A'],
    [64, 'e20241358', 'YEM SIVELENG', 'យ៉េម ស៊ីវឡេង', 'B'],
    ['', '', '', '', ''], [65, '', '', '', ''],
  ]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'Sheet1');
  const students = parseRosterFile(XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }));
  assert.deepEqual(students, [
    { studentId: 'E20241406', studentName: 'AN THEARAYUK', nameKh: 'អាន ធារាយុ', group: 'A' },
    { studentId: 'E20240202', studentName: 'CHAB SOMAO', nameKh: 'ចាប សុម៉ៅ', group: 'A' },
    { studentId: 'E20241358', studentName: 'YEM SIVELENG', nameKh: 'យ៉េម ស៊ីវឡេង', group: 'B' },
  ]);
});

test('does not mistake the Khmer name or row number columns for the ID and name', () => {
  const students = parseRosterRows([['No', 'Name_KH', 'Name', 'ID'], [1, 'សុខ', 'SOK DARA', 'e01']]);
  assert.deepEqual(students, [{ studentId: 'E01', studentName: 'SOK DARA', nameKh: 'សុខ' }]);
  assert.throws(() => parseRosterRows([['No', 'Name_KH'], [1, 'សុខ']]), /header row/);
});

test('keeps the file order when a saved list is read back', () => {
  const students = parseRosterRows([header, ['ZZ9', 'Last Alphabetically'], ['AA1', 'First Alphabetically']]);
  const reversedMap = Object.fromEntries(Object.entries(rosterToMap(students)).reverse());
  assert.deepEqual(rosterFromMap(reversedMap).map((student) => student.studentId), ['ZZ9', 'AA1']);
  assert.equal(listNameFromFilename('I3-GIC_LIST.xlsx'), 'I3-GIC LIST');
});

test('requests fresh high-accuracy location and explains permission, timeout and HTTPS failures', async () => {
  const navigatorDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  const secureDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'isSecureContext');
  try {
    Object.defineProperty(globalThis, 'isSecureContext', { configurable: true, value: false });
    await assert.rejects(getCurrentPosition(), /HTTPS/);
    Object.defineProperty(globalThis, 'isSecureContext', { configurable: true, value: true });
    Object.defineProperty(globalThis, 'navigator', { configurable: true, value: {} });
    await assert.rejects(getCurrentPosition(), /does not support/);
    let receivedOptions;
    Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { geolocation: { getCurrentPosition(success, error, options) { receivedOptions = options; success(position(0, 0)); } } } });
    assert.equal((await getCurrentPosition()).coords.latitude, 0);
    assert.deepEqual(receivedOptions, { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 });
    for (const [code, message] of [[1, /denied/], [2, /unavailable/], [3, /timed out/]]) {
      navigator.geolocation.getCurrentPosition = (success, error) => error({ code });
      await assert.rejects(getCurrentPosition(), message);
    }
  } finally {
    if (navigatorDescriptor) Object.defineProperty(globalThis, 'navigator', navigatorDescriptor);
    else delete globalThis.navigator;
    if (secureDescriptor) Object.defineProperty(globalThis, 'isSecureContext', secureDescriptor);
    else delete globalThis.isSecureContext;
  }
});
