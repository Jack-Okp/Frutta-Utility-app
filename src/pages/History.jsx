import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchLogs, fetchMachines } from '../services/googleSheets';

const History = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [machine, setMachine] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      const machines = await fetchMachines();
      const foundMachine = machines.find(m => String(m.machineId) === String(id));
      setMachine(foundMachine);
      
      const machineLogs = await fetchLogs(id);
      // Sort by latest first
      machineLogs.sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime));
      setLogs(machineLogs);
      
      setLoading(false);
    };
    loadData();
  }, [id]);

  if (loading) return <div className="container mt-8 text-center">Loading...</div>;

  return (
    <div>
      <nav className="navbar">
        <button className="btn btn-sm btn-outline" onClick={() => navigate(-1)} style={{ border: 'none', padding: 0, fontSize: '1.5rem', width: '30px', color: 'var(--color-text)' }}>&larr;</button>
        <h1 style={{ fontSize: '1.125rem' }}>History</h1>
        <div style={{ width: '30px' }}></div>
      </nav>

      <div className="container">
        <div className="mb-4">
          <h2 className="text-lg" style={{ margin: 0 }}>{machine?.tagNumber}</h2>
          <p className="text-sm text-text-light">{machine?.machineName}</p>
        </div>

        {logs.length === 0 ? (
          <div className="card text-center">
            <p>No history found for this machine.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {logs.map((log) => (
              <div key={log.logId} className="card">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-semibold">{new Date(log.dateTime).toLocaleDateString()}</span>
                  <span className={`badge badge-${log.scoreStatus?.toLowerCase() === 'green' ? 'green' : 'amber'}`}>
                    {log.scoreStatus || 'Recorded'}
                  </span>
                </div>
                <div className="text-sm mb-2 text-text-light">
                  <span>By: {log.userName}</span> • <span>Hours: {log.runningHours}</span>
                </div>
                {log.remarks && (
                  <div className="text-sm mt-2" style={{ borderTop: '1px solid var(--color-border)', paddingTop: '0.5rem' }}>
                    <strong>Remarks:</strong> {log.remarks}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default History;
