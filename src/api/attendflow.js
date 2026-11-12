import { api } from './client.js';
import { buildSessionRestrictions } from '../utils/sessionRestrictions.js';

const BASE = '/api/v1/attendflow';
const toDate = (value) => (value ? new Date(value) : null);

// The pages use camelCase objects with Date values; the API uses snake_case JSON.

export const mapStudent = (s) => ({
  studentId: s.student_id,
  studentName: s.student_name,
  ...(s.name_kh ? { nameKh: s.name_kh } : {}),
  ...(s.group ? { group: s.group } : {}),
});

const mapList = (list) => ({
  id: list.id,
  name: list.name,
  studentCount: list.student_count,
  createdAt: toDate(list.created_at),
  // Summaries carry a 5-student preview; a full list carries every student.
  students: (list.students || list.preview || []).map(mapStudent),
  sessionCount: list.session_count ?? 0,
});

export const mapSession = (s) => ({
  id: s.id,
  title: s.title,
  className: s.class_name,
  expectedStudents: s.expected_students,
  opensAt: toDate(s.opens_at),
  closesAt: toDate(s.closes_at),
  status: s.status,
  createdAt: toDate(s.created_at),
  requiresRoster: Boolean(s.requires_roster),
  rosterCount: s.roster_count ?? 0,
  rosterListId: s.roster_list_id ?? null,
  rosterListName: s.roster_list_name ?? null,
  requiresLocation: Boolean(s.requires_location),
  location: s.location ?? null,
  radiusMeters: s.radius_meters ?? null,
  attendanceCount: s.attendance_count ?? 0,
});

export const mapAttendance = (r) => ({
  id: r.id,
  sessionId: r.session_id,
  sessionTitle: r.session_title,
  className: r.class_name,
  studentId: r.student_id,
  studentIdNormalized: r.student_id,
  studentName: r.student_name,
  submittedAt: toDate(r.submitted_at),
  location: r.location ?? null,
  locationAccuracy: r.accuracy_meters ?? null,
  distanceMeters: r.distance_meters ?? null,
  allowedRadiusMeters: r.allowed_radius_meters ?? null,
});

// Profile

export const fetchProfile = async () => {
  const p = await api(`${BASE}/profile`);
  return { displayName: p.display_name, totalExpectedStudents: p.total_expected_students };
};

export const saveProfile = async ({ displayName, totalExpectedStudents }) => {
  const p = await api(`${BASE}/profile`, {
    method: 'PUT',
    body: { display_name: displayName || '', total_expected_students: Number(totalExpectedStudents) || 40 },
  });
  return { displayName: p.display_name, totalExpectedStudents: p.total_expected_students };
};

// Saved student lists

export const fetchStudentLists = async () => (await api(`${BASE}/lists`)).map(mapList);

export const fetchStudentList = async (listId) => mapList(await api(`${BASE}/lists/${encodeURIComponent(listId)}`));

export const createStudentList = async ({ name, students }) => mapList(await api(`${BASE}/lists`, {
  method: 'POST',
  body: {
    name,
    students: students.map((s) => ({
      student_id: s.studentId,
      student_name: s.studentName,
      name_kh: s.nameKh || '',
      group: s.group || '',
    })),
  },
}));

export const deleteStudentList = (listId) => api(`${BASE}/lists/${encodeURIComponent(listId)}`, { method: 'DELETE' });

// Sessions and attendance

export const fetchSessions = async () => (await api(`${BASE}/sessions`)).map(mapSession);

export const fetchSession = async (id) => mapSession(await api(`${BASE}/sessions/${encodeURIComponent(id)}`));

export const setSessionStatus = async (id, status) => mapSession(await api(
  `${BASE}/sessions/${encodeURIComponent(id)}/status`, { method: 'PATCH', body: { status } },
));

export const deleteSession = (id) => api(`${BASE}/sessions/${encodeURIComponent(id)}`, { method: 'DELETE' });

export const fetchSessionAttendance = async (id) => (
  await api(`${BASE}/sessions/${encodeURIComponent(id)}/attendance`)
).map(mapAttendance);

export const fetchAllAttendance = async () => (await api(`${BASE}/attendance`)).map(mapAttendance);

// Public check-in (no account)

export const fetchPublicSession = async (id) => {
  const s = await api(`${BASE}/public/sessions/${encodeURIComponent(id)}`, { noRefresh: true });
  return {
    id: s.id,
    title: s.title,
    className: s.class_name,
    opensAt: toDate(s.opens_at),
    closesAt: toDate(s.closes_at),
    // The server's view of the session: open, scheduled, expired or closed.
    status: s.status === 'closed' ? 'closed' : 'active',
    publicStatus: s.status,
    requiresRoster: s.requires_roster,
    requiresLocation: s.requires_location,
    location: s.location,
    radiusMeters: s.radius_meters,
  };
};

export const lookupStudent = async (sessionId, studentId) => {
  try {
    return mapStudent(await api(
      `${BASE}/public/sessions/${encodeURIComponent(sessionId)}/students/${encodeURIComponent(studentId)}`,
      { noRefresh: true },
    ));
  } catch (err) {
    if (err.code === 'not_on_list') return null;
    throw err;
  }
};

export const checkIn = async (sessionId, { studentId, studentName, location }) => mapAttendance(await api(
  `${BASE}/public/sessions/${encodeURIComponent(sessionId)}/check-in`,
  {
    method: 'POST',
    noRefresh: true,
    body: {
      student_id: studentId,
      student_name: studentName || '',
      ...(location ? { location } : {}),
    },
  },
));

// Create (no sessionId) or update a session. Dates are Date objects; rosterList is a saved
// list or null; locationSettings comes from the location form.
export async function saveSession({ sessionId, sessionData, rosterList, locationSettings }) {
  const body = {
    title: sessionData.title,
    class_name: sessionData.className,
    expected_students: Number(sessionData.expectedStudents) || 40,
    opens_at: sessionData.opensAt.toISOString(),
    closes_at: sessionData.closesAt.toISOString(),
    ...buildSessionRestrictions(rosterList, locationSettings),
  };
  const path = sessionId ? `${BASE}/sessions/${encodeURIComponent(sessionId)}` : `${BASE}/sessions`;
  return mapSession(await api(path, { method: sessionId ? 'PUT' : 'POST', body }));
}
