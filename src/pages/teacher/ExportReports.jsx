import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { FileSpreadsheet, Download } from 'lucide-react';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { exportAttendanceToExcel } from '../../utils/exportExcel';
import { formatDateTime } from '../../utils/dateUtils';
import toast from 'react-hot-toast';

const ExportReports = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const [sessSnap, attSnap] = await Promise.all([
          getDocs(query(collection(db, 'sessions'), where('createdBy', '==', user.uid))),
          getDocs(query(collection(db, 'attendance'), where('teacherId', '==', user.uid))),
        ]);

        setSessions(
          sessSnap.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
        );
        setAttendance(
          attSnap.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .sort((a, b) => (b.submittedAt?.seconds || 0) - (a.submittedAt?.seconds || 0))
        );
      } catch {
        toast.error('Failed to load export data.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  const exportAll = () => {
    try {
      exportAttendanceToExcel(attendance, 'All_Attendance_Records');
      toast.success('Complete attendance workbook downloaded!');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const exportSingleSession = (session) => {
    const sessionRecords = attendance.filter((a) => a.sessionId === session.id);
    try {
      exportAttendanceToExcel(sessionRecords, `${session.title}_${session.className}`);
      toast.success(`Exported ${session.title}!`);
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Export Reports (.xlsx)</h1>
          <p className="text-sm text-slate-500 mt-1">
            Download formatted Excel spreadsheets including Student ID, Name, Class, Date, and Timestamp.
          </p>
        </div>

        <button
          onClick={exportAll}
          disabled={attendance.length === 0}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold shadow-sm transition"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Export All Records ({attendance.length})</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <h2 className="font-bold text-slate-900">Export by Individual Session</h2>
        </div>

        {loading ? (
          <div className="p-12 flex justify-center">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-500">No sessions available.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {sessions.map((s) => {
              const count = attendance.filter((a) => a.sessionId === s.id).length;
              return (
                <div
                  key={s.id}
                  className="p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/70"
                >
                  <div>
                    <h3 className="font-semibold text-slate-900">{s.title}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Class: <span className="font-medium text-slate-700">{s.className}</span> •
                      Created: {formatDateTime(s.createdAt)} •{' '}
                      <span className="text-indigo-600 font-semibold">
                        {count} Present
                      </span>
                    </p>
                  </div>

                  <button
                    onClick={() => exportSingleSession(s)}
                    disabled={count === 0}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 disabled:opacity-40 text-slate-700 text-xs font-semibold transition"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Excel ({count})</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ExportReports;