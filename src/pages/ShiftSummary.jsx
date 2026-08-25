import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUser } from '../services/storage';
import { fetchMachines, fetchWorkLogs } from '../services/googleSheets';
import { detectCurrentShift } from '../components/WorkLogModal';
import {
  formatWhatsAppShiftSummary,
  checkShiftSummaryAvailability,
  filterWorkLogsForShift,
} from '../services/shiftSummaryFormatter';

const ShiftSummary = () => {
  const navigate = useNavigate();
  const user = getUser();
  
  const availability = checkShiftSummaryAvailability();
  const [overrideLock, setOverrideLock] = useState(false);
  const [shift, setShift] = useState(availability.activeShift || detectCurrentShift());
  const [machines, setMachines] = useState([]);
  const [allRawWorkLogs, setAllRawWorkLogs] = useState([]);
  const [sparesNotes, setSparesNotes] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [machinesData, logsData] = await Promise.all([
        fetchMachines(),
        fetchWorkLogs(),
      ]);

      const mappedMachines = (machinesData || []).map((m) => ({
        id: m.machineId,
        machineName: m.machineName,
        machineType: m.machineType,
        status: 'OK',
        note: '',
      }));

      setMachines(mappedMachines);
      setAllRawWorkLogs(logsData || []);
      setLoading(false);
    };

    load();
  }, []);

  const todayYMD = new Date().toISOString().split('T')[0];
  const activeShiftLogs = filterWorkLogsForShift(allRawWorkLogs, shift, todayYMD);

  const todayStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const engineerName = user?.name || user?.engineerName || 'Engineer';

  const formattedText = formatWhatsAppShiftSummary({
    shift,
    date: todayStr,
    engineerName,
    machines,
    workLogs: activeShiftLogs,
    sparesNotes,
  });

  const handleStatusChange = (id, newStatus) => {
    setMachines((prev) =>
      prev.map((m) => (m.id === id ? { ...m, status: newStatus } : m))
    );
  };

  const handleNoteChange = (id, newNote) => {
    setMachines((prev) =>
      prev.map((m) => (m.id === id ? { ...m, note: newNote } : m))
    );
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(formattedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleWhatsAppOpen = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(formattedText)}`;
    window.open(url, '_blank');
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg)', paddingBottom: '5rem' }}>
      
      {/* Navbar Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '14px 16px',
          backgroundColor: 'var(--color-bg)',
          borderBottom: '1px solid var(--color-border)',
          position: 'sticky',
          top: 0,
          zIndex: 20,
        }}
      >
        <button
          onClick={() => navigate('/dashboard')}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '1.4rem',
            cursor: 'pointer',
            color: 'var(--color-primary)',
            padding: 0,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          &larr;
        </button>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-primary)' }}>
            Shift Closing Report Generator
          </h1>
          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-text-light)' }}>
            Review equipment status & generate WhatsApp handover report
          </p>
        </div>
      </div>

      <div className="container" style={{ padding: '16px', maxWidth: '720px', margin: '0 auto' }}>
        
        {/* Availability Window Lock Screen */}
        {!availability.available && !overrideLock && (
          <div
            className="card mb-4"
            style={{
              padding: '24px',
              textAlign: 'center',
              background: '#fffbeb',
              border: '1.5px solid #fde68a',
            }}
          >
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                background: '#f59e0b',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px',
                fontSize: '1.2rem',
                fontWeight: 800,
              }}
            >
              !
            </div>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#92400e', margin: '0 0 8px' }}>
              Shift Summary Not Available Until End of Shift
            </h2>
            <p style={{ fontSize: '0.82rem', color: '#b45309', margin: '0 0 16px', lineHeight: 1.5 }}>
              Shift closing reports are only accessible during official shift handover hours:
              <br />
              &bull; <strong>Morning Shift Report</strong>: Available 7:00 PM – 8:00 PM
              <br />
              &bull; <strong>Night Shift Report</strong>: Available 7:00 AM – 8:00 AM
            </p>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                style={{
                  padding: '10px 16px',
                  borderRadius: '10px',
                  border: '1px solid #d1d5db',
                  background: '#fff',
                  fontWeight: 800,
                  fontSize: '0.82rem',
                  color: '#374151',
                  cursor: 'pointer',
                }}
              >
                Back to Dashboard
              </button>
              <button
                type="button"
                onClick={() => setOverrideLock(true)}
                style={{
                  padding: '10px 16px',
                  borderRadius: '10px',
                  border: 'none',
                  background: '#d97706',
                  color: '#fff',
                  fontWeight: 800,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                }}
              >
                Admin / Test Preview Override
              </button>
            </div>
          </div>
        )}

        {(availability.available || overrideLock) && (
          <>
            {/* Shift Selection Bar */}
        <div className="card mb-4" style={{ padding: '16px' }}>
          <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 800, color: 'var(--color-text)', marginBottom: '8px' }}>
            Select Active Shift & Date
          </label>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={() => setShift('Morning')}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '12px',
                border: shift === 'Morning' ? 'none' : '1px solid var(--color-border)',
                background: shift === 'Morning' ? 'var(--color-primary)' : '#f9fafb',
                color: shift === 'Morning' ? '#fff' : 'var(--color-text)',
                fontWeight: 800,
                fontSize: '0.85rem',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              Morning Shift (7 AM - 7 PM)
            </button>
            <button
              type="button"
              onClick={() => setShift('Night')}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '12px',
                border: shift === 'Night' ? 'none' : '1px solid var(--color-border)',
                background: shift === 'Night' ? 'var(--color-primary)' : '#f9fafb',
                color: shift === 'Night' ? '#fff' : 'var(--color-text)',
                fontWeight: 800,
                fontSize: '0.85rem',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              Night Shift (7 PM - 7 AM)
            </button>
          </div>
          <div style={{ marginTop: '8px', fontSize: '0.78rem', color: 'var(--color-text-light)', textAlign: 'right' }}>
            Date: <strong>{todayStr}</strong> &bull; Engineer: <strong>{engineerName}</strong>
          </div>
        </div>

        {/* Full Equipment Status Section */}
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--color-text)', marginBottom: '12px' }}>
            Equipment Statuses & Custom Notes ({machines.length} Assets)
          </h2>

          {loading ? (
            <div className="card text-center" style={{ padding: '24px' }}>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-light)' }}>Loading equipment list...</p>
            </div>
          ) : machines.length === 0 ? (
            <div className="card text-center" style={{ padding: '24px' }}>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-light)', fontStyle: 'italic' }}>
                No machines registered yet. Add machines from the dashboard.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {machines.map((m) => (
                <div
                  key={m.id}
                  className="card"
                  style={{
                    padding: '16px',
                    background: '#fff',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--color-text)' }}>
                        {m.machineName}
                      </span>
                      {m.machineType && (
                        <span style={{ marginLeft: '8px', fontSize: '0.72rem', color: '#6b7280', background: '#f3f4f6', padding: '2px 8px', borderRadius: '99px' }}>
                          {m.machineType}
                        </span>
                      )}
                    </div>

                    {/* Status Choice Pills */}
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {[
                        { key: 'OK', label: 'OK', bg: '#dcfce7', color: '#16a34a' },
                        { key: 'Degraded', label: 'Degraded', bg: '#fef3c7', color: '#d97706' },
                        { key: 'Not OK', label: 'Not OK', bg: '#fee2e2', color: '#dc2626' },
                        { key: 'Standby', label: 'Standby', bg: '#f3f4f6', color: '#4b5563' },
                      ].map((st) => (
                        <button
                          key={st.key}
                          type="button"
                          onClick={() => handleStatusChange(m.id, st.key)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '8px',
                            border: m.status === st.key ? `2px solid ${st.color}` : '1px solid #e5e7eb',
                            background: m.status === st.key ? st.bg : '#fff',
                            color: m.status === st.key ? st.color : '#9ca3af',
                            fontSize: '0.78rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            transition: 'all 0.15s',
                          }}
                        >
                          {st.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Optional Custom Note Input */}
                  <input
                    type="text"
                    placeholder="Add optional note/description (e.g. Low level due to ELW, Floatless switch needed)..."
                    value={m.note}
                    onChange={(e) => handleNoteChange(m.id, e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--color-border)',
                      fontSize: '0.85rem',
                      outline: 'none',
                      background: '#f9fafb',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Urgent Spares & Actions Required */}
        <div className="card mb-4" style={{ padding: '16px' }}>
          <h2 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--color-text)', marginBottom: '8px' }}>
            Urgent Spares & Required Procurement
          </h2>
          <textarea
            rows={3}
            placeholder="List any urgent spare parts or procurement needed (e.g. 1-Liter Spare Heaters, Sleeve Brush Belt)..."
            value={sparesNotes}
            onChange={(e) => setSparesNotes(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '10px',
              border: '1px solid var(--color-border)',
              fontSize: '0.88rem',
              outline: 'none',
              boxSizing: 'border-box',
              resize: 'vertical',
            }}
          />
        </div>

        {/* Jobs Completed Section (Auto-populated from 24h work logs) */}
        <div className="card mb-4" style={{ padding: '16px' }}>
          <h2 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--color-text)', marginBottom: '8px' }}>
            Jobs Completed During Shift ({workLogs.length})
          </h2>
          {workLogs.length === 0 ? (
            <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--color-text-light)', fontStyle: 'italic' }}>
              No breakdown repair jobs logged during this shift.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {workLogs.map((log, idx) => (
                <div
                  key={log.id || idx}
                  style={{
                    background: '#f9fafb',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    fontSize: '0.82rem',
                  }}
                >
                  <div style={{ fontWeight: 800, color: 'var(--color-primary)' }}>
                    {log.location}
                  </div>
                  <div style={{ color: 'var(--color-text)', margin: '2px 0' }}>
                    <strong>Issue:</strong> {log.fault} &bull; <strong>Action:</strong> {log.actionTaken}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                    Recurrence Review: <strong>{log.recurrenceRisk || 'Low'} Risk</strong>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Live WhatsApp Text Preview */}
        <div className="card mb-4" style={{ padding: '16px' }}>
          <h2 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#059669', marginBottom: '8px' }}>
            Formatted WhatsApp Report Preview
          </h2>
          <pre
            style={{
              background: '#0f172a',
              color: '#38bdf8',
              padding: '14px',
              borderRadius: '12px',
              fontSize: '0.78rem',
              fontFamily: 'monospace',
              whiteSpace: 'pre-wrap',
              maxHeight: '260px',
              overflowY: 'auto',
              border: '1px solid #1e293b',
              margin: 0,
              lineHeight: 1.45,
            }}
          >
            {formattedText}
          </pre>
        </div>

      </div>

      {/* Sticky Bottom Actions Bar */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: '#fff',
          borderTop: '1px solid var(--color-border)',
          padding: '12px 16px',
          display: 'flex',
          gap: '10px',
          maxWidth: '720px',
          margin: '0 auto',
          zIndex: 30,
          boxShadow: '0 -4px 20px rgba(0,0,0,0.08)',
        }}
      >
        <button
          type="button"
          onClick={handleCopy}
          style={{
            flex: 1,
            padding: '12px',
            borderRadius: '12px',
            border: '1px solid var(--color-border)',
            background: '#fff',
            fontWeight: 800,
            fontSize: '0.85rem',
            color: copied ? '#16a34a' : 'var(--color-text)',
            cursor: 'pointer',
          }}
        >
          {copied ? '✓ Copied Text!' : '📋 Copy Text'}
        </button>

        <button
          type="button"
          onClick={handleWhatsAppOpen}
          style={{
            flex: 1.5,
            padding: '12px',
            borderRadius: '12px',
            border: 'none',
            background: '#25D366',
            color: '#fff',
            fontWeight: 800,
            fontSize: '0.88rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: '0 4px 12px rgba(37, 211, 102, 0.3)',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l.159.256-1.002 3.659 3.754-.984.232.136z"/>
          </svg>
          Open in WhatsApp
        </button>
      </div>
      </>
      )}

    </div>
  );
};

export default ShiftSummary;
