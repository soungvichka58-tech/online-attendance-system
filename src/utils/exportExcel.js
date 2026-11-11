import * as XLSX from 'xlsx';
import { formatDateOnly, formatTimeOnly } from './dateUtils';

export const exportAttendanceToExcel = (records, filenamePrefix = 'Attendance_Report') => {
  if (!records || records.length === 0) {
    throw new Error('No attendance records available to export.');
  }

  const formattedRows = records.map((record, index) => ({
    'No.': index + 1,
    'Student ID': record.studentId || '',
    'Full Name': record.studentName || '',
    'Class / Group': record.className || '',
    'Session Title': record.sessionTitle || '',
    'Date': formatDateOnly(record.submittedAt),
    'Submission Time': formatTimeOnly(record.submittedAt),
    'Session ID': record.sessionId || '',
  }));

  const worksheet = XLSX.utils.json_to_sheet(formattedRows);

  worksheet['!cols'] = [
    { wch: 6 },
    { wch: 16 },
    { wch: 28 },
    { wch: 20 },
    { wch: 30 },
    { wch: 14 },
    { wch: 18 },
    { wch: 24 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance');

  const safeDate = new Date().toISOString().slice(0, 10);
  const cleanPrefix = filenamePrefix.replace(/[^a-zA-Z0-9_-]/g, '_');
  XLSX.writeFile(workbook, `${cleanPrefix}_${safeDate}.xlsx`);
};