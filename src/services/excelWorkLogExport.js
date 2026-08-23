// src/services/excelWorkLogExport.js
import * as XLSX from 'xlsx';

/**
 * Export digital work logs to an Excel workbook (.xlsx)
 *
 * @param {Object[]} workLogs  - Array of work log objects
 * @param {string}   title     - Optional title/header string
 */
export const exportWorkLogsToExcel = (workLogs = [], title = 'Digital Work Logs Export') => {
  const rows = [];

  // Title row
  rows.push([title]);
  rows.push([`Generated on: ${new Date().toLocaleString()}`]);
  rows.push([]);

  // Column Headers
  rows.push([
    'Date & Time',
    'Shift',
    'Engineer',
    'Machine / Location',
    'Fault Description',
    'Action Taken',
    'Spare Parts Used',
    '30-Day Recurrence Risk'
  ]);

  // Data rows
  workLogs.forEach((log) => {
    const formattedDate = log.createdAt
      ? new Date(log.createdAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
      : log.date || '—';

    rows.push([
      formattedDate,
      log.shift || '—',
      log.engineerName || log.inspector || '—',
      log.location || log.machineName || '—',
      log.fault || '—',
      log.actionTaken || '—',
      log.spareParts || 'None',
      log.recurrenceRisk ? `${log.recurrenceRisk} Risk` : '—'
    ]);
  });

  // Create worksheet & workbook
  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Column widths
  ws['!cols'] = [
    { wch: 20 }, // Date & Time
    { wch: 14 }, // Shift
    { wch: 18 }, // Engineer
    { wch: 24 }, // Machine / Location
    { wch: 35 }, // Fault Description
    { wch: 35 }, // Action Taken
    { wch: 25 }, // Spare Parts Used
    { wch: 20 }, // Recurrence Risk
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Work Logs');

  const filename = `Digital_Work_Logs_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, filename);
};
