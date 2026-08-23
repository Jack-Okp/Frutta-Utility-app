// src/services/shiftSummaryFormatter.js

/**
 * Format a clean, professional WhatsApp text message for the daily shift closing report.
 *
 * @param {Object} params
 * @param {string} params.shift         - 'Morning' | 'Night'
 * @param {string} params.date          - Date string (e.g. '23rd August 2026')
 * @param {string} params.engineerName  - Name of engineer compiling report
 * @param {Array}  params.machines      - Array of { machineName, machineType, status, note }
 * @param {Array}  params.workLogs      - Array of work logs created during the shift
 * @param {string} params.sparesNotes   - Custom urgent spares required text
 * @returns {string}                    - Formatted WhatsApp text string
 */
export const formatWhatsAppShiftSummary = ({
  shift = 'Morning',
  date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
  engineerName = 'Engineer',
  machines = [],
  workLogs = [],
  sparesNotes = '',
}) => {
  const lines = [];

  lines.push('*FRUTTA PLANT MAINTENANCE & ENGINEERING*');
  lines.push('*SHIFT CLOSING REPORT*');
  lines.push('---------------------------------------');
  lines.push(`Shift: ${shift} Shift (${shift === 'Morning' ? '7:00 AM - 7:00 PM' : '7:00 PM - 7:00 AM'})`);
  lines.push(`Date: ${date}`);
  lines.push(`Engineer: ${engineerName}`);
  lines.push('---------------------------------------');
  lines.push('');

  // Status mapping text tags
  const statusEmoji = {
    'OK': 'OK [PASSED]',
    'Degraded': 'Degraded [REDUCED EFFICIENCY]',
    'Not OK': 'Not OK [ACTION REQUIRED]',
    'Standby': 'Standby [NO PLANNED PRODUCTION]',
  };

  if (machines.length === 0) {
    lines.push('_No machines registered._');
    lines.push('');
  } else {
    // Group machines by category
    const categories = {
      'PACKAGING & PRODUCTION LINES': [],
      'BOILERS & UTILITIES': [],
      'COMPRESSORS & AIR SYSTEMS': [],
      'PUMPS & DRAINAGE': [],
      'POWER GENERATION': [],
      'OTHER UTILITY ASSETS': [],
    };

    machines.forEach((m) => {
      const type = (m.machineType || m.machineName || '').toLowerCase();
      if (type.includes('line') || type.includes('shrink') || type.includes('mould') || type.includes('filler') || type.includes('sleeve') || type.includes('pakona')) {
        categories['PACKAGING & PRODUCTION LINES'].push(m);
      } else if (type.includes('boiler')) {
        categories['BOILERS & UTILITIES'].push(m);
      } else if (type.includes('compressor') || type.includes('air') || type.includes('boge') || type.includes('booster')) {
        categories['COMPRESSORS & AIR SYSTEMS'].push(m);
      } else if (type.includes('pump') || type.includes('sewage')) {
        categories['PUMPS & DRAINAGE'].push(m);
      } else if (type.includes('generator') || type.includes('perkins') || type.includes('power')) {
        categories['POWER GENERATION'].push(m);
      } else {
        categories['OTHER UTILITY ASSETS'].push(m);
      }
    });

    let catIndex = 1;
    for (const [catName, catMachines] of Object.entries(categories)) {
      if (catMachines.length > 0) {
        lines.push(`${catIndex}. *${catName}*`);
        catMachines.forEach((m) => {
          const statusText = statusEmoji[m.status] || `${m.status} [PASSED]`;
          lines.push(`• *${m.machineName}*: ${statusText}`);
          if (m.note && m.note.trim()) {
            lines.push(`  _Note:_ ${m.note.trim()}`);
          }
        });
        lines.push('');
        catIndex++;
      }
    }
  }

  // Urgent Spares Section
  if (sparesNotes && sparesNotes.trim()) {
    lines.push('---------------------------------------');
    lines.push('*URGENT SPARES & ACTIONS REQUIRED:*');
    sparesNotes.trim().split('\n').forEach((note) => {
      if (note.trim()) lines.push(`- ${note.trim()}`);
    });
    lines.push('');
  }

  // Jobs Completed & Work Done Section
  lines.push('---------------------------------------');
  lines.push('*JOBS COMPLETED & WORK DONE:*');
  if (workLogs.length === 0) {
    lines.push('_No repair/breakdown jobs logged during this shift._');
  } else {
    workLogs.forEach((log, idx) => {
      const riskMeta = {
        Low: 'Low Recurrence Risk',
        Medium: 'Medium Recurrence Risk',
        High: 'High Recurrence Risk',
      }[log.recurrenceRisk] || `${log.recurrenceRisk || 'Low'} Risk`;

      lines.push(`${idx + 1}. *${log.location}*`);
      lines.push(`   *Issue:* ${log.fault}`);
      lines.push(`   *Action:* ${log.actionTaken}`);
      if (log.spareParts && log.spareParts !== 'None') {
        lines.push(`   *Parts:* ${log.spareParts}`);
      }
      lines.push(`   *30-Day Recurrence Review:* ${riskMeta}`);
      lines.push('');
    });
  }

  lines.push('---------------------------------------');
  lines.push('_Generated via Frutta Utility App_');

  return lines.join('\n');
};
