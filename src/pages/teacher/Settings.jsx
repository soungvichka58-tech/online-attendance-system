import React, { useState, useEffect } from 'react';
import { Save, Settings as SettingsIcon } from 'lucide-react';
import { saveProfile } from '../../api/attendflow';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const Settings = () => {
  const { user, teacherProfile, refreshProfile } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [totalExpectedStudents, setTotalExpectedStudents] = useState(40);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (teacherProfile) {
      setDisplayName(teacherProfile.displayName || '');
      setTotalExpectedStudents(teacherProfile.totalExpectedStudents || 40);
    }
  }, [teacherProfile]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      await saveProfile({
        displayName: displayName.trim(),
        totalExpectedStudents: Number(totalExpectedStudents) || 40,
      });
      await refreshProfile();
      toast.success('Settings saved!');
    } catch {
      toast.error('Failed to update settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Instructor Settings</h1>
        <p className="text-sm text-slate-500 mt-1">
          Configure your profile name and default class roster size.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <SettingsIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-slate-900">Workspace Preferences</h2>
            <p className="text-xs text-slate-500">{user?.email}</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Instructor Display Name
            </label>
            <input
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-600 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Default Total Students per Class
            </label>
            <input
              type="number"
              min="1"
              max="2000"
              required
              value={totalExpectedStudents}
              onChange={(e) => setTotalExpectedStudents(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-600 outline-none"
            />
            <p className="text-xs text-slate-500 mt-1">
              Used to calculate Absent Students on the dashboard when a session doesn't specify a custom roster count.
            </p>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Preferences'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};

export default Settings;