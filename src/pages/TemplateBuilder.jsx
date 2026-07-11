import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchMachines, saveTemplate } from '../services/googleSheets';
import { getTemplatesLocal, getUser } from '../services/storage';

const defaultTemplates = {
  'Boiler': [
    { id: '1', type: 'yes/no', label: 'Burner flame steady?' },
    { id: '2', type: 'number', label: 'Steam pressure (psi)' },
    { id: '3', type: 'pass/fail', label: 'Water level normal?' }
  ]
};

const TemplateBuilder = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [machine, setMachine] = useState(null);
  const [period, setPeriod] = useState('daily');
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const loadMachine = async () => {
      const machines = await fetchMachines();
      const found = machines.find(m => String(m.machineId) === String(id));
      if (found) {
        setMachine(found);
        loadTemplate(found.machineType, 'daily');
      }
    };
    loadMachine();
  }, [id]);

  const loadTemplate = (mType, freq) => {
    const customTemplates = getTemplatesLocal().filter(t => t.machineType === mType && t.frequency === freq);
    if (customTemplates.length > 0) {
      setFields(customTemplates[0].fieldsJSON);
    } else {
      setFields(defaultTemplates[mType] || [{ id: Date.now().toString(), type: 'text', label: 'Sample item' }]);
    }
  };

  const handlePeriodChange = (e) => {
    const freq = e.target.value;
    setPeriod(freq);
    loadTemplate(machine.machineType, freq);
  };

  const addField = () => {
    setFields([...fields, { id: Date.now().toString(), type: 'text', label: 'New Item' }]);
  };

  const removeField = (fieldId) => {
    setFields(fields.filter(f => f.id !== fieldId));
  };

  const updateField = (fieldId, key, value) => {
    setFields(fields.map(f => f.id === fieldId ? { ...f, [key]: value } : f));
  };

  const handleSave = async () => {
    setLoading(true);
    const user = getUser();
    const templateId = `${machine.machineType}_${period}_custom`;
    
    const templateData = {
      templateId,
      machineType: machine.machineType,
      templateName: `${period} Custom`,
      frequency: period,
      fieldsJSON: fields, // JSON stringified in service
      isCustom: true,
      createdBy: user?.email || 'Unknown'
    };

    await saveTemplate(templateData);
    setSuccess('Template saved successfully!');
    setLoading(false);
    setTimeout(() => setSuccess(''), 3000);
  };

  if (!machine) return <div className="container mt-8 text-center">Loading...</div>;

  return (
    <div>
      <nav className="navbar">
        <button className="btn btn-sm btn-outline" onClick={() => navigate(`/machine/${id}`)} style={{ border: 'none', padding: 0, fontSize: '1.5rem', width: '30px', color: 'var(--color-text)' }}>&larr;</button>
        <h1 style={{ fontSize: '1.125rem' }}>Template Builder</h1>
        <div style={{ width: '30px' }}></div>
      </nav>

      <div className="container">
        <div className="mb-4">
          <h2 className="text-lg" style={{ margin: 0 }}>{machine.tagNumber}</h2>
          <p className="text-sm text-text-light">{machine.machineName}</p>
        </div>

        <div className="card mb-4">
          <div className="form-group mb-0">
            <label>Template Frequency</label>
            <select value={period} onChange={handlePeriodChange}>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
        </div>

        {success && <div className="mb-4 text-center helper-text success font-semibold">{success}</div>}

        <div className="flex flex-col gap-2 mb-4">
          {fields.map((field, index) => (
            <div key={field.id} className="card" style={{ padding: '0.75rem', marginBottom: 0 }}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-semibold text-text-light">Item {index + 1}</span>
                <button className="btn btn-sm text-danger" style={{ padding: 0, backgroundColor: 'transparent', color: 'var(--color-danger)' }} onClick={() => removeField(field.id)}>Remove</button>
              </div>
              
              <div className="form-group">
                <label>Label</label>
                <input 
                  type="text" 
                  value={field.label} 
                  onChange={e => updateField(field.id, 'label', e.target.value)} 
                />
              </div>
              
              <div className="form-group mb-0">
                <label>Type</label>
                <select value={field.type} onChange={e => updateField(field.id, 'type', e.target.value)}>
                  <option value="yes/no">Yes / No</option>
                  <option value="pass/fail">Pass / Fail</option>
                  <option value="number">Number</option>
                  <option value="text">Text</option>
                </select>
              </div>
            </div>
          ))}
        </div>

        <button className="btn btn-outline mb-4" onClick={addField}>+ Add Item</button>
        <button className="btn btn-primary" onClick={handleSave} disabled={loading}>
          {loading ? 'Saving...' : 'Save Template'}
        </button>
      </div>
    </div>
  );
};

export default TemplateBuilder;
