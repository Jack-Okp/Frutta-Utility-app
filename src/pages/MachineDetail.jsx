import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchMachines } from '../services/googleSheets';

const MachineDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [machine, setMachine] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMachine = async () => {
      const machines = await fetchMachines();
      const found = machines.find(m => String(m.machineId) === String(id));
      setMachine(found);
      setLoading(false);
    };
    loadMachine();
  }, [id]);

  if (loading) return <div className="container mt-8 text-center">Loading...</div>;
  if (!machine) return <div className="container mt-8 text-center">Machine not found.</div>;

  const getHealthBadge = (status) => {
    switch(status?.toLowerCase()) {
      case 'green': return <span className="badge badge-green">Healthy</span>;
      case 'amber': return <span className="badge badge-amber">Warning</span>;
      case 'red': return <span className="badge badge-red">Critical</span>;
      default: return <span className="badge badge-green">Healthy</span>;
    }
  };

  return (
    <div>
      <nav className="navbar">
        <button className="btn btn-sm btn-outline" onClick={() => navigate('/dashboard')} style={{ border: 'none', padding: 0, fontSize: '1.5rem', width: '30px', color: 'var(--color-text)' }}>&larr;</button>
        <h1 style={{ fontSize: '1.125rem' }}>{machine.tagNumber}</h1>
        <div style={{ width: '30px' }}></div>
      </nav>

      <div className="container">
        <div className="card mb-4" style={{ backgroundColor: 'var(--color-bg-secondary)', border: 'none' }}>
          <div className="flex justify-between items-center mb-2">
            <h2 style={{ margin: 0 }}>{machine.machineName}</h2>
            {getHealthBadge(machine.healthStatus)}
          </div>
          <p className="mb-0 text-sm">{machine.machineType} • {machine.location}</p>
        </div>

        <div className="flex gap-2 mb-4">
          <div className="card w-full text-center" style={{ padding: '1rem 0.5rem', marginBottom: 0 }}>
            <div className="text-sm text-text-light mb-1">Running Hours</div>
            <div className="font-semibold">{machine.currentRunningHours || 0}</div>
          </div>
          <div className="card w-full text-center" style={{ padding: '1rem 0.5rem', marginBottom: 0 }}>
            <div className="text-sm text-text-light mb-1">Next Maint.</div>
            <div className="font-semibold">{machine.nextMaintenanceDate || 'Pending'}</div>
          </div>
        </div>

        <h3 className="mt-4 mb-2 text-sm font-semibold text-text-light">LOG INSPECTION</h3>
        <div className="flex gap-2 mb-6">
          <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => navigate(`/machine/${id}/check/daily`)}>Daily</button>
          <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => navigate(`/machine/${id}/check/weekly`)}>Weekly</button>
          <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => navigate(`/machine/${id}/check/monthly`)}>Monthly</button>
        </div>

        <div className="flex flex-col gap-2">
          <button className="btn btn-outline justify-between" onClick={() => navigate(`/machine/${id}/history`)}>
            <span>View History</span>
            <span>&rarr;</span>
          </button>
          <button className="btn btn-outline justify-between" onClick={() => navigate(`/machine/${id}/templates`)}>
            <span>Manage Templates</span>
            <span>&rarr;</span>
          </button>
          <button className="btn btn-outline justify-between" onClick={() => navigate('/export')}>
            <span>Export Report</span>
            <span>&rarr;</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default MachineDetail;
