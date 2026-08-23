import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { saveMachine } from '../services/googleSheets';
import { getDefaultChecklist } from '../data/defaultChecklists';

// ─── Known machine types ───────────────────────────────────────────────────────
const KNOWN_TYPES = ['Boiler', 'Compressor', 'Generator', 'Chiller', 'Cooling Tunnel', 'Custom'];

// ─── Unique item ID generator ─────────────────────────────────────────────────
const newId = () =>
  `item_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

// ─── Inline Checklist Item Row ────────────────────────────────────────────────
const ItemRow = ({ item, onEdit, onDelete }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.description);

  const commit = () => {
    if (draft.trim()) onEdit(item.id, draft.trim());
    setEditing(false);
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '10px 14px',
        borderBottom: '1px solid var(--color-border)',
        background: '#fff',
      }}
    >
      {/* Drag handle / order indicator */}
      <div
        style={{
          width: '4px',
          height: '28px',
          borderRadius: '2px',
          background: 'var(--color-primary)',
          opacity: 0.3,
          flexShrink: 0,
        }}
      />

      {/* Description — click to edit */}
      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false); }}
          style={{
            flex: 1,
            padding: '6px 8px',
            borderRadius: '8px',
            border: '1.5px solid var(--color-primary)',
            fontSize: '0.85rem',
            outline: 'none',
          }}
        />
      ) : (
        <span
          onClick={() => setEditing(true)}
          style={{
            flex: 1,
            fontSize: '0.85rem',
            color: 'var(--color-text)',
            cursor: 'text',
            lineHeight: 1.4,
          }}
          title="Click to edit"
        >
          {item.description}
        </span>
      )}

      {/* Edit button */}
      <button
        onClick={() => setEditing(true)}
        title="Edit"
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#9ca3af' }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
      </button>

      {/* Delete button */}
      <button
        onClick={() => onDelete(item.id)}
        title="Delete"
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#f87171' }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
          <path d="M10 11v6"/><path d="M14 11v6"/>
        </svg>
      </button>
    </div>
  );
};

// ─── Add Item Row ─────────────────────────────────────────────────────────────
const AddItemRow = ({ onAdd, frequency }) => {
  const [text, setText] = useState('');

  const commit = () => {
    if (text.trim()) {
      onAdd({ id: newId(), description: text.trim(), frequency, part: 'General' });
      setText('');
    }
  };

  return (
    <div style={{ display: 'flex', gap: '8px', padding: '10px 14px', background: '#f9fafb', borderTop: '1px dashed var(--color-border)' }}>
      <input
        type="text"
        placeholder={`Add a ${frequency} checklist item...`}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') commit(); }}
        style={{
          flex: 1,
          padding: '8px 10px',
          borderRadius: '8px',
          border: '1.5px solid var(--color-border)',
          fontSize: '0.85rem',
          outline: 'none',
          background: '#fff',
        }}
      />
      <button
        onClick={commit}
        disabled={!text.trim()}
        style={{
          padding: '8px 14px',
          borderRadius: '8px',
          border: 'none',
          background: text.trim() ? 'var(--color-primary)' : '#e5e7eb',
          color: text.trim() ? '#fff' : '#9ca3af',
          fontWeight: 700,
          fontSize: '0.82rem',
          cursor: text.trim() ? 'pointer' : 'not-allowed',
          whiteSpace: 'nowrap',
          transition: 'all 0.15s',
        }}
      >
        + Add
      </button>
    </div>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────────
const AddMachine = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);          // 1 = details, 2 = checklist
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('daily'); // checklist tab

  const [formData, setFormData] = useState({
    machineType: 'Boiler',
    customTypeName: '',
    machineName: '',
    location: '',
    startingRunningHours: 0,
    maintenanceIntervalDays: 30,
  });

  // Per-machine checklist items
  const [checklistItems, setChecklistItems] = useState([]);

  // ── Step 1 → Step 2 ──────────────────────────────────────────────────────
  const handleStep1Next = (e) => {
    e.preventDefault();
    // Seed checklist with defaults for the chosen type
    const type = formData.machineType === 'Custom' ? 'Custom' : formData.machineType;
    setChecklistItems(getDefaultChecklist(type));
    setStep(2);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // ── Checklist mutations ──────────────────────────────────────────────────
  const addItem = useCallback((item) => {
    setChecklistItems((prev) => [...prev, item]);
  }, []);

  const editItem = useCallback((id, description) => {
    setChecklistItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, description } : item))
    );
  }, []);

  const deleteItem = useCallback((id) => {
    setChecklistItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  // ── Final save ──────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setLoading(true);
    const machineId = Date.now().toString() + Math.floor(Math.random() * 1000);
    const displayType =
      formData.machineType === 'Custom' ? formData.customTypeName || 'Custom' : formData.machineType;

    const generatedTag = formData.machineName.toUpperCase().replace(/[^A-Z0-9]/g, '-').slice(0, 12);
    const tagNumber = generatedTag ? `${generatedTag}-${Math.floor(100 + Math.random() * 900)}` : `MC-${Math.floor(1000 + Math.random() * 9000)}`;

    const newMachine = {
      machineType: displayType,
      machineName: formData.machineName,
      location: formData.location,
      startingRunningHours: Number(formData.startingRunningHours),
      maintenanceIntervalDays: Number(formData.maintenanceIntervalDays),
      tagNumber,
      model: '',
      serialNumber: '',
      installationDate: new Date().toISOString().slice(0, 10),
      maintenanceIntervalHours: 500,
      machineId,
      currentRunningHours: Number(formData.startingRunningHours),
      lastMaintenanceDate: '',
      nextMaintenanceDate: '',
      healthStatus: 'Green',
      checklistItems,
    };

    await saveMachine(newMachine);
    setTimeout(() => navigate('/dashboard'), 800);
  };


  // ─── Filtered checklist items for each tab ────────────────────────────────
  const dailyItems = checklistItems.filter((i) => i.frequency === 'daily');
  const weeklyItems = checklistItems.filter((i) => i.frequency === 'weekly');
  const activeItems = activeTab === 'daily' ? dailyItems : weeklyItems;

  // ─── Rendering ─────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg)', paddingBottom: '2rem' }}>

      {/* ── Navbar ── */}
      <nav className="navbar">
        <button
          className="btn btn-sm btn-outline"
          onClick={() => (step === 2 ? setStep(1) : navigate('/dashboard'))}
          style={{ border: 'none', padding: 0, fontSize: '1.5rem', width: '30px', color: 'var(--color-text)' }}
        >
          &larr;
        </button>
        <h1 style={{ fontSize: '1.125rem' }}>
          {step === 1 ? 'Add Machine' : 'Set Up Checklist'}
        </h1>
        <div style={{ width: '30px' }} />
      </nav>

      {/* ── Step indicator ── */}
      <div style={{ display: 'flex', gap: '6px', padding: '12px 16px 0' }}>
        {[1, 2].map((s) => (
          <div
            key={s}
            style={{
              flex: 1,
              height: '4px',
              borderRadius: '99px',
              background: s <= step ? 'var(--color-primary)' : '#e5e7eb',
              transition: 'background 0.3s',
            }}
          />
        ))}
      </div>
      <p style={{ textAlign: 'center', fontSize: '0.72rem', color: 'var(--color-text-light)', margin: '6px 0 0', fontWeight: 600 }}>
        Step {step} of 2 — {step === 1 ? 'Machine Details' : 'Checklist Items'}
      </p>

      <div className="container" style={{ paddingTop: '12px' }}>

        {/* ══════════════════ STEP 1: Machine Details ══════════════════ */}
        {step === 1 && (
          <div className="card">
            <form onSubmit={handleStep1Next}>

              {/* Machine Type */}
              <div className="form-group">
                <label>Machine Type</label>
                <select name="machineType" value={formData.machineType} onChange={handleChange} required>
                  {KNOWN_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t === 'Custom' ? 'Custom (specify below)' : t}
                    </option>
                  ))}
                </select>
              </div>

              {/* Custom type name field — only shown when Custom is selected */}
              {formData.machineType === 'Custom' && (
                <div className="form-group">
                  <label>Custom Machine Type Name</label>
                  <input
                    type="text"
                    name="customTypeName"
                    value={formData.customTypeName}
                    onChange={handleChange}
                    required
                    placeholder="e.g. Water Pump, Conveyor, Crane..."
                  />
                </div>
              )}

              <div className="form-group">
                <label>Machine Name</label>
                <input type="text" name="machineName" value={formData.machineName} onChange={handleChange} required placeholder="e.g. Primary Boiler A" />
              </div>

              <div className="form-group">
                <label>Location</label>
                <input type="text" name="location" value={formData.location} onChange={handleChange} required placeholder="e.g. Utility Room 1" />
              </div>

              <div className="form-group">
                <label>Starting Running Hours</label>
                <input type="number" name="startingRunningHours" value={formData.startingRunningHours} onChange={handleChange} required min="0" />
              </div>

              <div className="form-group">
                <label>Maint. Interval (Days)</label>
                <input type="number" name="maintenanceIntervalDays" value={formData.maintenanceIntervalDays} onChange={handleChange} required min="1" />
              </div>


              <button type="submit" className="btn btn-primary mt-4" style={{ width: '100%', padding: '13px' }}>
                Next: Set Up Checklist &rarr;
              </button>
            </form>
          </div>
        )}

        {/* ══════════════════ STEP 2: Checklist Builder ══════════════════ */}
        {step === 2 && (
          <div>
            {/* Info banner */}
            <div
              style={{
                background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                border: '1px solid #86efac',
                borderRadius: '14px',
                padding: '14px 16px',
                marginBottom: '16px',
                fontSize: '0.8rem',
                color: '#15803d',
                lineHeight: 1.5,
              }}
            >
              <strong>Checklist for: {formData.machineName}</strong>
              <br />
              {formData.machineType !== 'Custom'
                ? `Pre-loaded with default ${formData.machineType} items. Edit, remove, or add your own.`
                : 'Start building your custom checklist below.'}
              <br />
              <span style={{ color: '#6b7280', fontSize: '0.75rem' }}>Tip: Click any item text to edit it inline.</span>
            </div>

            {/* Daily / Weekly tabs */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              {['daily', 'weekly'].map((tab) => {
                const count = tab === 'daily' ? dailyItems.length : weeklyItems.length;
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    style={{
                      flex: 1,
                      padding: '10px',
                      borderRadius: '12px',
                      border: activeTab === tab ? 'none' : '1px solid var(--color-border)',
                      background: activeTab === tab ? 'var(--color-primary)' : '#fff',
                      color: activeTab === tab ? '#fff' : 'var(--color-text)',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    <span
                      style={{
                        marginLeft: '6px',
                        background: activeTab === tab ? 'rgba(255,255,255,0.3)' : '#f3f4f6',
                        color: activeTab === tab ? '#fff' : 'var(--color-text-light)',
                        borderRadius: '99px',
                        padding: '1px 7px',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                      }}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Item list */}
            <div
              style={{
                background: '#fff',
                borderRadius: '14px',
                border: '1px solid var(--color-border)',
                overflow: 'hidden',
                boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                marginBottom: '16px',
              }}
            >
              {activeItems.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--color-text-light)' }}>
                  <p style={{ margin: 0, fontSize: '0.85rem' }}>No {activeTab} items yet.</p>
                  <p style={{ margin: '4px 0 0', fontSize: '0.78rem' }}>Use the field below to add your first item.</p>
                </div>
              ) : (
                activeItems.map((item) => (
                  <ItemRow key={item.id} item={item} onEdit={editItem} onDelete={deleteItem} />
                ))
              )}

              {/* Add new item */}
              <AddItemRow onAdd={addItem} frequency={activeTab} />
            </div>

            {/* Summary pill */}
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-light)', fontWeight: 600 }}>
                {dailyItems.length} daily &nbsp;·&nbsp; {weeklyItems.length} weekly items configured
              </span>
            </div>

            {/* Save button */}
            <button
              className="btn btn-primary"
              style={{ width: '100%', padding: '14px', fontSize: '1rem', fontWeight: 700 }}
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? 'Saving Machine...' : 'Save Machine'}
            </button>

            <p style={{ textAlign: 'center', fontSize: '0.72rem', color: 'var(--color-text-light)', marginTop: '8px' }}>
              You can always edit the checklist later from the machine's detail page.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AddMachine;
