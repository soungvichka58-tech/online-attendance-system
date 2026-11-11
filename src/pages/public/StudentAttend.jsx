import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import {
  GraduationCap,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Send,
  ShieldCheck,
} from 'lucide-react';
import { db } from '../../firebase/config';
import { formatDateTime, getSessionComputedStatus } from '../../utils/dateUtils';

const StudentAttend = () => {
  const { sessionId } = useParams();

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [networkError, setNetworkError] = useState('');

  const [studentId, setStudentId] = useState('');
  const [studentName, setStudentName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  useEffect(() => {
    const fetchSession = async () => {
      setLoading(true);
      setNetworkError('');
      try {
        const ref = doc(db, 'sessions', sessionId);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          setSession(null);
        } else {
          setSession({ id: snap.id, ...snap.data() });
        }
      } catch (err) {
        console.error(err);
        setNetworkError(
          'Unable to connect to the attendance server. Please check your internet connection and try again.'
        );
      } finally {
        setLoading(false);
      }
    };

    if (sessionId) {
      fetchSession();
    } else {
      setLoading(false);
    }
  }, [sessionId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    const cleanId = studentId.trim().toUpperCase();
    const normalizedId = cleanId.replace(/[^A-Z0-9_-]/g, '');
    const cleanName = studentName.trim().replace(/\s+/g, ' ');

    if (normalizedId.length < 2 || normalizedId.length > 30) {
      setFormError('Please enter a valid Student ID (2–30 alphanumeric characters).');
      return;
    }
    if (cleanName.length < 2 || cleanName.length > 100) {
      setFormError('Please enter your full name (at least 2 characters).');
      return;
    }

    const currentStatus = getSessionComputedStatus(session);
    if (currentStatus !== 'open') {
      setFormError('This attendance session is no longer accepting submissions.');
      return;
    }

    setSubmitting(true);
    try {
      const attendanceDocId = `${session.id}_${normalizedId}`;
      const attendanceRef = doc(db, 'attendance', attendanceDocId);

      await setDoc(attendanceRef, {
        studentId: cleanId,
        studentIdNormalized: normalizedId,
        studentName: cleanName,
        sessionId: session.id,
        sessionTitle: session.title,
        className: session.className,
        teacherId: session.createdBy,
        submittedAt: serverTimestamp(),
      });

      setSubmittedSuccess(true);
    } catch (err) {
      console.error('Submission error:', err);
      if (err.code === 'permission-denied') {
        try {
          const latestSnap = await getDoc(doc(db, 'sessions', session.id));
          const latestSession = latestSnap.exists()
            ? { id: latestSnap.id, ...latestSnap.data() }
            : null;
          setSession(latestSession);

          if (!latestSession || getSessionComputedStatus(latestSession) !== 'open') {
            setFormError('Attendance session is closed or has expired.');
          } else {
            setFormError(
              `Student ID "${cleanId}" has already submitted attendance for this session.`
            );
          }
        } catch {
          setFormError(
            `Duplicate submission detected for Student ID "${cleanId}" or session is closed.`
          );
        }
      } else {
        setFormError(
          'Network error occurred while submitting. Please check your connection and try again.'
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-slate-600">Loading attendance session...</p>
        </div>
      </div>
    );
  }

  if (networkError) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 p-8 text-center shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">Connection Error</h1>
          <p className="text-sm text-slate-600 mt-2">{networkError}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 w-full py-2.5 px-4 bg-indigo-600 text-white font-semibold rounded-xl"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const sessionStatus = getSessionComputedStatus(session);
  if (!session || sessionStatus !== 'open') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 p-8 text-center shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">
            {!session
              ? 'Invalid Attendance Link'
              : sessionStatus === 'scheduled'
              ? 'Session Not Open Yet'
              : 'Attendance Session Closed'}
          </h1>
          <p className="text-sm text-slate-600 mt-2">
            {!session
              ? 'This attendance link does not exist or may have been removed by the instructor.'
              : sessionStatus === 'scheduled'
              ? `This session will open at ${formatDateTime(session.opensAt)}.`
              : `This session "${session.title}" is closed and no longer accepting attendance submissions.`}
          </p>
          {session && (
            <div className="mt-5 p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
              <p className="font-semibold text-slate-800">{session.title}</p>
              <p>Class: {session.className}</p>
              <p>Closed at: {formatDateTime(session.closesAt)}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (submittedSuccess) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 p-8 text-center shadow-sm space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Attendance Recorded!</h1>
            <p className="text-sm text-slate-600 mt-1">
              Your attendance has been securely verified and saved.
            </p>
          </div>

          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 text-left text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-500">Student ID:</span>
              <span className="font-mono font-bold text-slate-900">
                {studentId.trim().toUpperCase()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Name:</span>
              <span className="font-semibold text-slate-900">{studentName.trim()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Class / Group:</span>
              <span className="font-medium text-slate-800">{session.className}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Session:</span>
              <span className="font-medium text-slate-800">{session.title}</span>
            </div>
          </div>

          <p className="text-xs text-slate-400">You may now safely close this tab.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50/60 via-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200/90 shadow-xl overflow-hidden">
        <div className="bg-indigo-600 p-6 text-white">
          <div className="flex items-center gap-2.5 text-indigo-100 text-xs font-semibold uppercase tracking-wider mb-2">
            <GraduationCap className="w-4 h-4" />
            <span>Student Attendance Check-In</span>
          </div>
          <h1 className="text-xl font-bold leading-snug">{session.title}</h1>
          <div className="flex items-center gap-1.5 text-xs text-indigo-100 mt-2">
            <Clock className="w-3.5 h-3.5" />
            <span>Closes at {formatDateTime(session.closesAt)}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-5">
          {formError && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              Class / Group
            </label>
            <input
              type="text"
              readOnly
              value={session.className}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 text-sm font-semibold cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
              Student ID <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              placeholder="e.g., ST2026001"
              className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm font-mono uppercase focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
              Full Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              placeholder="Enter your full name"
              className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold rounded-xl shadow-md shadow-indigo-200 flex items-center justify-center gap-2 transition"
          >
            <Send className="w-4 h-4" />
            <span>{submitting ? 'Recording Attendance...' : 'Submit Attendance'}</span>
          </button>

          <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400 pt-1">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>One submission allowed per student ID</span>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StudentAttend;