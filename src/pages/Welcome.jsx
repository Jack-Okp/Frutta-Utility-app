import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { saveUser, getUser } from '../services/storage';
import { syncUser, syncSharedDatabase } from '../services/googleSheets';

const ENGINEER_NAMES = [
  'Felix', 'Vinatus', 'Ravi', 'Chinedu', 'Courage',
  'Adam', 'Wahab', 'Jackson', 'Ann', 'Ernest', 'Engineer 11'
];

const Welcome = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    site: '',
    department: '',
    shift: '',
    syncCode: ''
  });

  const [syncStatus, setSyncStatus] = useState({
    isSync: false,
    matchedName: null,
    error: null
  });

  useEffect(() => {
    const user = getUser();
    if (user && user.name && user.email) {
      navigate('/dashboard');
    }
  }, [navigate]);

  // Validate name & sync code on change
  useEffect(() => {
    const code = formData.syncCode.trim().toUpperCase();
    const name = formData.name.trim().toLowerCase();

    if (!formData.syncCode) {
      setSyncStatus({ isSync: false, matchedName: null, error: null });
      return;
    }

    if (code !== 'FRUTTA-SYNC-2026') {
      setSyncStatus({ isSync: false, matchedName: null, error: 'Invalid team sync code' });
      return;
    }

    const match = ENGINEER_NAMES.find(
      (engName) => name === engName.toLowerCase() || name.startsWith(engName.toLowerCase() + ' ')
    );

    if (!match) {
      setSyncStatus({
        isSync: false,
        matchedName: null,
        error: 'Name must match one of the 11 registered engineers (Felix, Vinatus, etc.)'
      });
      return;
    }

    setSyncStatus({ isSync: true, matchedName: match, error: null });
  }, [formData.name, formData.syncCode]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.name && formData.email) {
      // If code was entered but validation failed, block submission to prevent mistakes
      if (formData.syncCode && !syncStatus.isSync) {
        return;
      }

      const userData = {
        name: formData.name,
        email: formData.email,
        site: formData.site,
        department: formData.department,
        shift: formData.shift,
        isSync: syncStatus.isSync,
        engineerName: syncStatus.matchedName,
        lastActiveDate: new Date().toISOString()
      };

      saveUser(userData);
      
      if (syncStatus.isSync) {
        await syncUser(userData);
        await syncSharedDatabase(); // Sync initial templates & machines down
      }

      navigate('/dashboard');
    }
  };

  return (
    <div className="container flex flex-col items-center justify-center" style={{ minHeight: '100vh', padding: '2rem' }}>
      <div className="card w-full" style={{ maxWidth: '400px' }}>
        <h1 className="text-center mb-2" style={{ color: 'var(--color-primary)' }}>Frutta Utility</h1>
        <p className="text-center text-sm mb-4">Soft login. We'll remember you on this device.</p>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Full Name</label>
            <input type="text" name="name" required value={formData.name} onChange={handleChange} placeholder="e.g. Felix, Vinatus..." />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input type="email" name="email" required value={formData.email} onChange={handleChange} placeholder="john@example.com" />
          </div>
          <div className="form-group">
            <label>Site</label>
            <input type="text" name="site" required value={formData.site} onChange={handleChange} placeholder="Main Plant" />
          </div>
          <div className="form-group">
            <label>Department</label>
            <input type="text" name="department" required value={formData.department} onChange={handleChange} placeholder="Engineering" />
          </div>
          <div className="form-group">
            <label>Shift</label>
            <select name="shift" required value={formData.shift} onChange={handleChange}>
              <option value="">Select Shift</option>
              <option value="Morning">Morning</option>
              <option value="Afternoon">Afternoon</option>
              <option value="Night">Night</option>
            </select>
          </div>

          <div className="form-group" style={{ marginTop: '16px', borderTop: '1px dashed var(--color-border)', paddingTop: '16px' }}>
            <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Engineer Sync Code (Optional)</span>
              <span style={{ fontSize: '0.65rem', color: 'var(--color-text-light)' }}>For team database</span>
            </label>
            <input
              type="text"
              name="syncCode"
              value={formData.syncCode}
              onChange={handleChange}
              placeholder="e.g. FRUTTA-SYNC-2026"
              style={{
                border: formData.syncCode 
                  ? (syncStatus.isSync ? '1.5px solid #10b981' : '1.5px solid #f87171')
                  : '1.5px solid var(--color-border)',
                outline: 'none',
                transition: 'border-color 0.15s'
              }}
            />

            {/* Validation Feedback message */}
            {formData.syncCode && (
              <div style={{ marginTop: '6px', fontSize: '0.75rem', fontWeight: 600 }}>
                {syncStatus.isSync ? (
                  <span style={{ color: '#10b981' }}>
                    ✓ Code validated! Connected to team sync as {syncStatus.matchedName}
                  </span>
                ) : (
                  <span style={{ color: '#ef4444' }}>
                    ✕ {syncStatus.error}
                  </span>
                )}
              </div>
            )}
          </div>
          
          <button 
            type="submit" 
            className="btn btn-primary mt-4"
            disabled={formData.syncCode && !syncStatus.isSync}
            style={{ 
              width: '100%', 
              padding: '12px',
              opacity: (formData.syncCode && !syncStatus.isSync) ? 0.6 : 1,
              cursor: (formData.syncCode && !syncStatus.isSync) ? 'not-allowed' : 'pointer'
            }}
          >
            Continue
          </button>
        </form>
      </div>
    </div>
  );
};

export default Welcome;

