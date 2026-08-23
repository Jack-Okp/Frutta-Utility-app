import React, { useState, useEffect } from 'react';
import { getUser } from '../services/storage';
import { fetchMachines, fetchWorkLogs } from '../services/googleSheets';
import { detectCurrentShift } from './WorkLogModal';
import { formatWhatsAppShiftSummary } from '../services/shiftSummaryFormatter';

const ShiftSummaryModal = ({ isOpen, onClose }) => {
  const user = getUser();
  const [shift, setShift] = useState(detectCurrentShift());
  const [machines, setMachines] = useState([]);
  const [workLogs, setWorkLogs] = useState([]);
  const [sparesNotes, setSparesNotes] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load active shift machines & work logs
  useEffect(() => {
    if (isOpen) {
      setCopied(false);
      setLoading(true);

      const load = async () => {
        const [machinesData, logsData] = await Promise.all([
          fetchMachines(),
          fetchWorkLogs(),
        ]);

        // Map machines into editable state with default status OK
        const mappedMachines = (machinesData || []).map((m) => ({
          id: m.machineId,
          machineName: m.machineName,
          machineType: m.machineType,
          status: 'OK', // OK | Degraded | Not OK | Standby
          note: '',
        }));

        // Filter work logs created in last 24 hours
        const nowMs = Date.now();
        const shiftLogs = (logsData || []).filter((l) => {
          if (!l.createdAt) return false;
          const logMs = new Date(l.createdAt).getTime();
          return (nowMs - logMs) <= (24 * 60 * 60 * 1000);
        });

        setMachines(mappedMachines);
        setWorkLogs(shiftLogs);
        setLoading(false);
      };

      load();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const todayStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const engineerName = user?.name || user?.engineerName || 'Engineer';

  // Format live text string
  const formattedText = formatWhatsAppShiftSummary({
    shift,
    date: todayStr,
    engineerName,
    machines,
    workLogs,
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
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: '16px',
        animation: 'fadeIn 0.2s ease',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: '20px',
          padding: '24px',
          maxWidth: '560px',
          width: '100%',
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
          maxHeight: '92vh',
          overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--color-primary)' }}>
              Shift Summary Generator
            </h2>
            <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: 'var(--color-text-light)' }}>
              Compile closing report & send directly to WhatsApp
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: '#9ca3af' }}
          >
            &times;
          </button>
        </div>

        {/* Shift & Date Row */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <button
            type="button"
            onClick={() => setShift('Morning')}
            style={{
              flex: 1,
              padding: '8px',
              borderRadius: '10px',
              border: shift === 'Morning' ? 'none' : '1px solid var(--color-border)',
              background: shift === 'Morning' ? 'var(--color-primary)' : '#f9fafb',
              color: shift === 'Morning' ? '#fff' : 'var(--color-text)',
              fontWeight: 700,
              fontSize: '0.8rem',
              cursor: 'pointer',
            }}
          >
            Morning Shift (7 AM - 7 PM)
          </button>
          <button
            type="button"
            onClick={() => setShift('Night')}
            style={{
              flex: 1,
              padding: '8px',
              borderRadius: '10px',
              border: shift === 'Night' ? 'none' : '1px solid var(--color-border)',
              background: shift === 'Night' ? 'var(--color-primary)' : '#f9fafb',
              color: shift === 'Night' ? '#fff' : 'var(--color-text)',
              fontWeight: 700,
              fontSize: '0.8rem',
              cursor: 'pointer',
            }}
          >
            Night Shift (7 PM - 7 AM)
          </button>
        </div>

        {/* Machine Status Toggles */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 800, color: 'var(--color-text)', marginBottom: '8px' }}>
            Machine Statuses & Custom Notes
          </label>

          {loading ? (
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-light)' }}>Loading equipment list...</p>
          ) : machines.length === 0 ? (
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-light)', fontStyle: 'italic' }}>
              No machines registered yet.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '220px', overflowY: 'auto', paddingRight: '4px' }}>
              {machines.map((m) => (
                <div
                  key={m.id}
                  style={{
                    background: '#f9fafb',
                    border: '1px solid var(--color-border)',
                    borderRadius: '10px',
                    padding: '10px 12px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--color-text)' }}>
                      {m.machineName}
                    </span>

                    {/* Status Pills */}
                    <div style={{ display: 'flex', gap: '4px' }}>
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
                            padding: '3px 7px',
                            borderRadius: '6px',
                            border: m.status === st.key ? `1.5px solid ${st.color}` : '1px solid transparent',
                            background: m.status === st.key ? st.bg : '#fff',
                            color: m.status === st.key ? st.color : '#9ca3af',
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                          }}
                        >
                          {st.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Optional Note */}
                  <input
                    type="text"
                    placeholder="Add optional note/description (e.g. Low level due to ELW)..."
                    value={m.note}
                    onChange={(e) => handleNoteChange(m.id, e.target.value)}
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      borderRadius: '6px',
                      border: '1px solid #e5e7eb',
                      fontSize: '0.78rem',
                      outline: 'none',
                      background: '#fff',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Urgent Spares Input */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 800, color: 'var(--color-text)', marginBottom: '6px' }}>
            Urgent Spares Required (Optional)
          </label>
          <textarea
            rows={2}
            placeholder="e.g. 1-Liter Spare Heaters&#10;Sleeve Brush Belt & Bearing..."
            value={sparesNotes}
            onChange={(e) => setSparesNotes(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 10px',
              borderRadius: '10px',
              border: '1px solid var(--color-border)',
              fontSize: '0.82rem',
              outline: 'none',
              boxSizing: 'border-box',
              resize: 'vertical',
            }}
          />
        </div>

        {/* Live WhatsApp Text Preview */}
        <div style={{ marginBottom: '18px' }}>
          <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 800, color: '#059669', marginBottom: '6px' }}>
            WhatsApp Text Preview
          </label>
          <pre
            style={{
              background: '#0f172a',
              color: '#38bdf8',
              padding: '12px',
              borderRadius: '12px',
              fontSize: '0.75rem',
              fontFamily: 'monospace',
              whiteSpace: 'pre-wrap',
              maxHeight: '180px',
              overflowY: 'auto',
              border: '1px solid #1e293b',
              margin: 0,
              lineHeight: 1.4,
            }}
          >
            {formattedText}
          </pre>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '8px' }}>
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
              fontSize: '0.82rem',
              color: copied ? '#16a34a' : 'var(--color-text)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
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
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxShadow: '0 4px 12px rgba(37, 211, 102, 0.3)',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l.159.256-1.002 3.659 3.754-.984.232.136z"/>
            </svg>
            Open in WhatsApp
          </button>
        </div>

      </div>
    </div>
  );
};

export default ShiftSummaryModal;
