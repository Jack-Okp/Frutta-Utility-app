// src/services/storage.js
const USER_KEY = 'frutta_user_profile';
const MACHINES_KEY = 'frutta_machines';
const LOGS_KEY = 'frutta_logs';
const TEMPLATES_KEY = 'frutta_templates';

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
