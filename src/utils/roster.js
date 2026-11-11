import * as XLSX from 'xlsx';

export const MAX_ROSTER_SIZE = 2000;
export const MAX_ROSTER_FILE_BYTES = 5 * 1024 * 1024;
const HEADER_SEARCH_ROWS = 30;

export const normalizeStudentId = (value) => String(value ?? '').trim().toUpperCase();
export const isValidStudentId = (value) => /^[A-Z0-9_-]{2,30}$/.test(value);
export const cleanText = (value) => String(value ?? '').trim().replace(/\s+/g, ' ');

const normalizeHeader = (value) => String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');

// Header names are compared after removing spaces, underscores and punctuation.
const HEADER_ALIASES = {
  id: ['studentid', 'id', 'studentcode', 'idno', 'studentidno', 'studentnumber'],
  name: ['fullname', 'studentname', 'name', 'nameen', 'englishname', 'fullnameen', 'namelatin'],
  nameKh: ['namekh', 'khmername', 'khname', 'namekhmer', 'fullnamekh'],
  group: ['group', 'groupe', 'section'],
};

const findColumns = (row) => {
  const headers = row.map(normalizeHeader);
  const column = (key) => headers.findIndex((header) => HEADER_ALIASES[key].includes(header));
  return { id: column('id'), name: column('name'), nameKh: column('nameKh'), group: column('group') };
};

const isBlankRow = (row) => !row.some((cell) => String(cell ?? '').trim());

export function parseRosterRows(rows) {
  if (!rows.some((row) => !isBlankRow(row))) throw new Error('The student list is empty.');

  // Class lists often have title rows above the header, so search the first rows for it.
  let headerRow = -1;
  let columns = null;
  for (let index = 0; index < Math.min(rows.length, HEADER_SEARCH_ROWS); index += 1) {
    const found = findColumns(rows[index]);
    if (found.id >= 0 && found.name >= 0) {
      headerRow = index;
      columns = found;
      break;
    }
  }
  if (headerRow < 0) {
    throw new Error('Include a header row with ID and Name columns (for example: No, ID, Name, Name_KH, Groupe).');
  }

  const students = [];
  const seen = new Set();
  for (let index = headerRow + 1; index < rows.length; index += 1) {
    const row = rows[index];
    const studentId = normalizeStudentId(row[columns.id]);
    const studentName = cleanText(row[columns.name]);
    // Skip empty rows, including rows that only keep a running number.
    if (!studentId && !studentName) continue;
    if (!isValidStudentId(studentId)) {
      throw new Error(`Row ${index + 1}: Student ID must contain 2–30 letters, numbers, underscores, or hyphens.`);
    }
    if (studentName.length < 2 || studentName.length > 100) {
      throw new Error(`Row ${index + 1}: Name must contain 2–100 characters.`);
    }
    if (seen.has(studentId)) throw new Error(`Row ${index + 1}: Duplicate Student ID "${studentId}".`);
    seen.add(studentId);

    const student = { studentId, studentName };
    const nameKh = columns.nameKh >= 0 ? cleanText(row[columns.nameKh]) : '';
    const group = columns.group >= 0 ? cleanText(row[columns.group]) : '';
    if (nameKh.length > 100) throw new Error(`Row ${index + 1}: Khmer name must be 100 characters or fewer.`);
    if (group.length > 30) throw new Error(`Row ${index + 1}: Group must be 30 characters or fewer.`);
    if (nameKh) student.nameKh = nameKh;
    if (group) student.group = group;
    students.push(student);
    if (students.length > MAX_ROSTER_SIZE) throw new Error(`Import up to ${MAX_ROSTER_SIZE} students per list.`);
  }
  if (!students.length) throw new Error('Add at least one student below the header row.');
  if (new TextEncoder().encode(JSON.stringify(rosterToMap(students))).length > 850000) {
    throw new Error('This student list is too large to save. Split it into smaller class lists.');
  }
  return students;
}

export function parseRosterFile(data) {
  const workbook = XLSX.read(data, { type: 'array', cellText: true });
  if (workbook.SheetNames.length !== 1) {
    throw new Error('Use a file with exactly one worksheet so no student lists are missed.');
  }
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], {
    header: 1, raw: false, defval: '', blankrows: true,
  });
  return parseRosterRows(rows);
}

export const listNameFromFilename = (filename) => cleanText(String(filename ?? '').replace(/\.[^.]+$/, '').replace(/[_]+/g, ' ')).slice(0, 80);

// Firestore maps do not keep insertion order, so store each student's file position.
export const rosterToMap = (students) => Object.fromEntries(
  students.map((student, order) => [student.studentId, { ...student, order }]),
);

export const rosterFromMap = (map) => Object.values(map || {})
  .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.studentId.localeCompare(b.studentId));

export function compareRoster(students, records) {
  const byId = new Map(records.map((record) => [record.studentIdNormalized || normalizeStudentId(record.studentId), record]));
  return students.map((student) => ({ ...student, attendance: byId.get(student.studentId) || null }));
}
