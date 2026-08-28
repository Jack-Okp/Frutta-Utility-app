import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchWorkLogs, markWorkLogReadShared } from '../services/googleSheets';
import { exportWorkLogsToExcel } from '../services/excelWorkLogExport';
import { markMultipleWorkLogsAsRead, getLogUniqueId } from '../services/storage';
import WorkLogModal from '../components/WorkLogModal';

const RiskBadge = ({ risk }) => {
  const meta = {
    Low: { bg: '#dcfce7', color: '#16a34a', label: 'Low Risk' },
    Medium: { bg: '#fef3c7', color: '#d97706', label: 'Medium Risk' },
    High: { bg: '#fee2e2', color: '#dc2626', label: 'High Risk' },
  }[risk] || { bg: '#f3f4f6', color: '#6b7280', label: risk || '—' };

  return (
    <span
      style={{
        display: 'inline-block',
        fontSize: '0.7rem',
        fontWeight: 800,
        padding: '3px 8px',
        borderRadius: '99px',
        background: meta.bg,
        color: meta.color,
        whiteSpace: 'nowrap',
      }}
    >
      {meta.label}
    </span>
  );
};

const WorkLogHistory = () => {
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [allFetchedLogs, setAllFetchedLogs] = useState([]); // permanent archive for Excel
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [shiftFilter, setShiftFilter] = useState('All');
  const [riskFilter, setRiskFilter] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null); // for viewing detail modal

  const loadData = async () => {
    setLoading(true);
    const data = await fetchWorkLogs();
    const loadedLogs = data || [];
    setAllFetchedLogs(loadedLogs);

    // In-app work log display: Only show logs created within the last 24 hours
    const nowMs = Date.now();
    const logs24h = loadedLogs.filter((l) => {
      if (!l.createdAt) return true; // keep fallback if no timestamp
      const logMs = new Date(l.createdAt).getTime();
      return (nowMs - logMs) <= (24 * 60 * 60 * 1000);
    });

    setLogs(logs24h);
    setLoading(false);

    // Auto-mark logs as read when viewing work log history page & sync shared status across all 11 engineers
    const logIds = logs24h.map((l) => getLogUniqueId(l)).filter(Boolean);
    if (logIds.length > 0) {
      markMultipleWorkLogsAsRead(logIds);
      logIds.forEach((id) => markWorkLogReadShared(id));
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter logs
  const filteredLogs = logs.filter((log) => {
    if (shiftFilter !== 'All' && log.shift !== shiftFilter) return false;
    if (riskFilter !== 'All' && log.recurrenceRisk !== riskFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        log.location?.toLowerCase().includes(q) ||
        log.engineerName?.toLowerCase().includes(q) ||
        log.fault?.toLowerCase().includes(q) ||
        log.actionTaken?.toLowerCase().includes(q) ||
        log.spareParts?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg)', paddingBottom: '4rem' }}>
      
      {/* Navbar */}
      <nav className="navbar">
        <button
          className="btn btn-sm btn-outline"
          onClick={() => navigate('/dashboard')}
          style={{ border: 'none', padding: 0, fontSize: '1.5rem', width: '30px', color: 'var(--color-text)' }}
        >
          &larr;
        </button>
        <h1 style={{ fontSize: '1.125rem' }}>Digital Work Logs</h1>
        <div style={{ width: '30px' }} />
      </nav>

      <div className="container" style={{ paddingTop: '16px' }}>

        {/* Action Header Banner */}
        <div
          className="card mb-4"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, #10b98115 0%, #05966905 100%)',
            border: '1px solid #10b98133',
            padding: '16px',
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--color-primary)' }}>
              Work Log History
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: 'var(--color-text-light)' }}>
              {logs.length} logged repair & breakdown jobs across shifts
            </p>
          </div>
          <button
            className="btn btn-outline"
            onClick={() => exportWorkLogsToExcel(allFetchedLogs.length > 0 ? allFetchedLogs : filteredLogs, 'Frutta Utility - Permanent Digital Work Logs')}
            disabled={allFetchedLogs.length === 0 && filteredLogs.length === 0}
            style={{
              fontSize: '0.82rem',
              fontWeight: 800,
              padding: '8px 14px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: '#fff',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Export Excel
          </button>
        </div>

        {/* Search Input */}
        <div style={{ marginBottom: '12px' }}>
          <input
            type="text"
            placeholder="Search by machine, engineer, fault, or spare parts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: '12px',
              border: '1px solid var(--color-border)',
              fontSize: '0.88rem',
              outline: 'none',
              background: '#fff',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Filter Pills */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', overflowX: 'auto', paddingBottom: '4px' }}>
          {/* Shift Filter */}
          <select
            value={shiftFilter}
            onChange={(e) => setShiftFilter(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '10px',
              border: '1px solid var(--color-border)',
              fontSize: '0.8rem',
              fontWeight: 700,
              background: '#fff',
              color: 'var(--color-text)',
            }}
          >
            <option value="All">All Shifts</option>
            <option value="Morning">Morning Shift</option>
            <option value="Night">Night Shift</option>
          </select>

          {/* Risk Filter */}
          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '10px',
              border: '1px solid var(--color-border)',
              fontSize: '0.8rem',
              fontWeight: 700,
              background: '#fff',
              color: 'var(--color-text)',
            }}
          >
            <option value="All">All Recurrence Risks</option>
            <option value="High">High Risk Only</option>
            <option value="Medium">Medium Risk Only</option>
            <option value="Low">Low Risk Only</option>
          </select>
        </div>

        {/* Work Logs List */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--color-text-light)' }}>
            <p style={{ fontSize: '0.88rem' }}>Loading work logs...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="card text-center" style={{ padding: '36px 16px' }}>
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--color-text-light)' }}>
              No work logs found matching your filter criteria.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filteredLogs.map((log) => {
              const formattedDate = log.createdAt
                ? new Date(log.createdAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                : log.date || '—';

              return (
                <div
                  key={log.id}
                  className="card"
                  style={{
                    padding: '16px',
                    cursor: 'pointer',
                    transition: 'transform 0.15s, box-shadow 0.15s',
                  }}
                  onClick={() => setSelectedLog(log)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div>
                      <span style={{ fontSize: '0.72rem', color: 'var(--color-text-light)', fontWeight: 600 }}>
                        {formattedDate} &nbsp;·&nbsp; {log.shift || 'Shift'}
                      </span>
                      <h3 style={{ margin: '2px 0 0', fontSize: '1rem', fontWeight: 800, color: 'var(--color-text)' }}>
                        {log.location}
                      </h3>
                    </div>
                    <RiskBadge risk={log.recurrenceRisk} />
                  </div>

                  <p style={{ margin: '6px 0', fontSize: '0.85rem', color: 'var(--color-text)', lineHeight: 1.45 }}>
                    <strong>Issue:</strong> {log.fault}
                  </p>
                  
                  <p style={{ margin: '4px 0', fontSize: '0.82rem', color: 'var(--color-text-light)', lineHeight: 1.4 }}>
                    <strong>Action:</strong> {log.actionTaken}
                  </p>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', paddingTop: '8px', borderTop: '1px solid var(--color-border)', fontSize: '0.75rem', color: 'var(--color-text-light)' }}>
                    <span>By: <strong>{log.engineerName || 'Engineer'}</strong></span>
                    {log.spareParts && log.spareParts !== 'None' && (
                      <span style={{ background: '#f3f4f6', padding: '2px 8px', borderRadius: '6px' }}>
                        Parts: {log.spareParts}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* Log Details Modal */}
      {selectedLog && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 110,
            padding: '16px',
          }}
          onClick={() => setSelectedLog(null)}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '20px',
              padding: '24px',
              maxWidth: '480px',
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--color-text-light)', fontWeight: 600 }}>
                  {selectedLog.createdAt ? new Date(selectedLog.createdAt).toLocaleString() : selectedLog.date}
                </span>
                <h2 style={{ margin: '2px 0 0', fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-text)' }}>
                  {selectedLog.location}
                </h2>
              </div>
              <RiskBadge risk={selectedLog.recurrenceRisk} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.88rem' }}>
              <div>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--color-text-light)', textTransform: 'uppercase' }}>Shift</span>
                <p style={{ margin: '2px 0 0', fontWeight: 700 }}>{selectedLog.shift || '—'}</p>
              </div>

              <div>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--color-text-light)', textTransform: 'uppercase' }}>Engineer</span>
                <p style={{ margin: '2px 0 0', fontWeight: 700 }}>{selectedLog.engineerName || '—'}</p>
              </div>

              <div>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--color-text-light)', textTransform: 'uppercase' }}>Fault / Issue Description</span>
                <p style={{ margin: '2px 0 0', color: '#374151', lineHeight: 1.5, background: '#f9fafb', padding: '10px', borderRadius: '10px' }}>
                  {selectedLog.fault}
                </p>
              </div>

              <div>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--color-text-light)', textTransform: 'uppercase' }}>Action Taken / Resolution</span>
                <p style={{ margin: '2px 0 0', color: '#374151', lineHeight: 1.5, background: '#ecfdf5', padding: '10px', borderRadius: '10px', border: '1px solid #a7f3d0' }}>
                  {selectedLog.actionTaken}
                </p>
              </div>

              <div>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--color-text-light)', textTransform: 'uppercase' }}>Spare Parts Used</span>
                <p style={{ margin: '2px 0 0', fontWeight: 600, color: '#4b5563' }}>
                  {selectedLog.spareParts || 'None'}
                </p>
              </div>
            </div>

            <button
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '20px', padding: '12px' }}
              onClick={() => setSelectedLog(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Entry Modal */}
      <WorkLogModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => loadData()}
      />

      {/* Bottom Right Floating Action Button */}
      <button
        onClick={() => setIsModalOpen(true)}
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          borderRadius: '99px',
          background: 'var(--color-primary)',
          color: '#fff',
          border: 'none',
          padding: '14px 20px',
          fontWeight: 800,
          fontSize: '0.88rem',
          boxShadow: '0 8px 24px rgba(46, 125, 50, 0.4)',
          cursor: 'pointer',
          zIndex: 90,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        New Work Log
      </button>

    </div>
  );
};

export default WorkLogHistory;
