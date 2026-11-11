import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import {
  PlusCircle,
  Copy,
  Eye,
  Lock,
  Unlock,
  Trash2,
  Search,
} from 'lucide-react';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { formatDateTime, getSessionComputedStatus } from '../../utils/dateUtils';
import toast from 'react-hot-toast';

const SessionsList = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchSessions = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const q = query(collection(db, 'sessions'), where('createdBy', '==', user.uid));
      const snap = await getDocs(q);
      const list = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setSessions(list);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [user]);

  const toggleStatus = async (session) => {
    const newStatus = session.status === 'closed' ? 'active' : 'closed';
    try {
      await updateDoc(doc(db, 'sessions', session.id), { status: newStatus });
      setSessions((prev) =>
        prev.map((s) => (s.id === session.id ? { ...s, status: newStatus } : s))
      );
      toast.success(
        newStatus === 'closed' ? 'Session closed manually.' : 'Session re-opened.'
      );
    } catch {
      toast.error('Could not update session status.');
    }
  };

  const handleDelete = async (sessionId) => {
    if (!window.confirm('Delete this session permanently?')) return;
    try {
      await deleteDoc(doc(db, 'sessions', sessionId));
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      toast.success('Session deleted.');
    } catch {
      toast.error('Failed to delete session.');
    }
  };

  const copyLink = (id) => {
    const url = `${window.location.origin}/attend/${id}`;
    navigator.clipboard.writeText(url);
    toast.success('Student attendance link copied!');
  };

  const filtered = sessions.filter(
    (s) =>
      s.title?.toLowerCase().includes(search.toLowerCase()) ||
      s.className?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Attendance Sessions</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage links, opening/closing windows, and session status.
          </p>
        </div>
        <Link
          to="/sessions/new"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-sm transition"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Create Session</span>
        </Link>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200/80">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by session title or class..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-600 outline-none"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-500">
            No attendance sessions found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <th className="py-3.5 px-4">Session Title</th>
                  <th className="py-3.5 px-4">Class / Group</th>
                  <th className="py-3.5 px-4">Opens At</th>
                  <th className="py-3.5 px-4">Closes At</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filtered.map((session) => {
                  const computed = getSessionComputedStatus(session);
                  return (
                    <tr key={session.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        <Link
                          to={`/sessions/${session.id}`}
                          className="hover:text-indigo-600"
                        >
                          {session.title}
                        </Link>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">{session.className}</td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {formatDateTime(session.opensAt)}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {formatDateTime(session.closesAt)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
                            computed === 'open'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : computed === 'scheduled'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {computed.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => copyLink(session.id)}
                            title="Copy Shareable Link"
                            className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <Link
                            to={`/sessions/${session.id}`}
                            title="View & Edit Details"
                            className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => toggleStatus(session)}
                            title={
                              session.status === 'closed'
                                ? 'Re-open Session'
                                : 'Close Session Now'
                            }
                            className="p-2 text-slate-600 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                          >
                            {session.status === 'closed' ? (
                              <Unlock className="w-4 h-4" />
                            ) : (
                              <Lock className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={() => handleDelete(session.id)}
                            title="Delete Session"
                            className="p-2 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default SessionsList;