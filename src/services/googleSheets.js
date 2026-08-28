import { 
  getMachinesLocal, saveMachineLocal, updateMachineLocal,
  getTemplatesLocal, saveTemplateLocal,
  getLogsLocal, saveLogLocal, getUser,
  getWorkLogsLocal, saveWorkLogLocal,
  queueOfflineAction, getOfflineQueue, clearOfflineQueueItem,
  getLogUniqueId, markWorkLogAsRead
} from './storage';

// Get URL from Vite environment variables
const API_URL = import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL;

const fetchFromGoogle = async (sheetName, params = {}) => {
  if (!API_URL) return null; // fallback to local

  const url = new URL(API_URL);
  url.searchParams.append('sheet', sheetName);
  for (const key in params) {
    url.searchParams.append(key, params[key]);
  }

  try {
    const res = await fetch(url.toString(), { method: 'GET' });
    const json = await res.json();
    if (json.status === 'success') {
      return json.data;
    }
    console.error("Google Sheets Error:", json.message);
    return null;
  } catch (err) {
    console.error("Fetch Error:", err);
    return null;
  }
};

const postToGoogle = async (sheetName, action, dataObj, idField = null, idValue = null) => {
  if (!API_URL) return true; // fallback to local

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({
        sheet: sheetName,
        action: action,
        data: dataObj,
        idField,
        idValue
      }),
      headers: { 'Content-Type': 'text/plain;charset=utf-8' } // Apps Script handles text/plain without preflight issues usually
    });
    const json = await res.json();
    return json.status === 'success';
  } catch (err) {
    console.error("Post Error:", err);
    return false;
  }
};

export const isUserSync = () => {
  const user = getUser();
  return !!(user && user.isSync);
};

export const syncUser = async (user) => {
  if (!API_URL || !user.isSync) return;
  const success = await postToGoogle('Users', 'insert', user);
  if (!success) {
    queueOfflineAction('Users', 'insert', user);
  }
};

export const fetchMachines = async () => {
  const localData = getMachinesLocal();
  if (isUserSync()) {
    // Non-blocking background revalidation
    fetchFromGoogle('Machines').then((data) => {
      if (data && Array.isArray(data)) {
        localStorage.setItem('frutta_machines', JSON.stringify(data));
      }
    }).catch(console.error);
  }
  return localData;
};

export const saveMachine = async (machine) => {
  saveMachineLocal(machine);
  if (isUserSync()) {
    const success = await postToGoogle('Machines', 'insert', machine);
    if (!success) {
      queueOfflineAction('Machines', 'insert', machine);
    }
  }
};

export const updateMachine = async (machine) => {
  updateMachineLocal(machine);
  if (isUserSync()) {
    const success = await postToGoogle('Machines', 'update', machine, 'machineId', machine.machineId);
    if (!success) {
      queueOfflineAction('Machines', 'update', machine);
    }
  }
};

export const fetchTemplates = async () => {
  const localData = getTemplatesLocal();
  if (isUserSync()) {
    // Non-blocking background revalidation
    fetchFromGoogle('Templates').then((data) => {
      if (data && Array.isArray(data)) {
        localStorage.setItem('frutta_templates', JSON.stringify(data));
      }
    }).catch(console.error);
  }
  return localData;
};

export const saveTemplate = async (template) => {
  saveTemplateLocal(template);
  if (isUserSync()) {
    const templates = await fetchTemplates();
    const exists = templates.find(t => t.templateId === template.templateId);
    let success = false;
    if (exists) {
      success = await postToGoogle('Templates', 'update', template, 'templateId', template.templateId);
    } else {
      success = await postToGoogle('Templates', 'insert', template);
    }
    if (!success) {
      queueOfflineAction('Templates', exists ? 'update' : 'insert', template);
    }
  }
};

export const fetchLogs = async (machineId) => {
  if (!isUserSync()) return getLogsLocal().filter(l => l.machineId === machineId);
  const data = await fetchFromGoogle('DailyLogs', { machineId });
  return data || getLogsLocal().filter(l => l.machineId === machineId);
};

