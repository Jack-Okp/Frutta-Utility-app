import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchMachines, fetchLogs } from '../services/googleSheets';
import { exportToPdf } from '../services/pdf';

const Export = () => {
  const navigate = useNavigate();
  const [machines, setMachines] = useState([]);
  const [selectedMachineId, setSelectedMachineId] = useState('');
  const [reportType, setReportType] = useState('daily');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);

  useEffect(() => {
    const loadMachines = async () => {
      const data = await fetchMachines();
      setMachines(data || []);
    };
    loadMachines();
  }, []);

  const handleGeneratePreview = async () => {
    if (!selectedMachineId || !startDate || !endDate) return;
    setLoading(true);
    
    const logs = await fetchLogs(selectedMachineId);
    
    // filter logs
    const filteredLogs = logs.filter(log => {
      const logDate = new Date(log.dateTime);
      const sDate = new Date(startDate);
      const eDate = new Date(endDate);
      eDate.setHours(23, 59, 59, 999);
      return logDate >= sDate && logDate <= eDate;
    });

    const machine = machines.find(m => String(m.machineId) === String(selectedMachineId));

    setReportData({
      machine,
      logs: filteredLogs,
      startDate,
      endDate
    });
    
    setLoading(false);
  };

  const handleDownloadPdf = () => {
    if (reportData) {
      exportToPdf('report-content', `Frutta_${reportData.machine.tagNumber}_Report.pdf`);
    }
  };

  return (
    <div>
      <nav className="navbar">
        <button className="btn btn-sm btn-outline" onClick={() => navigate(-1)} style={{ border: 'none', padding: 0, fontSize: '1.5rem', width: '30px', color: 'var(--color-text)' }}>&larr;</button>
        <h1 style={{ fontSize: '1.125rem' }}>Export Report</h1>
        <div style={{ width: '30px' }}></div>
      </nav>

      <div className="container">
        <div className="card mb-4">
          <div className="form-group">
            <label>Select Machine</label>
            <select value={selectedMachineId} onChange={e => setSelectedMachineId(e.target.value)}>
              <option value="">-- Choose Machine --</option>
              {machines.map(m => (
                <option key={m.machineId} value={m.machineId}>{m.tagNumber} - {m.machineName}</option>
              ))}
            </select>
          </div>
          
          <div className="form-group">
            <label>Report Type</label>
            <select value={reportType} onChange={e => setReportType(e.target.value)}>
              <option value="daily">Daily Checks</option>
              <option value="weekly">Weekly Checks</option>
              <option value="monthly">Monthly Checks</option>
            </select>
          </div>

          <div className="flex gap-4">
            <div className="form-group w-full">
              <label>Start Date</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required />
            </div>
            <div className="form-group w-full">
              <label>End Date</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} required />
            </div>
          </div>

          <button 
            className="btn btn-primary mt-2" 
            onClick={handleGeneratePreview}
            disabled={!selectedMachineId || !startDate || !endDate || loading}
          >
            {loading ? 'Generating...' : 'Preview Report'}
          </button>
        </div>

        {reportData && (
          <div>
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-semibold text-text-light">PREVIEW</h3>
              <button className="btn btn-sm btn-success" onClick={handleDownloadPdf}>Download PDF</button>
            </div>
            
            {/* The printable area */}
            <div id="report-content" className="card" style={{ padding: '2rem', backgroundColor: 'white', border: '1px solid #ccc' }}>
              <div style={{ textAlign: 'center', marginBottom: '2rem', borderBottom: '2px solid var(--color-primary)', paddingBottom: '1rem' }}>
                <h1 style={{ color: 'var(--color-primary)', margin: 0 }}>Frutta Utility Report</h1>
                <p style={{ margin: 0, color: 'var(--color-text-light)' }}>
                  {new Date(reportData.startDate).toLocaleDateString()} - {new Date(reportData.endDate).toLocaleDateString()}
                </p>
              </div>

              <div style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>{reportData.machine.machineName} ({reportData.machine.tagNumber})</h2>
                <p style={{ margin: 0 }}><strong>Type:</strong> {reportData.machine.machineType}</p>
                <p style={{ margin: 0 }}><strong>Location:</strong> {reportData.machine.location}</p>
                <p style={{ margin: 0 }}><strong>Model:</strong> {reportData.machine.model || 'N/A'} | <strong>S/N:</strong> {reportData.machine.serialNumber || 'N/A'}</p>
              </div>

              {reportData.logs.length === 0 ? (
                <p>No logs found for the selected period.</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--color-bg-secondary)', textAlign: 'left' }}>
                      <th style={{ padding: '8px', borderBottom: '1px solid var(--color-border)' }}>Date</th>
                      <th style={{ padding: '8px', borderBottom: '1px solid var(--color-border)' }}>Inspector</th>
                      <th style={{ padding: '8px', borderBottom: '1px solid var(--color-border)' }}>Status</th>
                      <th style={{ padding: '8px', borderBottom: '1px solid var(--color-border)' }}>Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.logs.map(log => (
                      <tr key={log.logId}>
                        <td style={{ padding: '8px', borderBottom: '1px solid var(--color-border)' }}>{new Date(log.dateTime).toLocaleDateString()}</td>
                        <td style={{ padding: '8px', borderBottom: '1px solid var(--color-border)' }}>{log.userName}</td>
                        <td style={{ padding: '8px', borderBottom: '1px solid var(--color-border)' }}>{log.scoreStatus}</td>
                        <td style={{ padding: '8px', borderBottom: '1px solid var(--color-border)' }}>{log.remarks || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Export;
