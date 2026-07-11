import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { saveUser, getUser } from '../services/storage';
import { syncUser } from '../services/googleSheets';

const Welcome = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    site: '',
    department: '',
    shift: ''
  });

  useEffect(() => {
    const user = getUser();
    if (user && user.name && user.email) {
      navigate('/dashboard');
    }
  }, [navigate]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.name && formData.email) {
      const userData = { ...formData, lastActiveDate: new Date().toISOString() };
      saveUser(userData);
      await syncUser(userData);
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
            <input type="text" name="name" required value={formData.name} onChange={handleChange} placeholder="John Doe" />
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
          
          <button type="submit" className="btn btn-primary mt-4">Continue</button>
        </form>
      </div>
    </div>
  );
};

export default Welcome;
