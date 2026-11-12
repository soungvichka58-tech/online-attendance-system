import React, { useState } from 'react';
import { compareRoster } from '../utils/roster';

const RosterComparison = ({ students, records }) => {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const rows = compareRoster(students, records);
  const hasKh = students.some((student) => student.nameKh);
  const hasGroup = students.some((student) => student.group);
  const present = rows.filter((row) => row.attendance).length;
  const filtered = rows.filter((row) => (filter === 'all' || Boolean(row.attendance) === (filter === 'present'))
    && `${row.studentId} ${row.studentName} ${row.nameKh || ''} ${row.group || ''}`.toLowerCase().includes(search.toLowerCase()));
  return (
    <section className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
      <div className="p-5 border-b border-slate-100 space-y-3">
        <h2 className="font-bold text-slate-900">Student list comparison</h2>
        <p className="text-sm text-slate-600">{students.length} students · {present} present · {students.length - present} absent</p>
        <div className="flex flex-wrap gap-2">
          <input aria-label="Search imported students" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search student ID or name" className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
          <select aria-label="Filter roster attendance" value={filter} onChange={(event) => setFilter(event.target.value)} className="rounded-xl border border-slate-300 px-3 py-2 text-sm"><option value="all">All students</option><option value="present">Present</option><option value="absent">Absent</option></select>
        </div>
        <p className="text-xs text-slate-500">Names below come from your saved student list. Attendance is matched by student ID.</p>
      </div>
      <div className="overflow-x-auto max-h-96"><table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="p-3">Student ID</th><th className="p-3">Name</th>{hasKh && <th className="p-3">Name (KH)</th>}{hasGroup && <th className="p-3">Group</th>}<th className="p-3">Attendance</th></tr></thead>
        <tbody className="divide-y divide-slate-100">{filtered.map((row) => <tr key={row.studentId}><td className="p-3 font-mono">{row.studentId}</td><td className="p-3">{row.studentName}{row.attendance && row.attendance.studentName !== row.studentName && <span className="block text-xs text-slate-500">Submitted as: {row.attendance.studentName}</span>}</td>{hasKh && <td className="p-3">{row.nameKh}</td>}{hasGroup && <td className="p-3">{row.group}</td>}<td className={`p-3 font-semibold ${row.attendance ? 'text-emerald-700' : 'text-rose-600'}`}>{row.attendance ? 'Present' : 'Absent'}</td></tr>)}</tbody>
      </table>{filtered.length === 0 && <p className="p-5 text-sm text-slate-500">No students match this filter.</p>}</div>
    </section>
  );
};

export default RosterComparison;
