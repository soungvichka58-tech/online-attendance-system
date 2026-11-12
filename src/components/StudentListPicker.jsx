import React, { useEffect, useId, useRef, useState } from 'react';
import { Download, Trash2, Upload, Users } from 'lucide-react';
import { MAX_ROSTER_FILE_BYTES, listNameFromFilename, parseRosterFile } from '../utils/roster';
import {
  createStudentList, deleteStudentList, fetchStudentList, fetchStudentLists,
} from '../api/attendflow';

const TEMPLATE_CSV = 'No,ID,Name,Name_KH,Groupe\r\n1,e20240001,SAMPLE STUDENT,,A\r\n2,e20240002,ANOTHER STUDENT,,B\r\n';

const StudentPreview = ({ students }) => {
  const hasKh = students.some((student) => student.nameKh);
  const hasGroup = students.some((student) => student.group);
  return (
    <div className="space-y-1">
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-100 text-slate-600">
            <tr><th className="p-2">ID</th><th className="p-2">Name</th>{hasKh && <th className="p-2">Name (KH)</th>}{hasGroup && <th className="p-2">Group</th>}</tr>
          </thead>
          <tbody>
            {students.slice(0, 5).map((student) => (
              <tr key={student.studentId} className="border-t border-slate-100">
                <td className="p-2 font-mono">{student.studentId}</td>
                <td className="p-2">{student.studentName}</td>
                {hasKh && <td className="p-2">{student.nameKh}</td>}
                {hasGroup && <td className="p-2">{student.group}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {students.length > 5 && <p className="text-xs text-slate-500">Showing the first 5 of {students.length} students.</p>}
    </div>
  );
};

const StudentListPicker = ({ teacherId, value, onChange, onBusyChange, disabled = false }) => {
  const selectId = useId();
  const fileId = useId();
  const nameId = useId();
  const fileRef = useRef(null);
  const [lists, setLists] = useState([]);
  const [loadingLists, setLoadingLists] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [draft, setDraft] = useState(null); // { students, filename }
  const [draftName, setDraftName] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  const setBusyState = (state) => {
    setBusy(state);
    onBusyChange?.(Boolean(state));
  };

  const loadLists = async () => {
    setLoadingLists(true);
    setLoadError('');
    try {
      setLists(await fetchStudentLists());
    } catch (err) {
      console.error(err);
      setLoadError('Unable to load your saved student lists.');
    } finally {
      setLoadingLists(false);
    }
  };

  useEffect(() => {
    if (teacherId) loadLists();
  }, [teacherId]);

  // A session may use a list that is not in the loaded set yet (for example while loading).
  const options = value && !lists.some((list) => list.id === value.id) ? [value, ...lists] : lists;

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError('');
    setBusyState('reading');
    try {
      if (!/\.(csv|xlsx|xls)$/i.test(file.name)) throw new Error('Choose a CSV, XLSX, or XLS file.');
      if (file.size > MAX_ROSTER_FILE_BYTES) throw new Error('Choose a student list smaller than 5 MB.');
      const students = parseRosterFile(await file.arrayBuffer());
      setDraft({ students, filename: file.name });
      setDraftName(listNameFromFilename(file.name) || 'Student list');
    } catch (err) {
      setError(err.message || 'Unable to read this file. Please check the student list.');
    } finally {
      setBusyState('');
      event.target.value = '';
    }
  };

  const cancelDraft = () => {
    setDraft(null);
    setDraftName('');
    setError('');
    if (fileRef.current) fileRef.current.value = '';
  };

  const saveDraft = async () => {
    const name = draftName.trim().replace(/\s+/g, ' ');
    if (!name || name.length > 80) {
      setError('Give the list a name of 1–80 characters.');
      return;
    }
    setError('');
    setBusyState('saving');
    try {
      const saved = await createStudentList({ name, students: draft.students });
      setLists((prev) => [saved, ...prev]);
      onChange(saved);
      cancelDraft();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Unable to save the student list. Check your connection and try again.');
    } finally {
      setBusyState('');
    }
  };

  const handleDelete = async () => {
    if (!value) return;
    setError('');
    setBusyState('deleting');
    try {
      const { sessionCount } = await fetchStudentList(value.id);
      const warning = sessionCount
        ? `Delete "${value.name}"? It is removed from your saved lists, but the ${sessionCount} session(s) already using it keep working.`
        : `Delete the saved list "${value.name}"?`;
      if (!window.confirm(warning)) return;
      await deleteStudentList(value.id);
      setLists((prev) => prev.filter((list) => list.id !== value.id));
      onChange(null);
    } catch (err) {
      console.error(err);
      setError('Unable to delete the student list. Please try again.');
    } finally {
      setBusyState('');
    }
  };

  const locked = disabled || Boolean(busy);

  return (
    <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
      <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900"><Users className="w-4 h-4" />Student list</h3>
      <p className="text-xs text-slate-600">Choose a saved class list, or import a new one once and reuse it for every session. Students must enter an ID from the list and will see their name to confirm it. The complete list is visible only to you.</p>

      <div>
        <label htmlFor={selectId} className="block text-xs font-semibold text-slate-700 mb-1">Saved student lists</label>
        <select id={selectId} value={value?.id ?? ''} disabled={locked || loadingLists}
          onChange={(event) => onChange(options.find((list) => list.id === event.target.value) ?? null)}
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm disabled:opacity-60">
          <option value="">No list (any student ID can check in)</option>
          {options.map((list) => <option key={list.id} value={list.id}>{list.name} ({list.studentCount} students)</option>)}
        </select>
        {loadingLists && <p role="status" className="mt-1 text-xs text-slate-500">Loading saved lists…</p>}
        {loadError && <p role="alert" className="mt-1 text-xs text-rose-700">{loadError} <button type="button" onClick={loadLists} className="font-semibold text-indigo-600">Retry</button></p>}
        {!loadingLists && !loadError && lists.length === 0 && !draft && <p className="mt-1 text-xs text-slate-500">You have no saved lists yet. Import one below.</p>}
      </div>

      {value && !draft && (
        <div className="space-y-2">
          <p role="status" className="text-xs font-semibold text-emerald-700">Using "{value.name}" with {value.studentCount} students. Expected class size follows this list.</p>
          {value.students?.length > 0 && <StudentPreview students={value.students} />}
          <button type="button" disabled={locked} onClick={handleDelete} className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 disabled:opacity-50">
            <Trash2 className="w-3.5 h-3.5" />{busy === 'deleting' ? 'Deleting…' : 'Delete this saved list'}
          </button>
        </div>
      )}

      <div className="border-t border-slate-200 pt-3 space-y-2">
        <label htmlFor={fileId} className="block text-xs font-semibold text-slate-700">Import a new list (CSV or Excel)</label>
        <p className="text-xs text-slate-500">Needs <strong>ID</strong> and <strong>Name</strong> columns. <strong>Name_KH</strong> and <strong>Groupe</strong> are also saved. Title rows above the header are fine. One worksheet, up to 2,000 students.</p>
        <input ref={fileRef} id={fileId} type="file" accept=".csv,.xlsx,.xls" disabled={locked} onChange={handleFile}
          className="block w-full text-xs text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-100 file:px-3 file:py-2 file:font-semibold file:text-indigo-700 disabled:opacity-50" />
        <a download="student-list-template.csv" href={'data:text/csv;charset=utf-8,' + encodeURIComponent(TEMPLATE_CSV)}
          className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600"><Download className="w-3.5 h-3.5" />Download CSV template</a>
        {busy === 'reading' && <p role="status" className="text-xs text-indigo-600 flex items-center gap-1"><Upload className="w-3.5 h-3.5" />Reading student list…</p>}
      </div>

      {draft && (
        <div className="rounded-xl border border-indigo-200 bg-white p-3 space-y-2">
          <p className="text-xs font-semibold text-slate-800">{draft.students.length} students found in {draft.filename}</p>
          <StudentPreview students={draft.students} />
          <label htmlFor={nameId} className="block text-xs font-semibold text-slate-700">List name</label>
          <input id={nameId} value={draftName} maxLength={80} disabled={locked} onChange={(event) => setDraftName(event.target.value)}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={locked} onClick={saveDraft} className="rounded-xl bg-indigo-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60">
              {busy === 'saving' ? 'Saving list…' : 'Save list and use it'}
            </button>
            <button type="button" disabled={locked} onClick={cancelDraft} className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-60">Cancel</button>
          </div>
        </div>
      )}

      {error && <p role="alert" className="text-xs text-rose-700">{error}</p>}
    </section>
  );
};

export default StudentListPicker;
