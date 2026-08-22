// src/services/excelExport.js
// Generates an Excel file that mirrors the original BOILER.xlsx format exactly.
// Columns: S/N | PART | CHECK | ● | ■ | ▲ | ♦ | MON | TUE | WED | THU | FRI | SAT | REMARK

import * as XLSX from 'xlsx';
import { CHECKLIST_ITEMS, DAYS_OF_WEEK } from '../data/coolingTunnelChecklist';

const TICK = '✓';

/**
 * Build and download the Excel checklist for a given week.
 *
 * @param {Object[]} sessions        - Array of check sessions from getSessionsByWeek()
 * @param {string}   weekLabel       - Human-readable label for the week, e.g. "19–24 Aug 2026"
 * @param {string}   inspector       - Inspector name (shown in header)
 * @param {string}   machineName     - Name of the machine being exported
 * @param {Object[]} checklistItems  - Dynamic checklist items for this machine
 */
export const exportChecklistToExcel = (sessions, weekLabel, inspector = '', machineName = 'Machine', checklistItems = []) => {
  // ── 1. Pre-process sessions into lookup maps ─────────────────────────────
  // dailyMap[itemId][dayOfWeek] = { checked, remark }
  const dailyMap = {};
  // weeklySession = the one weekly session in this week (if any)
  let weeklySession = null;

  sessions.forEach((session) => {
    if (session.frequency === 'daily') {
      session.items.forEach((item) => {
        if (!dailyMap[item.id]) dailyMap[item.id] = {};
        dailyMap[item.id][session.dayOfWeek] = {
          checked: item.checked,
          remark: item.remark || '',
          dayRemark: session.dayRemark || '',
        };
      });
    } else if (session.frequency === 'weekly') {
      weeklySession = session;
    }
  });

  // ── 2. Build the row data ────────────────────────────────────────────────
  const rows = [];

  // Title row
  rows.push([`${machineName} Checklist`]);
  // Blank row
  rows.push([]);
  // Sub-header: inspector + week
  rows.push([
    `Inspector: ${inspector}`,
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    `Week: ${weekLabel}`,
  ]);
  // Blank row
  rows.push([]);
  // Column headers
  rows.push(['S/N', 'PART', 'CHECK', '●', '■', '▲', '♦', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'REMARK']);

  // Data rows — one per checklist item
  const itemsToUse = checklistItems && checklistItems.length > 0 ? checklistItems : CHECKLIST_ITEMS;
  
  itemsToUse.forEach((item, idx) => {
    const row = [
      item.sn ?? (idx + 1), // Fallback S/N if missing
      item.part || 'General', // PART
      item.description,     // CHECK
    ];

    // Frequency symbol columns (●  ■  ▲  ♦)
    row.push(item.frequency === 'daily' ? '●' : '');    // ●
    row.push(item.frequency === 'weekly' ? '■' : '');   // ■
    row.push(item.frequency === 'monthly' ? '▲' : '');  // ▲
    row.push(item.frequency === 'annually' ? '♦' : ''); // ♦

    // Day columns — MON TUE WED THU FRI SAT
    let remarkText = '';
    if (item.frequency === 'daily') {
      DAYS_OF_WEEK.forEach((day) => {
        const entry = dailyMap[item.id]?.[day];
        row.push(entry?.checked ? TICK : '');
        if (entry?.remark) remarkText += `${day}: ${entry.remark}  `;
        else if (entry?.dayRemark && !remarkText.includes(day))
          remarkText += `${day}: ${entry.dayRemark}  `;
      });
    } else if (item.frequency === 'weekly') {
      // Find which day the weekly check was done; place tick there
      const doneDay = weeklySession?.dayOfWeek || null;
      DAYS_OF_WEEK.forEach((day) => {
        row.push(day === doneDay && weeklySession?.items.find(i => i.id === item.id)?.checked ? TICK : '');
      });
      if (weeklySession) {
        const wItem = weeklySession.items.find(i => i.id === item.id);
        if (wItem?.remark) remarkText = wItem.remark;
        else if (weeklySession.dayRemark) remarkText = weeklySession.dayRemark;
      }
    } else {
      // monthly / annually — no day columns
      DAYS_OF_WEEK.forEach(() => row.push(''));
    }

    row.push(remarkText.trim()); // REMARK
    rows.push(row);
  });

  // ── 3. Day Remarks footer rows ──────────────────────────────────────────
  rows.push([]);
  rows.push(['Day Remarks:']);
  DAYS_OF_WEEK.forEach((day) => {
    const daySessions = sessions.filter(
      (s) => s.frequency === 'daily' && s.dayOfWeek === day
    );
    const remark = daySessions[0]?.dayRemark || '';
    if (remark) rows.push([day, '', remark]);
  });

  // ── 4. Build worksheet & workbook ────────────────────────────────────────
  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Column widths
  ws['!cols'] = [
    { wch: 5 },   // S/N
    { wch: 14 },  // PART
    { wch: 52 },  // CHECK
    { wch: 4 },   // ●
    { wch: 4 },   // ■
    { wch: 4 },   // ▲
    { wch: 4 },   // ♦
    { wch: 5 },   // MON
    { wch: 5 },   // TUE
    { wch: 5 },   // WED
    { wch: 5 },   // THU
    { wch: 5 },   // FRI
    { wch: 5 },   // SAT
    { wch: 35 },  // REMARK
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Checklist');

  // Trigger download
  const cleanMachineName = machineName.replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `${cleanMachineName}_Checklist_${weekLabel.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`;
  XLSX.writeFile(wb, filename);
};
