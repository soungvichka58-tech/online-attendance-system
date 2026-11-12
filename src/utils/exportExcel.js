import * as XLSX from 'xlsx';

export const exportAttendanceToExcel = (sessionData, attendanceRecords) => {
  // Ensure attendanceRecords is always a safe array
  const records = Array.isArray(attendanceRecords) ? attendanceRecords : [];

  const data = [
    ["ATTENDANCE REPORT"],
    ["Session Title:", sessionData?.title || "N/A"],
    ["Class / Group:", sessionData?.className || "N/A"],
    ["Date & Time:", new Date(sessionData?.createdAt || Date.now()).toLocaleString()],
    ["Total Present:", records.length],
    [], // Empty row separator
    ["No.", "Student ID", "Full Name", "Session", "Check-In Time", "Status"]
  ];

  records.forEach((record, index) => {
    data.push([
      index + 1,
      record.studentId || "N/A",
      record.studentName || "N/A",
      record.sessionTitle || sessionData?.title || "N/A",
      record.submittedAt ? new Date(record.submittedAt).toLocaleString() : "N/A",
      "Present"
    ]);
  });

  const worksheet = XLSX.utils.aoa_to_sheet(data);

  worksheet['!cols'] = [
    { wch: 6 },
    { wch: 18 },
    { wch: 25 },
    { wch: 28 },
    { wch: 22 },
    { wch: 12 }
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance Report");
  
  const filename = `${sessionData?.className || 'Class'}_${sessionData?.title || 'Report'}_Attendance.xlsx`.replace(/\s+/g, '_');
  XLSX.writeFile(workbook, filename);
};