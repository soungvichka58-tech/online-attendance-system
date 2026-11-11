import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Search, FileSpreadsheet, Filter } from 'lucide-react';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { formatDateOnly, formatDateTime } from '../../utils/dateUtils';
import { exportAttendanceToExcel } from '../../utils/exportExcel';
import toast from 'react-hot-toast';

const AttendanceRecords = () => {
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState('all');
  const [selectedSession, setSelectedSession] = useState('all');
  const [selectedDate, setSelectedDate] = useState('');

  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const attQ = query(collection(db, 'attendance'), where('teacherId', '==', user.uid));
        const sessQ = query(collection(db, 'sessions'), where('createdBy', '==', user.uid));

        const [attSnap, sessSnap] = await Promise.all([getDocs(attQ), getDocs(sessQ)]);

        const attList = attSnap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (b.submittedAt?.seconds || 0) - (a.submittedAt?.seconds || 0));

        const sessList = sessSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

        setRecords(attList);
        setSessions(sessList);
      } catch (err) {
        console.error(err);
        toast.error('Failed to load attendance records.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user]);

  const uniqueClasses = Array.from(new Set(records.map((r) => r.className).filter(Boolean)));

  const filteredRecords = records.filter((rec) => {
    const matchesSearch =
      rec.studentId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rec.studentName?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesClass = selectedClass === 'all' || rec.className === selectedClass;
    const matchesSession = selectedSession === 'all' || rec.sessionId === selectedSession;
    const matchesDate = !selectedDate || formatDateOnly(rec.submittedAt) === selectedDate;

    return matchesSearch && matchesClass && matchesSession && matchesDate;
  });

  const handleExportFiltered = () => {
    try {
      exportAttendanceToExcel(filteredRecords, 'Filtered_Attendance_Records');
      toast.success('Exported filtered records to Excel!');
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Attendance Records</h1>
          <p className="text-sm text-slate-500 mt-1">
            Search and filter all student attendance submissions across sessions.
          </p>
        </div>
        <button
          onClick={handleExportFiltered}
          disabled={filteredRecords.length === 0}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold shadow-sm transition"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Export Current View ({filteredRecords.length})</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
          <Filter className="w-3.5 h-3.5" />
          <span>Search & Filter</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Student ID or Name..."
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-600 outline-none"
            />
          </div>

          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm bg-white focus:ring-2 focus:ring-indigo-600 outline-none"
          >
            <option value="all">All Classes / Groups</option>
            {uniqueClasses.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={selectedSession}
            onChange={(e) => setSelectedSession(e.target.value)}
            className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm bg-white focus:ring-2 focus:ring-indigo-600 outline-none"
          >
            <option value="all">All Sessions</option>
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title} ({s.className})
              </option>
            ))}
          </select>

          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm bg-white focus:ring-2 focus:ring-indigo-600 outline-none"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-500">
            No matching attendance records found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <th className="py-3.5 px-4">Student ID</th>
                  <th className="py-3.5 px-4">Full Name</th>
                  <th className="py-3.5 px-4">Class / Group</th>
                  <th className="py-3.5 px-4">Session</th>
                  <th className="py-3.5 px-4">Submission Date & Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredRecords.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50/70">
                    <td className="py-3.5 px-4 font-mono font-semibold text-indigo-600">
                      {rec.studentId}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-900">
                      {rec.studentName}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">{rec.className}</td>
                    <td className="py-3.5 px-4 text-slate-600">{rec.sessionTitle}</td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {formatDateTime(rec.submittedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendanceRecords;