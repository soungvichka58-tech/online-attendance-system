import * as XLSX from 'xlsx';

export const exportAttendanceToExcel = (sessionData, attendanceRecords) => {
  // Ensure attendanceRecords is always a safe array
  const records = Array.isArray(attendanceRecords) ? attendanceRecords : [];

  const data = [
    ["ATTENDANCE REPORT"],
    ["Session Title:", sessionData?.title || "N/A"],
    ["Class / Group:", sessionData?.className || "N/A"],
    ["Date & Time:", new Date(sessionData?.createdAt?.toDate?.() || Date.now()).toLocaleString()],
    ["Total Present:", records.length],
    [], // Empty row separator
    ["No.", "Student ID", "Full Name", "Check-In Time", "Status"]
  ];

  records.forEach((record, index) => {
    data.push([
      index + 1,
      record.studentId || "N/A",
      record.studentName || "N/A",
      new Date(record.submittedAt?.toDate?.() || Date.now()).toLocaleTimeString(),
      "Present"
    ]);
  });

  const worksheet = XLSX.utils.aoa_to_sheet(data);

  worksheet['!cols'] = [
    { wch: 6 },
    { wch: 18 },
    { wch: 25 },
    { wch: 18 },
    { wch: 12 }
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance Report");
  
  const filename = `${sessionData?.className || 'Class'}_${sessionData?.title || 'Report'}_Attendance.xlsx`.replace(/\s+/g, '_');
  XLSX.writeFile(workbook, filename);
};