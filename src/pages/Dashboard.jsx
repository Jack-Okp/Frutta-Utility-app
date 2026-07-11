import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { fetchMachines } from '../services/googleSheets';
import { getUser } from '../services/storage';

const Dashboard = () => {
  const navigate = useNavigate();
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const user = getUser();
    if (!user) {
      navigate('/');
      return;
    }

    const loadData = async () => {
      const data = await fetchMachines();
      setMachines(data || []);
      setLoading(false);
    };
    loadData();
  }, [navigate]);

  const filteredMachines = machines.filter(m => {
    if (filter !== 'All' && m.machineType !== filter) return false;
    if (search && !m.machineName.toLowerCase().includes(search.toLowerCase()) && 
        !m.tagNumber.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

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
        <h1>Frutta Utility</h1>
        <div>
          <button className="btn btn-sm btn-outline" onClick={() => navigate('/export')} style={{ marginRight: '8px' }}>Export</button>
          <button className="btn btn-sm btn-primary" onClick={() => navigate('/add-machine')}>+ Add</button>
        </div>
      </nav>

      <div className="container">
        <div className="flex gap-2 mb-4">
          <input 
            type="text" 
            placeholder="Search machines..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            style={{ flex: 1 }}
          />
        </div>
        
        <div className="flex gap-2 mb-4" style={{ overflowX: 'auto', paddingBottom: '4px' }}>
          {['All', 'Boiler', 'Compressor', 'Generator', 'Chiller'].map(type => (
            <button 
              key={type}
              className={`btn btn-sm ${filter === type ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setFilter(type)}
              style={{ whiteSpace: 'nowrap' }}
            >
              {type}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-center mt-8">Loading machines...</p>
        ) : filteredMachines.length === 0 ? (
          <div className="card text-center mt-4">
            <p>No machines found.</p>
            <button className="btn btn-primary mt-2" onClick={() => navigate('/add-machine')}>Add First Machine</button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {filteredMachines.map(machine => (
              <div key={machine.machineId || machine.tagNumber} className="card" onClick={() => navigate(`/machine/${machine.machineId}`)} style={{ cursor: 'pointer' }}>
                <div className="flex justify-between items-center mb-2">
                  <h3 style={{ margin: 0 }}>{machine.machineName}</h3>
                  {getHealthBadge(machine.healthStatus)}
                </div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-semibold text-text-light">{machine.tagNumber}</span>
                  <span className="text-text-light">{machine.machineType}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Last Check: {machine.lastMaintenanceDate || 'Never'}</span>
                  <span>Hours: {machine.currentRunningHours || 0}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
