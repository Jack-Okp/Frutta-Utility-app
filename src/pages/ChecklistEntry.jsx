import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchMachines, saveLog } from '../services/googleSheets';
import { getUser, getTemplatesLocal } from '../services/storage';

const defaultTemplates = {
  'Boiler': [
    { id: '1', type: 'yes/no', label: 'Burner flame steady?' },
    { id: '2', type: 'number', label: 'Steam pressure (psi)' },
    { id: '3', type: 'pass/fail', label: 'Water level normal?' }
  ],
  'Compressor': [
    { id: '1', type: 'number', label: 'Oil pressure (psi)' },
    { id: '2', type: 'pass/fail', label: 'Unusual noise/vibration?' },
    { id: '3', type: 'number', label: 'Discharge temp (°C)' }
  ],
  'Generator': [
    { id: '1', type: 'number', label: 'Fuel level (%)' },
    { id: '2', type: 'number', label: 'Battery voltage (V)' },
    { id: '3', type: 'pass/fail', label: 'Coolant leaks?' }
  ],
  'Chiller': [
    { id: '1', type: 'number', label: 'Chilled water supply temp (°C)' },
    { id: '2', type: 'number', label: 'Condenser water supply temp (°C)' },
    { id: '3', type: 'pass/fail', label: 'Any alarms active?' }
  ]
};

const ChecklistEntry = () => {
  const { id, period } = useParams();
  const navigate = useNavigate();
  const [machine, setMachine] = useState(null);
  const [template, setTemplate] = useState([]);
  const [answers, setAnswers] = useState({});
  const [remarks, setRemarks] = useState('');
  const [runningHours, setRunningHours] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      const machines = await fetchMachines();
      const found = machines.find(m => String(m.machineId) === String(id));
      if (found) {
        setMachine(found);
        setRunningHours(found.currentRunningHours || 0);
        
        // Find custom template or fallback to default
        const customTemplates = getTemplatesLocal().filter(t => t.machineType === found.machineType && t.frequency === period);
        if (customTemplates.length > 0) {
          setTemplate(customTemplates[0].fieldsJSON);
        } else {
          setTemplate(defaultTemplates[found.machineType] || []);
        }
      }
    };
    loadData();
  }, [id, period]);

  if (!machine) return <div className="container mt-8 text-center">Loading...</div>;

  const handleAnswerChange = (fieldId, value) => {
    setAnswers({ ...answers, [fieldId]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const user = getUser();
    const log = {
      logId: Date.now().toString() + Math.floor(Math.random()*1000),
      machineId: machine.machineId,
      machineType: machine.machineType,
      templateId: 'default',
      userName: user?.name || 'Unknown',
      userEmail: user?.email || 'Unknown',
      dateTime: new Date().toISOString(),
      checklistAnswersJSON: JSON.stringify(answers),
      remarks,
      runningHours,
      scoreStatus: 'Green', // Logic for Amber/Red can be added based on fail counts
      exportedFlag: false
    };

    await saveLog(log, period);
    navigate(`/machine/${id}`);
  };

  const renderField = (field) => {
    switch(field.type) {
      case 'yes/no':
        return (
          <select value={answers[field.id] || ''} onChange={e => handleAnswerChange(field.id, e.target.value)} required>
            <option value="">Select</option>
            <option value="Yes">Yes</option>
            <option value="No">No</option>
          </select>
        );
      case 'pass/fail':
        return (
          <select value={answers[field.id] || ''} onChange={e => handleAnswerChange(field.id, e.target.value)} required>
            <option value="">Select</option>
            <option value="Pass">Pass</option>
            <option value="Fail">Fail</option>
          </select>
        );
      case 'number':
        return <input type="number" value={answers[field.id] || ''} onChange={e => handleAnswerChange(field.id, e.target.value)} required />;
      case 'text':
      default:
        return <input type="text" value={answers[field.id] || ''} onChange={e => handleAnswerChange(field.id, e.target.value)} required />;
    }
  };

  return (
    <div>
      <nav className="navbar">
        <button className="btn btn-sm btn-outline" onClick={() => navigate(-1)} style={{ border: 'none', padding: 0, fontSize: '1.5rem', width: '30px', color: 'var(--color-text)' }}>&larr;</button>
        <h1 style={{ fontSize: '1.125rem' }}>{period.charAt(0).toUpperCase() + period.slice(1)} Check</h1>
        <div style={{ width: '30px' }}></div>
      </nav>

      <div className="container">
        <div className="mb-4 text-center">
          <h2 className="text-lg" style={{ margin: 0 }}>{machine.tagNumber}</h2>
          <p className="text-sm text-text-light">{machine.machineName}</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="card">
            <div className="form-group">
              <label>Current Running Hours</label>
              <input type="number" value={runningHours} onChange={e => setRunningHours(e.target.value)} required min={machine.currentRunningHours || 0} />
            </div>
            
            <h3 className="mt-4 mb-2 text-sm font-semibold text-text-light">CHECKLIST ITEMS</h3>
            {template.length === 0 && <p className="text-sm text-text-light">No items configured for this template.</p>}
            
            {template.map((field) => (
              <div key={field.id} className="form-group" style={{ paddingBottom: '0.5rem', borderBottom: '1px solid var(--color-border)' }}>
                <label style={{ fontWeight: 'normal', color: 'var(--color-text)' }}>{field.label}</label>
                {renderField(field)}
              </div>
            ))}

            <div className="form-group mt-4">
              <label>Remarks</label>
              <textarea value={remarks} onChange={e => setRemarks(e.target.value)} rows="3" placeholder="Any anomalies found?"></textarea>
            </div>
          </div>

          <button type="submit" className="btn btn-primary mt-4" disabled={loading}>
            {loading ? 'Saving...' : 'Save Log'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChecklistEntry;
