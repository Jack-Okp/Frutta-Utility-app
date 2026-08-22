// src/services/googleSheets.js
import { 
  getMachinesLocal, saveMachineLocal, updateMachineLocal,
  getTemplatesLocal, saveTemplateLocal,
  getLogsLocal, saveLogLocal, getUser 
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

export const syncUser = async (user) => {
  if (!API_URL) return; // local only
  // Attempt to update, if fails, insert (simplified logic)
  const success = await postToGoogle('Users', 'insert', user);
};

export const fetchMachines = async () => {
  const data = await fetchFromGoogle('Machines');
  return data || getMachinesLocal();
};

export const saveMachine = async (machine) => {
  saveMachineLocal(machine);
  await postToGoogle('Machines', 'insert', machine);
};

export const updateMachine = async (machine) => {
  updateMachineLocal(machine);
  await postToGoogle('Machines', 'update', machine, 'machineId', machine.machineId);
};

export const fetchTemplates = async () => {
  const data = await fetchFromGoogle('Templates');
  return data || getTemplatesLocal();
};

export const saveTemplate = async (template) => {
  saveTemplateLocal(template);
  // We should either insert or update. For MVP, we insert or replace via local
  const templates = await fetchTemplates();
  const exists = templates.find(t => t.templateId === template.templateId);
  if (exists) {
    await postToGoogle('Templates', 'update', template, 'templateId', template.templateId);
  } else {
    await postToGoogle('Templates', 'insert', template);
  }
};

export const fetchLogs = async (machineId) => {
  // Combine logs from all sheets for simplicity, or just read local
  const data = await fetchFromGoogle('DailyLogs', { machineId });
  // For MVP, relying on local for unified history is faster if offline
  return data || getLogsLocal().filter(l => l.machineId === machineId);
};

export const saveLog = async (log, period) => {
  saveLogLocal(log);
  const sheetMap = {
    'daily': 'DailyLogs',
    'weekly': 'WeeklyLogs',
    'monthly': 'MonthlyLogs'
  };
  const sheetName = sheetMap[period] || 'DailyLogs';
  await postToGoogle(sheetName, 'insert', log);
};
