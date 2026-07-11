import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { saveMachine } from '../services/googleSheets';

const AddMachine = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  
  const [formData, setFormData] = useState({
    machineType: 'Boiler',
    machineName: '',
    tagNumber: '',
    location: '',
    model: '',
    serialNumber: '',
    installationDate: '',
    startingRunningHours: 0,
    maintenanceIntervalDays: 30,
    maintenanceIntervalHours: 500
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const machineId = Date.now().toString() + Math.floor(Math.random()*1000);
    const newMachine = {
      ...formData,
      machineId,
      currentRunningHours: formData.startingRunningHours,
      lastMaintenanceDate: '',
      nextMaintenanceDate: '', // calculate based on date/hours logic later
      healthStatus: 'Green'
    };

    await saveMachine(newMachine);
    setSuccess('Machine saved successfully!');
    setTimeout(() => {
      navigate('/dashboard');
    }, 1000);
  };

  return (
    <div>
      <nav className="navbar">
        <button className="btn btn-sm btn-outline" onClick={() => navigate('/dashboard')} style={{ border: 'none', padding: 0, fontSize: '1.5rem', width: '30px', color: 'var(--color-text)' }}>&larr;</button>
        <h1 style={{ fontSize: '1.125rem' }}>Add Machine</h1>
        <div style={{ width: '30px' }}></div>
      </nav>

      <div className="container">
        <div className="card">
          {success && <div className="mb-4 text-center helper-text success font-semibold">{success}</div>}
          
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Machine Type</label>
              <select name="machineType" value={formData.machineType} onChange={handleChange} required>
                <option value="Boiler">Boiler</option>
                <option value="Compressor">Compressor</option>
                <option value="Generator">Generator</option>
                <option value="Chiller">Chiller</option>
              </select>
            </div>
            
            <div className="form-group">
              <label>Machine Name</label>
              <input type="text" name="machineName" value={formData.machineName} onChange={handleChange} required placeholder="e.g. Primary Boiler A" />
            </div>
            
            <div className="form-group">
              <label>Tag Number</label>
              <input type="text" name="tagNumber" value={formData.tagNumber} onChange={handleChange} required placeholder="e.g. BLR-01" />
              <div className="helper-text">Must be unique per site.</div>
            </div>

            <div className="form-group">
              <label>Location</label>
              <input type="text" name="location" value={formData.location} onChange={handleChange} required placeholder="e.g. Utility Room 1" />
            </div>

            <div className="flex gap-4">
              <div className="form-group w-full">
                <label>Model</label>
                <input type="text" name="model" value={formData.model} onChange={handleChange} placeholder="Model #" />
              </div>
              <div className="form-group w-full">
                <label>Serial Number</label>
                <input type="text" name="serialNumber" value={formData.serialNumber} onChange={handleChange} placeholder="S/N" />
              </div>
            </div>

            <div className="form-group">
              <label>Installation Date</label>
              <input type="date" name="installationDate" value={formData.installationDate} onChange={handleChange} />
            </div>

            <div className="form-group">
              <label>Starting Running Hours</label>
              <input type="number" name="startingRunningHours" value={formData.startingRunningHours} onChange={handleChange} required min="0" />
            </div>

            <div className="flex gap-4">
              <div className="form-group w-full">
                <label>Maint. Interval (Days)</label>
                <input type="number" name="maintenanceIntervalDays" value={formData.maintenanceIntervalDays} onChange={handleChange} required min="1" />
              </div>
              <div className="form-group w-full">
                <label>Maint. Interval (Hours)</label>
                <input type="number" name="maintenanceIntervalHours" value={formData.maintenanceIntervalHours} onChange={handleChange} required min="1" />
              </div>
            </div>

            <button type="submit" className="btn btn-primary mt-4" disabled={loading}>
              {loading ? 'Saving...' : 'Save Machine'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddMachine;
