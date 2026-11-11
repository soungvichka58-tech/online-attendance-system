import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarPlus, Copy, CheckCircle2, ExternalLink, ArrowLeft } from 'lucide-react';
import { saveSession } from '../../api/attendflow';
import StudentListPicker from '../../components/StudentListPicker';
import LocationRestriction from '../../components/LocationRestriction';
import { emptyLocationSettings, buildSessionRestrictions } from '../../utils/sessionRestrictions';
import { useAuth } from '../../context/AuthContext';
import { toDateTimeLocalString } from '../../utils/dateUtils';
import toast from 'react-hot-toast';

const CreateSession = () => {
  const { user, teacherProfile } = useAuth();
  const navigate = useNavigate();

  const now = new Date();
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

  const [title, setTitle] = useState('');
  const [className, setClassName] = useState('');
  const [expectedStudents, setExpectedStudents] = useState(
    teacherProfile?.totalExpectedStudents || 40
  );
  const [opensAt, setOpensAt] = useState(toDateTimeLocalString(now));
  const [closesAt, setClosesAt] = useState(toDateTimeLocalString(oneHourLater));
  const [loading, setLoading] = useState(false);
  const [createdSessionId, setCreatedSessionId] = useState(null);
  const [rosterList, setRosterList] = useState(null);
  const [locationSettings, setLocationSettings] = useState(emptyLocationSettings);
  const [importing, setImporting] = useState(false);
  const [locating, setLocating] = useState(false);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (loading || importing || locating) return;

    const cleanTitle = title.trim();
    const cleanClass = className.trim();
    const openDate = new Date(opensAt);
    const closeDate = new Date(closesAt);

    if (cleanTitle.length < 3) {
      toast.error('Session title must be at least 3 characters.');
      return;
    }
    if (cleanClass.length < 2) {
      toast.error('Please enter a valid class or group name.');
      return;
    }
    if (!Number.isFinite(openDate.getTime()) || !Number.isFinite(closeDate.getTime()) || closeDate <= openDate) {
      toast.error('Closing time must be after the opening time.');
      return;
    }

    try {
      buildSessionRestrictions(rosterList, locationSettings);
    } catch (err) {
      toast.error(err.message);
      return;
    }

    setLoading(true);
    try {
      const docRef = await saveSession({ rosterList, locationSettings, sessionData: {
        title: cleanTitle,
        className: cleanClass,
        expectedStudents: Number(expectedStudents) || 40,
        opensAt: openDate,
        closesAt: closeDate,
      } });

      setCreatedSessionId(docRef.id);
      toast.success('Attendance session created!');
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Failed to create session.');
    } finally {
      setLoading(false);
    }
  };

  const shareableLink = createdSessionId
    ? `${window.location.origin}/attend/${createdSessionId}`
    : '';

  const copyLink = () => {
    navigator.clipboard.writeText(shareableLink);
    toast.success('Unique attendance link copied!');
  };

  if (createdSessionId) {
    return (
      <div className="max-w-2xl mx-auto bg-white rounded-3xl border border-slate-200 p-8 shadow-sm text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-9 h-9" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Attendance Session Ready!</h2>
          <p className="text-sm text-slate-500 mt-1">
            Share this unique link with your students via Telegram, Messenger, or WhatsApp.
          </p>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-3">
          <input
            type="text"
            readOnly
            value={shareableLink}
            className="w-full bg-transparent text-sm font-mono text-slate-800 outline-none select-all"
          />
          <button
            onClick={copyLink}
            className="w-full sm:w-auto shrink-0 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition"
          >
            <Copy className="w-4 h-4" />
            <span>Copy Link</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            onClick={() => navigate(`/sessions/${createdSessionId}`)}
            className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold transition"
          >
            Monitor Session Live
          </button>
          <a
            href={shareableLink}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-semibold transition"
          >
            <span>Preview Student Form</span>
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back</span>
      </button>

      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <CalendarPlus className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Create Attendance Session</h1>
            <p className="text-xs text-slate-500">
              Generate a time-bound link for students to check in.
            </p>
          </div>
        </div>

        <form onSubmit={handleCreate} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Session Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Web Development Lecture 05"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Class or Group Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                placeholder="e.g., CS-2026 Group A"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Expected Class Size
              </label>
              <input
                type="number"
                min="1"
                max="2000"
                required
                value={rosterList?.studentCount || expectedStudents}
                readOnly={Boolean(rosterList)}
                onChange={(e) => setExpectedStudents(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Attendance Opens At <span className="text-rose-500">*</span>
              </label>
              <input
                type="datetime-local"
                required
                value={opensAt}
                onChange={(e) => setOpensAt(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Attendance Closes At <span className="text-rose-500">*</span>
              </label>
              <input
                type="datetime-local"
                required
                value={closesAt}
                onChange={(e) => setClosesAt(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 outline-none"
              />
            </div>
          </div>

          <StudentListPicker teacherId={user?.uid} value={rosterList} onChange={setRosterList} onBusyChange={setImporting} disabled={loading} />
          <LocationRestriction value={locationSettings} onChange={setLocationSettings} onBusyChange={setLocating} disabled={loading} />

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading || importing || locating}
              className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold rounded-xl shadow-md shadow-indigo-200 transition"
            >
              {loading ? 'Generating Session Link...' : 'Create Session & Generate Link'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateSession;