export const saveLog = async (log, period) => {
  saveLogLocal(log);
  if (isUserSync()) {
    const sheetMap = {
      'daily': 'DailyLogs',
      'weekly': 'WeeklyLogs',
      'monthly': 'MonthlyLogs'
    };
    const sheetName = sheetMap[period] || 'DailyLogs';
    const success = await postToGoogle(sheetName, 'insert', log);
    if (!success) {
      queueOfflineAction(sheetName, 'insert', log);
    }
  }
};

// ─── Shared Database Checklist Sessions Syncing ────────────────────────────────
export const syncCheckSession = async (session) => {
  if (!isUserSync()) return;
  const success = await postToGoogle('CheckSessions', 'update', session, 'id', session.id);
  if (!success) {
    queueOfflineAction('CheckSessions', 'update', session);
  }
};

export const syncSharedDatabase = async () => {
  if (!isUserSync()) return;
  
  // Non-blocking background sync for all sheets
  Promise.all([
    fetchFromGoogle('Machines'),
    fetchFromGoogle('CheckSessions'),
    fetchFromGoogle('Templates'),
    fetchFromGoogle('WorkLogs'),
  ]).then(([machines, sessions, templates, workLogs]) => {
    if (machines && Array.isArray(machines)) localStorage.setItem('frutta_machines', JSON.stringify(machines));
    if (sessions && Array.isArray(sessions)) localStorage.setItem('ct_check_sessions', JSON.stringify(sessions));
    if (templates && Array.isArray(templates)) localStorage.setItem('frutta_templates', JSON.stringify(templates));
    if (workLogs && Array.isArray(workLogs)) localStorage.setItem('frutta_work_logs', JSON.stringify(workLogs));
  }).catch(console.error);
};

export const fetchWorkLogs = async () => {
  const localData = getWorkLogsLocal();
  if (isUserSync()) {
    // Non-blocking background revalidation
    fetchFromGoogle('WorkLogs').then((data) => {
      if (data && Array.isArray(data)) {
        localStorage.setItem('frutta_work_logs', JSON.stringify(data));
      }
    }).catch(console.error);
  }
  return localData;
};

export const saveWorkLog = async (workLog) => {
  saveWorkLogLocal(workLog);
  if (isUserSync()) {
    const success = await postToGoogle('WorkLogs', 'update', workLog, 'id', workLog.id);
    if (!success) {
      queueOfflineAction('WorkLogs', 'update', workLog);
    }
  }
};

export const markWorkLogReadShared = async (logId) => {
  if (!logId) return;
  markWorkLogAsRead(logId);
  if (isUserSync()) {
    const logs = getWorkLogsLocal();
    const strId = String(logId);
    const target = logs.find((l) => String(getLogUniqueId(l)) === strId);
    if (target && target.status !== 'Read') {
      target.status = 'Read';
      saveWorkLogLocal(target);
      postToGoogle('WorkLogs', 'update', { ...target, status: 'Read' }, 'id', target.id).catch(console.error);
    }
  }
};

export const flushOfflineQueue = async () => {
  if (!isUserSync()) return;
  const queue = getOfflineQueue();
  if (queue.length === 0) return;
  
  for (const item of queue) {
    let success = false;
    if (item.sheetName === 'CheckSessions') {
      success = await postToGoogle(item.sheetName, 'update', item.dataObj, 'id', item.dataObj.id);
    } else if (item.sheetName === 'WorkLogs') {
      success = await postToGoogle(item.sheetName, 'update', item.dataObj, 'id', item.dataObj.id);
    } else if (item.action === 'update' && item.sheetName === 'Machines') {
      success = await postToGoogle(item.sheetName, 'update', item.dataObj, 'machineId', item.dataObj.machineId);
    } else if (item.action === 'update' && item.sheetName === 'Templates') {
      success = await postToGoogle(item.sheetName, 'update', item.dataObj, 'templateId', item.dataObj.templateId);
    } else {
      success = await postToGoogle(item.sheetName, item.action, item.dataObj);
    }
    
    if (success) {
      clearOfflineQueueItem(item.id);
    } else {
      // Keep queued and stop processing (offline/error)
      break;
    }
  }
};
