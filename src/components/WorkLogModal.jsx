import React, { useState, useEffect } from 'react';
import { getUser } from '../services/storage';
import { saveWorkLog } from '../services/googleSheets';

/**
 * Auto-detect active shift based on local device time:
 * Morning: 7:00 AM (07:00) to 6:59 PM (18:59)
 * Night: 7:00 PM (19:00) to 6:59 AM (06:59 next day)
 */
export const detectCurrentShift = () => {
  const hour = new Date().getHours();
  return (hour >= 7 && hour < 19) ? 'Morning' : 'Night';
};

const WorkLogModal = ({ isOpen, onClose, onSuccess, initialLocation = '' }) => {
  const user = getUser();
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    location: '',
    shift: detectCurrentShift(),
    fault: '',
    actionTaken: '',
    spareParts: '',
    recurrenceRisk: 'Low', // Low | Medium | High
  });

  useEffect(() => {
    if (isOpen) {
      setForm({
        location: initialLocation || '',
        shift: detectCurrentShift(),
        fault: '',
        actionTaken: '',
        spareParts: '',
        recurrenceRisk: 'Low',
      });
      setSaving(false);
    }
  }, [isOpen, initialLocation]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.location.trim() || !form.fault.trim() || !form.actionTaken.trim()) return;

    setSaving(true);

    const newLog = {
      id: `worklog_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      location: form.location.trim(),
      shift: form.shift,
      fault: form.fault.trim(),
      actionTaken: form.actionTaken.trim(),
      spareParts: form.spareParts.trim() || 'None',
      recurrenceRisk: form.recurrenceRisk,
      engineerName: user?.name || user?.engineerName || 'Engineer',
      createdAt: new Date().toISOString(),
      date: new Date().toISOString().slice(0, 10),
    };

    await saveWorkLog(newLog);
    setSaving(false);
    if (onSuccess) onSuccess(newLog);
    onClose();
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
          maxWidth: '500px',
          width: '100%',
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--color-primary)' }}>
              Digital Work Log
            </h2>
            <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: 'var(--color-text-light)' }}>
              Record maintenance, breakdown, or job resolution
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: '#9ca3af' }}
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          {/* Machine / Location (Manual Entry) */}
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-text)', marginBottom: '6px' }}>
              Machine / Location Name <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Primary Boiler A, Shrink Machine 2, Chiller Line 1..."
              value={form.location}
              onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '10px',
                border: '1.5px solid var(--color-border)',
                fontSize: '0.88rem',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Shift Selection */}
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-text)', marginBottom: '6px' }}>
              Shift
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {['Morning', 'Night'].map((s) => (
                <button
                  type="button"
                  key={s}
                  onClick={() => setForm((f) => ({ ...f, shift: s }))}
                  style={{
                    flex: 1,
                    padding: '9px',
                    borderRadius: '10px',
                    border: form.shift === s ? 'none' : '1px solid var(--color-border)',
                    background: form.shift === s ? 'var(--color-primary)' : '#f9fafb',
                    color: form.shift === s ? '#fff' : 'var(--color-text)',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {s === 'Morning' ? '☀️ Morning (7 AM - 7 PM)' : '🌙 Night (7 PM - 7 AM)'}
                </button>
              ))}
            </div>
          </div>

          {/* Fault / Issue Description */}
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-text)', marginBottom: '6px' }}>
              Fault / Issue Description <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <textarea
              required
              rows={3}
              placeholder="Describe the breakdown, error code, or problem that occurred..."
              value={form.fault}
              onChange={(e) => setForm((f) => ({ ...f, fault: e.target.value }))}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '10px',
                border: '1.5px solid var(--color-border)',
                fontSize: '0.88rem',
                outline: 'none',
                boxSizing: 'border-box',
                resize: 'vertical',
              }}
            />
          </div>

          {/* Action Taken / Resolution */}
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-text)', marginBottom: '6px' }}>
              Action Taken / Resolution <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <textarea
              required
              rows={3}
              placeholder="Detail what steps were taken to resolve or repair the issue..."
              value={form.actionTaken}
              onChange={(e) => setForm((f) => ({ ...f, actionTaken: e.target.value }))}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '10px',
                border: '1.5px solid var(--color-border)',
                fontSize: '0.88rem',
                outline: 'none',
                boxSizing: 'border-box',
                resize: 'vertical',
              }}
            />
          </div>

          {/* Spare Parts Used */}
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-text)', marginBottom: '6px' }}>
              Spare Parts Used (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. O-Ring 22mm, Pressure Switch, Gasket Set..."
              value={form.spareParts}
              onChange={(e) => setForm((f) => ({ ...f, spareParts: e.target.value }))}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '10px',
                border: '1.5px solid var(--color-border)',
                fontSize: '0.88rem',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* 30-Day Recurrence Possibility */}
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-text)', marginBottom: '6px' }}>
              Possibility of Happening Again in Next 30 Days
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {[
                { level: 'Low', label: '🟢 Low Risk', bg: '#dcfce7', color: '#16a34a', border: '#86efac' },
                { level: 'Medium', label: '🟡 Medium Risk', bg: '#fef3c7', color: '#d97706', border: '#fde68a' },
                { level: 'High', label: '🔴 High Risk', bg: '#fee2e2', color: '#dc2626', border: '#fca5a5' },
              ].map((r) => (
                <button
                  type="button"
                  key={r.level}
                  onClick={() => setForm((f) => ({ ...f, recurrenceRisk: r.level }))}
                  style={{
                    flex: 1,
                    padding: '9px 6px',
                    borderRadius: '10px',
                    border: form.recurrenceRisk === r.level ? `2px solid ${r.color}` : '1px solid var(--color-border)',
                    background: form.recurrenceRisk === r.level ? r.bg : '#fff',
                    color: form.recurrenceRisk === r.level ? r.color : 'var(--color-text)',
                    fontWeight: 800,
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* Submit */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '12px',
                border: '1px solid var(--color-border)',
                background: '#fff',
                fontWeight: 700,
                fontSize: '0.88rem',
                color: 'var(--color-text)',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn btn-primary"
              style={{
                flex: 2,
                padding: '12px',
                borderRadius: '12px',
                fontWeight: 800,
                fontSize: '0.9rem',
              }}
            >
              {saving ? 'Saving Work Log...' : 'Submit Work Log'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default WorkLogModal;
