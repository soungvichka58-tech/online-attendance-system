import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarClock,
  Users,
  UserCheck,
  UserX,
  PlusCircle,
  ArrowUpRight,
  Clock,
  Copy,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import StatCard from '../../components/StatCard';
import { formatDateTime, getSessionComputedStatus } from '../../utils/dateUtils';
import toast from 'react-hot-toast';
import { compareRoster } from '../../utils/roster';
import { fetchAllAttendance, fetchSessions, fetchStudentList, mapAttendance } from '../../api/attendflow';
import { ATTENDANCE_CREATED, onRealtime } from '../../api/realtime';

const Dashboard = () => {
  const { user, teacherProfile } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSessionId, setSelectedSessionId] = useState('latest');
  const [selectedRoster, setSelectedRoster] = useState(null);
  const [rosterError, setRosterError] = useState(false);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;
      setLoading(true);
      try {
        // Both arrive newest first.
        const [sessionsList, attendanceList] = await Promise.all([
          fetchSessions(),
          fetchAllAttendance(),
        ]);

        setSessions(sessionsList);
        setAttendance(attendanceList);
      } catch (err) {
        console.error(err);
        toast.error('Failed to load dashboard metrics.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  // Live check-ins for any of this teacher's sessions.
  useEffect(() => onRealtime(ATTENDANCE_CREATED, (data) => {
    const record = mapAttendance(data);
    setAttendance((prev) => (prev.some((r) => r.id === record.id) ? prev : [record, ...prev]));
  }), []);

  const activeSession =
    selectedSessionId === 'latest'
      ? sessions[0]
      : sessions.find((s) => s.id === selectedSessionId) || sessions[0];

  useEffect(() => {
    let cancelled = false;
    setSelectedRoster(null);
    setRosterError(false);
    if (!activeSession?.requiresRoster) return;
    fetchStudentList(activeSession.rosterListId).then((list) => {
      if (!cancelled) setSelectedRoster({ sessionId: activeSession.id, students: list.students });
    }).catch(() => { if (!cancelled) setRosterError(true); });
    return () => { cancelled = true; };
  }, [activeSession?.id, activeSession?.requiresRoster, activeSession?.rosterListId]);

  const expectedRoster =
    Number(activeSession?.expectedStudents) ||
    Number(teacherProfile?.totalExpectedStudents) ||
    40;

  const selectedRecords = attendance.filter((record) => record.sessionId === activeSession?.id);
  const rosterReady = !activeSession?.requiresRoster || selectedRoster?.sessionId === activeSession?.id;
  const presentInSelectedSession = activeSession?.requiresRoster
    ? compareRoster(rosterReady ? selectedRoster.students : [], selectedRecords).filter((row) => row.attendance).length
    : selectedRecords.length;

  const absentInSelectedSession = Math.max(0, expectedRoster - presentInSelectedSession);

  const copyShareLink = (sessionId) => {
    const url = `${window.location.origin}/attend/${sessionId}`;
    navigator.clipboard.writeText(url);
    toast.success('Attendance link copied to clipboard!');
  };

  if (loading) {
    return (
      <div className="py-16 flex justify-center">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Teacher Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time overview of your attendance sessions and student check-ins.
          </p>
        </div>
        <Link
          to="/sessions/new"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-sm shadow-indigo-200 transition"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New Attendance Session</span>
        </Link>
      </div>

      {sessions.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-sm text-slate-600">
            Showing <span className="font-semibold text-slate-900">Present / Absent</span> metrics for session:
          </div>
          <select
            value={selectedSessionId}
            onChange={(e) => setSelectedSessionId(e.target.value)}
            className="px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-medium text-slate-800 bg-slate-50 focus:ring-2 focus:ring-indigo-600 outline-none"
          >
            <option value="latest">Latest: {sessions[0]?.title} ({sessions[0]?.className})</option>
            {sessions.slice(1).map((s) => (
              <option key={s.id} value={s.id}>
                {s.title} ({s.className})
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Total Sessions"
          value={sessions.length}
          subtitle={`${sessions.filter((s) => getSessionComputedStatus(s) === 'open').length} currently open`}
          icon={CalendarClock}
          color="indigo"
        />
        <StatCard
          title="Total Students (Class Size)"
          value={expectedRoster}
          subtitle={activeSession ? `Class: ${activeSession.className}` : 'Default class roster'}
          icon={Users}
          color="amber"
        />
        <StatCard
          title="Present Students"
          value={rosterReady ? presentInSelectedSession : '—'}
          subtitle={
            !rosterReady ? (rosterError ? 'Unable to load student list' : 'Loading student list…') : activeSession
              ? `${Math.round((presentInSelectedSession / expectedRoster) * 100 || 0)}% attendance rate`
              : 'No active session'
          }
          icon={UserCheck}
          color="emerald"
        />
        <StatCard
          title="Absent Students"
          value={rosterReady ? absentInSelectedSession : '—'}
          subtitle={activeSession ? `From ${activeSession.title}` : 'No active session'}
          icon={UserX}
          color="rose"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-bold text-slate-900">Recent Attendance Sessions</h2>
            <Link
              to="/sessions"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
            >
              View All <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {sessions.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">
                No sessions created yet. Create your first session to generate a student link!
              </div>
            ) : (
              sessions.slice(0, 5).map((session) => {
                const status = getSessionComputedStatus(session);
                return (
                  <div key={session.id} className="p-4 hover:bg-slate-50/80 transition flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <Link
                        to={`/sessions/${session.id}`}
                        className="font-semibold text-slate-900 hover:text-indigo-600 truncate block"
                      >
                        {session.title}
                      </Link>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {session.className} • Closes {formatDateTime(session.closesAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          status === 'open'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : status === 'scheduled'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {status.toUpperCase()}
                      </span>
                      <button
                        onClick={() => copyShareLink(session.id)}
                        title="Copy student submission link"
                        className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-bold text-slate-900">Recent Student Check-Ins</h2>
            <Link
              to="/records"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
            >
              All Records <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {attendance.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">
                No student submissions recorded yet.
              </div>
            ) : (
              attendance.slice(0, 6).map((item) => (
                <div key={item.id} className="p-4 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">
                      {item.studentName}{' '}
                      <span className="text-xs font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md ml-1">
                        {item.studentId}
                      </span>
                    </p>
                    <p className="text-xs text-slate-500 truncate mt-0.5">
                      {item.sessionTitle} ({item.className})
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-slate-500 shrink-0">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{formatDateTime(item.submittedAt)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
