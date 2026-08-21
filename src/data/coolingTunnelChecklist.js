// src/data/coolingTunnelChecklist.js
// Cooling Tunnel Checklist — Conveyor & Pumps section
// Sourced from BOILER.xlsx
// Symbols: ● = Daily, ■ = Weekly, ▲ = Monthly, ♦ = Annually

export const CHECKLIST_ITEMS = [
  {
    id: 'ct1',
    sn: 1,
    part: 'Conveyor',
    description: 'Conveyor belt running smoothly',
    frequency: 'daily',
    symbol: '●',
  },
  {
    id: 'ct2',
    sn: 2,
    part: 'Conveyor',
    description: 'Verify that there is no unusual noise or vibration',
    frequency: 'daily',
    symbol: '●',
  },
  {
    id: 'ct3',
    sn: 3,
    part: 'Conveyor',
    description: 'Verify that rollers and sprockets are in good condition',
    frequency: 'weekly',
    symbol: '■',
  },
  {
    id: 'ct4',
    sn: 4,
    part: 'Conveyor',
    description: 'Lubricate conveyor bearings',
    frequency: 'weekly',
    symbol: '■',
  },
  {
    id: 'ct5',
    sn: 5,
    part: 'Conveyor',
    description: 'Check that chain tension is satisfactory',
    frequency: 'weekly',
    symbol: '■',
  },
  {
    id: 'ct6',
    sn: 6,
    part: 'Pump 1',
    description: 'Check for pump leakage',
    frequency: 'daily',
    symbol: '●',
  },
  {
    id: 'ct7',
    sn: null,
    part: 'Pump 1',
    description: 'Verify that there is no unusual noise or vibration',
    frequency: 'daily',
    symbol: '●',
  },
  {
    id: 'ct8',
    sn: null,
    part: 'Pump 1',
    description: 'Motor running smoothly',
    frequency: 'daily',
    symbol: '●',
  },
  {
    id: 'ct9',
    sn: null,
    part: 'Pump 2',
    description: 'Check for pump leakage',
    frequency: 'daily',
    symbol: '●',
  },
  {
    id: 'ct10',
    sn: null,
    part: 'Pump 2',
    description: 'Verify that there is no unusual noise or vibration',
    frequency: 'daily',
    symbol: '●',
  },
  {
    id: 'ct11',
    sn: null,
    part: 'Pump 3',
    description: 'Check for pump leakage',
    frequency: 'daily',
    symbol: '●',
  },
  {
    id: 'ct12',
    sn: null,
    part: 'Pump 3',
    description: 'Verify that there is no unusual noise or vibration',
    frequency: 'daily',
    symbol: '●',
  },
  {
    id: 'ct13',
    sn: null,
    part: 'Pump 3',
    description: 'Motor running smoothly',
    frequency: 'daily',
    symbol: '●',
  },
  {
    id: 'ct14',
    sn: 7,
    part: 'Chiller Pump',
    description: 'Check for error codes or warning light',
    frequency: 'daily',
    symbol: '●',
  },
];

// Frequency metadata
export const FREQUENCY_META = {
  daily: { label: 'Daily', symbol: '●', color: '#3b82f6', bg: '#eff6ff' },
  weekly: { label: 'Weekly', symbol: '■', color: '#f59e0b', bg: '#fffbeb' },
  monthly: { label: 'Monthly', symbol: '▲', color: '#8b5cf6', bg: '#f5f3ff' },
  annually: { label: 'Annually', symbol: '♦', color: '#ef4444', bg: '#fef2f2' },
};

// Returns items filtered by frequency
export const getItemsByFrequency = (frequency) =>
  CHECKLIST_ITEMS.filter((item) => item.frequency === frequency);

// Day of week helpers
export const DAYS_OF_WEEK = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

export const getDayOfWeek = (date = new Date()) => {
  const day = date.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const map = { 1: 'MON', 2: 'TUE', 3: 'WED', 4: 'THU', 5: 'FRI', 6: 'SAT' };
  return map[day] || 'MON';
};
