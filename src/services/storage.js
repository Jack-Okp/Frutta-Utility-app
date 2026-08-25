// src/services/storage.js
const USER_KEY = 'frutta_user_profile';
const MACHINES_KEY = 'frutta_machines';
const LOGS_KEY = 'frutta_logs';
const TEMPLATES_KEY = 'frutta_templates';
const CT_SESSIONS_KEY = 'ct_check_sessions'; // Cooling Tunnel checklist sessions
const WORK_LOGS_KEY = 'frutta_work_logs'; // Digital Work Logs

const READ_WORK_LOGS_KEY = 'frutta_read_work_logs';

export const getReadWorkLogIds = () => {
  try {
    const raw = localStorage.getItem(READ_WORK_LOGS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
};

export const markWorkLogAsRead = (logId) => {
  const readIds = getReadWorkLogIds();
  if (!readIds.includes(logId)) {
    readIds.push(logId);
    localStorage.setItem(READ_WORK_LOGS_KEY, JSON.stringify(readIds));
  }
};

export const markMultipleWorkLogsAsRead = (logIds = []) => {
  const readIds = getReadWorkLogIds();
  let updated = false;
  logIds.forEach((id) => {
    if (!readIds.includes(id)) {
      readIds.push(id);
      updated = true;
    }
  });
  if (updated) {
    localStorage.setItem(READ_WORK_LOGS_KEY, JSON.stringify(readIds));
  }
};

export const saveUser = (userData) => {
  localStorage.setItem(USER_KEY, JSON.stringify(userData));
};

export const getUser = () => {
  const data = localStorage.getItem(USER_KEY);
  return data ? JSON.parse(data) : null;
};

// Local fallback for MVP
export const getMachinesLocal = () => {
  const data = localStorage.getItem(MACHINES_KEY);
  return data ? JSON.parse(data) : [];
};

export const saveMachineLocal = (machine) => {
  const machines = getMachinesLocal();
  machines.push(machine);
  localStorage.setItem(MACHINES_KEY, JSON.stringify(machines));
};

export const deleteMachineLocal = (machineId) => {
  const machines = getMachinesLocal().filter(
    (m) => String(m.machineId) !== String(machineId)
  );
  localStorage.setItem(MACHINES_KEY, JSON.stringify(machines));
};

export const updateMachineLocal = (updatedMachine) => {
  const machines = getMachinesLocal().map((m) =>
    String(m.machineId) === String(updatedMachine.machineId) ? updatedMachine : m
  );
  localStorage.setItem(MACHINES_KEY, JSON.stringify(machines));
};

export const getTemplatesLocal = () => {
  const data = localStorage.getItem(TEMPLATES_KEY);
  return data ? JSON.parse(data) : [];
};

export const saveTemplateLocal = (template) => {
  const templates = getTemplatesLocal();
  const existingIndex = templates.findIndex(t => t.templateId === template.templateId);
  if (existingIndex > -1) {
    templates[existingIndex] = template;
  } else {
    templates.push(template);
  }
  localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
};

export const getLogsLocal = () => {
  const data = localStorage.getItem(LOGS_KEY);
  return data ? JSON.parse(data) : [];
};

export const saveLogLocal = (log) => {
  const logs = getLogsLocal();
  logs.push(log);
  localStorage.setItem(LOGS_KEY, JSON.stringify(logs));
};

// ─── Cooling Tunnel Checklist Sessions ───────────────────────────────────────

/**
 * Save a completed check session.
 * Session shape:
 * {
 *   id: string,           // unique id (timestamp based)
 *   date: string,         // 'YYYY-MM-DD'
 *   dayOfWeek: string,    // 'MON'|'TUE'|'WED'|'THU'|'FRI'|'SAT'
 *   frequency: string,    // 'daily' | 'weekly'
 *   inspector: string,    // name of person filling
 *   items: [              // one entry per checklist item
 *     { id: string, checked: boolean, remark: string }
 *   ],
 *   dayRemark: string,    // general remark for this day/session
 *   submittedAt: string,  // ISO timestamp
 * }
 */
export const saveCheckSession = (session) => {
  const sessions = getAllCheckSessions();
  // Replace if same machine, date, and frequency already exists
  const idx = sessions.findIndex(
    (s) => String(s.machineId) === String(session.machineId) &&
           s.date === session.date &&
           s.frequency === session.frequency
  );
  if (idx > -1) {
    sessions[idx] = session;
  } else {
    sessions.push(session);
  }
  localStorage.setItem(CT_SESSIONS_KEY, JSON.stringify(sessions));
};

export const getAllCheckSessions = () => {
  const data = localStorage.getItem(CT_SESSIONS_KEY);
  return data ? JSON.parse(data) : [];
};

export const getCheckSessionsByMachine = (machineId) => {
  return getAllCheckSessions().filter((s) => String(s.machineId) === String(machineId));
};

/**
 * Get sessions for a specific machine and ISO week (Mon–Sat).
 * Pass any date in the desired week.
 */
export const getSessionsByWeek = (machineId, weekDate = new Date()) => {
  const allSessions = getAllCheckSessions();
  const date = new Date(weekDate);
  const day = date.getDay(); // 0=Sun
  // Find the Monday of this week
  const diffToMon = day === 0 ? -6 : 1 - day;
  const mon = new Date(date);
  mon.setDate(date.getDate() + diffToMon);
  mon.setHours(0, 0, 0, 0);
  const sat = new Date(mon);
  sat.setDate(mon.getDate() + 5);
  sat.setHours(23, 59, 59, 999);

  return allSessions.filter((s) => {
    if (machineId && String(s.machineId) !== String(machineId)) return false;
    const d = new Date(s.date);
    return d >= mon && d <= sat;
  });
};

export const deleteCheckSession = (sessionId) => {
  const sessions = getAllCheckSessions().filter((s) => s.id !== sessionId);
  localStorage.setItem(CT_SESSIONS_KEY, JSON.stringify(sessions));
};

// ─── Offline Sync Queue ──────────────────────────────────────────────────────
const SYNC_QUEUE_KEY = 'frutta_sync_queue';


export const getOfflineQueue = () => {
  const data = localStorage.getItem(SYNC_QUEUE_KEY);
  return data ? JSON.parse(data) : [];
};

export const queueOfflineAction = (sheetName, action, dataObj) => {
  const queue = getOfflineQueue();
  const id = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  queue.push({ id, sheetName, action, dataObj });
  localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
};

export const clearOfflineQueueItem = (id) => {
  const queue = getOfflineQueue().filter((item) => item.id !== id);
  localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
};

// ─── Digital Work Logs ───────────────────────────────────────────────────────
export const getWorkLogsLocal = () => {
  const data = localStorage.getItem(WORK_LOGS_KEY);
  return data ? JSON.parse(data) : [];
};

export const saveWorkLogLocal = (workLog) => {
  const logs = getWorkLogsLocal();
  // Check if exists (update) or push
  const idx = logs.findIndex((l) => l.id === workLog.id);
  if (idx > -1) {
    logs[idx] = workLog;
  } else {
    logs.unshift(workLog);
  }
  localStorage.setItem(WORK_LOGS_KEY, JSON.stringify(logs));
};

export const deleteWorkLogLocal = (logId) => {
  const logs = getWorkLogsLocal().filter((l) => l.id !== logId);
  localStorage.setItem(WORK_LOGS_KEY, JSON.stringify(logs));
};



