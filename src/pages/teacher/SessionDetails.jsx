import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  Timestamp,
} from 'firebase/firestore';
import {
  ArrowLeft,
  Copy,
  FileSpreadsheet,
  Save,
  Lock,
  Unlock,
  ExternalLink,
} from 'lucide-react';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import {
  formatDateTime,
  getSessionComputedStatus,
  toDateTimeLocalString,
} from '../../utils/dateUtils';
import { exportAttendanceToExcel } from '../../utils/exportExcel';
import toast from 'react-hot-toast';

const SessionDetails = () => {
  const { sessionId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [session, setSession] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  const [title, setTitle] = useState('');
  const [className, setClassName] = useState('');
  const [expectedStudents, setExpectedStudents] = useState(40);
  const [opensAt, setOpensAt] = useState('');
  const [closesAt, setClosesAt] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchDetails = async () => {
    if (!user || !sessionId) return;
    setLoading(true);
    try {
      const sessionRef = doc(db, 'sessions', sessionId);
      const sessionSnap = await getDoc(sessionRef);

      if (!sessionSnap.exists() || sessionSnap.data().createdBy !== user.uid) {
        toast.error('Session not found or unauthorized.');
        navigate('/sessions');
        return;
      }

      const data = { id: sessionSnap.id, ...sessionSnap.data() };
      setSession(data);
      setTitle(data.title || '');
      setClassName(data.className || '');
      setExpectedStudents(data.expectedStudents || 40);
      if (data.opensAt?.toDate) {
        setOpensAt(toDateTimeLocalString(data.opensAt.toDate()));
      }
      if (data.closesAt?.toDate) {
        setClosesAt(toDateTimeLocalString(data.closesAt.toDate()));
      }

      const q = query(
        collection(db, 'attendance'),
        where('teacherId', '==', user.uid),
        where('sessionId', '==', sessionId)
      );
      const attSnap = await getDocs(q);
      const list = attSnap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.submittedAt?.seconds || 0) - (a.submittedAt?.seconds || 0));
      setRecords(list);
    } catch (err) {
      console.error(err);
      toast.error('Error loading session details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [sessionId, user]);

  const handleSaveChanges = async (e) => {
    e.preventDefault();
    const openDate = new Date(opensAt);
    const closeDate = new Date(closesAt);
    if (closeDate <= openDate) {
      toast.error('Closing time must be after opening time.');
      return;
    }

    setSaving(true);
    try {
      const updates = {
        title: title.trim(),
        className: className.trim(),
        expectedStudents: Number(expectedStudents) || 40,
        opensAt: Timestamp.fromDate(openDate),
        closesAt: Timestamp.fromDate(closeDate),
      };
      await updateDoc(doc(db, 'sessions', sessionId), updates);
      setSession((prev) => ({ ...prev, ...updates }));
      toast.success('Session updated successfully!');
    } catch {
      toast.error('Failed to update session.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleLock = async () => {
    if (!session) return;
    const nextStatus = session.status === 'closed' ? 'active' : 'closed';
    try {
      await updateDoc(doc(db, 'sessions', sessionId), { status: nextStatus });
      setSession((prev) => ({ ...prev, status: nextStatus }));
      toast.success(nextStatus === 'closed' ? 'Session closed.' : 'Session re-opened.');
    } catch {
      toast.error('Failed to change status.');
    }
  };

  const handleExport = () => {
    try {
      exportAttendanceToExcel(records, `${session?.title}_${session?.className}`);
      toast.success('Excel report downloaded!');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const shareableLink = `${window.location.origin}/attend/${sessionId}`;

  if (loading) {
    return (
      <div className="py-16 flex justify-center">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const computedStatus = getSessionComputedStatus(session);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          onClick={() => navigate('/sessions')}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Sessions</span>
        </button>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleToggleLock}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold border transition ${
              session?.status === 'closed'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
            }`}
          >
            {session?.status === 'closed' ? (
              <>
                <Unlock className="w-4 h-4" />
                <span>Re-Open Session</span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                <span>Close Session Now</span>
              </>
            )}
          </button>

          <button
            onClick={handleExport}
            disabled={records.length === 0}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold transition"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Session (.xlsx)</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
              Shareable Student Link
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                computedStatus === 'open'
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {computedStatus.toUpperCase()}
            </span>
          </div>
          <p className="text-sm font-mono text-slate-700 mt-1 break-all">{shareableLink}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => {
              navigator.clipboard.writeText(shareableLink);
              toast.success('Link copied!');
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold transition"
          >
            <Copy className="w-4 h-4" />
            <span>Copy Link</span>
          </button>
          <a
            href={shareableLink}
            target="_blank"
            rel="noreferrer"
            className="p-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700"
            title="Open Student Form"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 h-fit">
          <h2 className="font-bold text-slate-900 mb-4">Edit Session Settings</h2>
          <form onSubmit={handleSaveChanges} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                Title
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                Class / Group
              </label>
              <input
                type="text"
                required
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                Expected Students
              </label>
              <input
                type="number"
                min="1"
                required
                value={expectedStudents}
                onChange={(e) => setExpectedStudents(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                Opens At
              </label>
              <input
                type="datetime-local"
                required
                value={opensAt}
                onChange={(e) => setOpensAt(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                Closes At
              </label>
              <input
                type="datetime-local"
                required
                value={closesAt}
                onChange={(e) => setClosesAt(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </form>
        </div>

        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-slate-900">
                Submitted Attendance ({records.length} / {expectedStudents})
              </h2>
              <p className="text-xs text-slate-500">
                Absent: {Math.max(0, expectedStudents - records.length)} students
              </p>
            </div>
            <button
              onClick={fetchDetails}
              className="text-xs font-semibold text-indigo-600 hover:underline"
            >
              Refresh List
            </button>
          </div>

          {records.length === 0 ? (
            <div className="p-12 text-center text-sm text-slate-500">
              No students have submitted attendance for this session yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase text-slate-500">
                    <th className="py-3 px-4">#</th>
                    <th className="py-3 px-4">Student ID</th>
                    <th className="py-3 px-4">Full Name</th>
                    <th className="py-3 px-4">Submitted At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {records.map((r, idx) => (
                    <tr key={r.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 text-slate-500">{idx + 1}</td>
                      <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                        {r.studentId}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-800">{r.studentName}</td>
                      <td className="py-3 px-4 text-slate-500">
                        {formatDateTime(r.submittedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SessionDetails;