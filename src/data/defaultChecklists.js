// src/data/defaultChecklists.js
// Default seed checklist items per known machine type.
// Used to pre-populate the checklist builder when adding a machine.
// Users can edit/delete these or add their own before saving.

const uid = () => `item_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

export const DEFAULT_CHECKLISTS = {
  Boiler: [
    // Daily
    { id: uid(), description: 'Check boiler water level', frequency: 'daily', part: 'Water System' },
    { id: uid(), description: 'Check steam pressure gauge reading', frequency: 'daily', part: 'Pressure' },
    { id: uid(), description: 'Inspect for any leaks (water/steam)', frequency: 'daily', part: 'Leakage' },
    { id: uid(), description: 'Verify burner flame is stable', frequency: 'daily', part: 'Burner' },
    { id: uid(), description: 'Check flue gas temperature', frequency: 'daily', part: 'Burner' },
    { id: uid(), description: 'Verify no unusual noise or vibration', frequency: 'daily', part: 'General' },
    // Weekly
    { id: uid(), description: 'Blow down the boiler', frequency: 'weekly', part: 'Water System' },
    { id: uid(), description: 'Test low-water cutoff safety device', frequency: 'weekly', part: 'Safety' },
    { id: uid(), description: 'Check safety relief valve operation', frequency: 'weekly', part: 'Safety' },
    { id: uid(), description: 'Inspect fuel filter and strainer', frequency: 'weekly', part: 'Burner' },
    { id: uid(), description: 'Check and record chemical treatment levels', frequency: 'weekly', part: 'Water System' },
  ],

  Compressor: [
    // Daily
    { id: uid(), description: 'Check oil level', frequency: 'daily', part: 'Lubrication' },
    { id: uid(), description: 'Check discharge pressure and temperature', frequency: 'daily', part: 'Pressure' },
    { id: uid(), description: 'Verify no unusual noise or vibration', frequency: 'daily', part: 'General' },
    { id: uid(), description: 'Inspect for air or oil leaks', frequency: 'daily', part: 'Leakage' },
    { id: uid(), description: 'Check motor running smoothly', frequency: 'daily', part: 'Motor' },
    // Weekly
    { id: uid(), description: 'Drain condensate from air receiver tank', frequency: 'weekly', part: 'Air System' },
    { id: uid(), description: 'Clean or inspect air intake filter', frequency: 'weekly', part: 'Air System' },
    { id: uid(), description: 'Check belt tension and alignment', frequency: 'weekly', part: 'Drive' },
    { id: uid(), description: 'Lubricate bearings as required', frequency: 'weekly', part: 'Lubrication' },
    { id: uid(), description: 'Test pressure relief valve', frequency: 'weekly', part: 'Safety' },
  ],

  Generator: [
    // Daily
    { id: uid(), description: 'Check engine oil level', frequency: 'daily', part: 'Engine' },
    { id: uid(), description: 'Check coolant level', frequency: 'daily', part: 'Cooling' },
    { id: uid(), description: 'Check fuel level', frequency: 'daily', part: 'Fuel' },
    { id: uid(), description: 'Inspect for fuel, oil, or coolant leaks', frequency: 'daily', part: 'Leakage' },
    { id: uid(), description: 'Check battery voltage', frequency: 'daily', part: 'Electrical' },
    { id: uid(), description: 'Verify output voltage and frequency', frequency: 'daily', part: 'Electrical' },
    // Weekly
    { id: uid(), description: 'Run load test for minimum 30 minutes', frequency: 'weekly', part: 'Performance' },
    { id: uid(), description: 'Clean air filter', frequency: 'weekly', part: 'Engine' },
    { id: uid(), description: 'Check exhaust system for leaks', frequency: 'weekly', part: 'Exhaust' },
    { id: uid(), description: 'Inspect wiring and connections', frequency: 'weekly', part: 'Electrical' },
    { id: uid(), description: 'Check and tighten all terminal connections', frequency: 'weekly', part: 'Electrical' },
  ],

  Chiller: [
    // Daily
    { id: uid(), description: 'Check chilled water supply and return temperatures', frequency: 'daily', part: 'Water System' },
    { id: uid(), description: 'Check condenser water temperatures', frequency: 'daily', part: 'Water System' },
    { id: uid(), description: 'Check refrigerant sight glass (no bubbles)', frequency: 'daily', part: 'Refrigeration' },
    { id: uid(), description: 'Verify compressor suction and discharge pressures', frequency: 'daily', part: 'Pressure' },
    { id: uid(), description: 'Check for error codes or warning lights', frequency: 'daily', part: 'Control Panel' },
    // Weekly
    { id: uid(), description: 'Check for refrigerant leaks', frequency: 'weekly', part: 'Refrigeration' },
    { id: uid(), description: 'Clean condenser coils if fouled', frequency: 'weekly', part: 'Condenser' },
    { id: uid(), description: 'Check and record oil level', frequency: 'weekly', part: 'Lubrication' },
    { id: uid(), description: 'Inspect all water strainers', frequency: 'weekly', part: 'Water System' },
    { id: uid(), description: 'Verify flow switches operation', frequency: 'weekly', part: 'Safety' },
  ],

  'Cooling Tunnel': [
    // Daily — from original BOILER.xlsx
    { id: uid(), description: 'Conveyor belt running smoothly', frequency: 'daily', part: 'Conveyor' },
    { id: uid(), description: 'Verify that there is no unusual noise or vibration', frequency: 'daily', part: 'Conveyor' },
    { id: uid(), description: 'Check for pump leakage (Pump 1)', frequency: 'daily', part: 'Pump 1' },
    { id: uid(), description: 'Verify that there is no unusual noise or vibration (Pump 1)', frequency: 'daily', part: 'Pump 1' },
    { id: uid(), description: 'Motor running smoothly (Pump 1)', frequency: 'daily', part: 'Pump 1' },
    { id: uid(), description: 'Check for pump leakage (Pump 2)', frequency: 'daily', part: 'Pump 2' },
    { id: uid(), description: 'Verify that there is no unusual noise or vibration (Pump 2)', frequency: 'daily', part: 'Pump 2' },
    { id: uid(), description: 'Check for pump leakage (Pump 3)', frequency: 'daily', part: 'Pump 3' },
    { id: uid(), description: 'Verify that there is no unusual noise or vibration (Pump 3)', frequency: 'daily', part: 'Pump 3' },
    { id: uid(), description: 'Motor running smoothly (Pump 3)', frequency: 'daily', part: 'Pump 3' },
    { id: uid(), description: 'Check for error codes or warning light (Chiller Pump)', frequency: 'daily', part: 'Chiller Pump' },
    // Weekly
    { id: uid(), description: 'Verify that rollers and sprockets are in good condition', frequency: 'weekly', part: 'Conveyor' },
    { id: uid(), description: 'Lubricate conveyor bearings', frequency: 'weekly', part: 'Conveyor' },
    { id: uid(), description: 'Check that chain tension is satisfactory', frequency: 'weekly', part: 'Conveyor' },
  ],

  // Custom — starts empty; user builds their own
  Custom: [],
};

/**
 * Returns a deep copy of default checklist items for a given machine type.
 * Each item gets a fresh unique ID so machines don't share IDs.
 */
export const getDefaultChecklist = (machineType) => {
  const base = DEFAULT_CHECKLISTS[machineType] || DEFAULT_CHECKLISTS.Custom;
  return base.map((item) => ({
    ...item,
    id: `item_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
  }));
};
