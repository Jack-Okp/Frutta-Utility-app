import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchMachines, updateMachine } from '../services/googleSheets';
import { getDefaultChecklist } from '../data/defaultChecklists';

// ─── Unique ID generator ──────────────────────────────────────────────────────
const newId = () =>
  `item_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

// ─── Individual Editable Checklist Item Row ──────────────────────────────────
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
        padding: '12px 16px',
        borderBottom: '1px solid var(--color-border)',
        background: '#fff',
      }}
    >
      {/* Visual Indicator */}
      <div
        style={{
          width: '4px',
          height: '28px',
          borderRadius: '2px',
          background: 'var(--color-primary)',
          opacity: 0.4,
          flexShrink: 0,
        }}
      />

      {/* Item text/edit field */}
      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
            if (e.key === 'Escape') setEditing(false);
          }}
          style={{
            flex: 1,
            padding: '6px 10px',
            borderRadius: '8px',
            border: '1.5px solid var(--color-primary)',
            fontSize: '0.88rem',
            outline: 'none',
          }}
        />
      ) : (
        <span
          onClick={() => setEditing(true)}
          style={{
            flex: 1,
            fontSize: '0.88rem',
            color: 'var(--color-text)',
            cursor: 'text',
            lineHeight: 1.4,
          }}
          title="Click to edit"
        >
          {item.description}
        </span>
      )}

      {/* Edit icon button */}
      <button
        onClick={() => setEditing(true)}
        title="Edit Item"
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#9ca3af' }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
      </button>

      {/* Delete icon button */}
      <button
        onClick={() => onDelete(item.id)}
        title="Delete Item"
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#f87171' }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
          <path d="M10 11v6"/><path d="M14 11v6"/>
        </svg>
      </button>
    </div>
  );
};

// ─── Add Item Bar ─────────────────────────────────────────────────────────────
const AddItemBar = ({ onAdd, frequency }) => {
  const [text, setText] = useState('');

  const commit = () => {
    if (text.trim()) {
      onAdd({ id: newId(), description: text.trim(), frequency, part: 'General' });
      setText('');
    }
  };

  return (
    <div style={{ display: 'flex', gap: '8px', padding: '12px 16px', background: '#f9fafb', borderTop: '1px dashed var(--color-border)' }}>
      <input
        type="text"
        placeholder={`Add a ${frequency} item...`}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') commit(); }}
        style={{
          flex: 1,
          padding: '10px 12px',
          borderRadius: '10px',
          border: '1.5px solid var(--color-border)',
          fontSize: '0.88rem',
          outline: 'none',
          background: '#fff',
        }}
      />
      <button
        onClick={commit}
        disabled={!text.trim()}
        style={{
          padding: '10px 16px',
          borderRadius: '10px',
          border: 'none',
          background: text.trim() ? 'var(--color-primary)' : '#e5e7eb',
          color: text.trim() ? '#fff' : '#9ca3af',
          fontWeight: 700,
          fontSize: '0.85rem',
          cursor: text.trim() ? 'pointer' : 'not-allowed',
          whiteSpace: 'nowrap',
          transition: 'all 0.15s',
        }}
      >
        Add
      </button>
    </div>
  );
};

// ─── Main Editor Component ───────────────────────────────────────────────────
const ChecklistEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [machine, setMachine] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checklistItems, setChecklistItems] = useState([]);
  const [activeTab, setActiveTab] = useState('daily');
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // ── Load machine and checklist ─────────────────────────────────────────────
  useEffect(() => {
    const loadMachine = async () => {
      const machines = await fetchMachines();
      const found = machines.find((m) => String(m.machineId) === String(id));
      if (found) {
        setMachine(found);
        // Load custom or fallback to defaults
        const baseItems = found.checklistItems || getDefaultChecklist(found.machineType);
        setChecklistItems(baseItems);
      }
      setLoading(false);
    };
    loadMachine();
  }, [id]);

  // ── Checklist item mutations ───────────────────────────────────────────────
  const addItem = useCallback((item) => {
    setChecklistItems((prev) => [...prev, item]);
  }, []);

  const editItem = useCallback((itemId, description) => {
    setChecklistItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, description } : i))
    );
  }, []);

  const deleteItem = useCallback((itemId) => {
    setChecklistItems((prev) => prev.filter((i) => i.id !== itemId));
  }, []);

  // ── Save Changes ───────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!machine) return;
    setSaving(true);
    setSuccessMsg('');

    const updated = {
      ...machine,
      checklistItems,
    };

    await updateMachine(updated);
    setSaving(false);
    setSuccessMsg('Checklist saved successfully!');
    setTimeout(() => {
      setSuccessMsg('');
      navigate(`/machine/${id}`);
    }, 1200);
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--color-text-light)' }}>Loading Checklist Editor...</p>
      </div>
    );
  }

  if (!machine) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--color-text-light)' }}>Machine not found.</p>
          <button className="btn btn-primary" onClick={() => navigate('/dashboard')}>
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const dailyItems = checklistItems.filter((i) => i.frequency === 'daily');
  const weeklyItems = checklistItems.filter((i) => i.frequency === 'weekly');
  const activeItems = activeTab === 'daily' ? dailyItems : weeklyItems;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg)', paddingBottom: '6rem' }}>
      
      {/* Navbar */}
      <nav className="navbar">
        <button
          className="btn btn-sm btn-outline"
          onClick={() => navigate(-1)}
          style={{ border: 'none', padding: 0, fontSize: '1.5rem', width: '30px', color: 'var(--color-text)' }}
        >
          &larr;
        </button>
        <h1 style={{ fontSize: '1.125rem' }}>Edit Checklist</h1>
        <div style={{ width: '30px' }} />
      </nav>

      <div className="container" style={{ paddingTop: '16px' }}>

        {/* Machine Header details */}
        <div className="card mb-4" style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'var(--color-bg-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              color: 'var(--color-primary)',
              fontSize: '0.85rem',
              border: '1.5px solid var(--color-primary-light)',
            }}
          >
            {machine.machineType.slice(0, 3).toUpperCase()}
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--color-text)' }}>
              {machine.machineName}
            </h2>
            <p style={{ margin: '3px 0 0', fontSize: '0.75rem', color: 'var(--color-text-light)' }}>
              Configure your daily and weekly inspection tasks. Click text to edit.
            </p>
          </div>
        </div>

        {/* Success toast / message */}
        {successMsg && (
          <div
            style={{
              padding: '12px 16px',
              background: '#ecfdf5',
              border: '1px solid #10b981',
              borderRadius: '12px',
              color: '#065f46',
              fontSize: '0.85rem',
              fontWeight: 700,
              textAlign: 'center',
              marginBottom: '16px',
              animation: 'fadeIn 0.2s ease',
            }}
          >
            {successMsg}
          </div>
        )}

        {/* Daily / Weekly Selector */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          {['daily', 'weekly'].map((tab) => {
            const count = tab === 'daily' ? dailyItems.length : weeklyItems.length;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '14px',
                  border: activeTab === tab ? 'none' : '1px solid var(--color-border)',
                  background: activeTab === tab ? 'var(--color-primary)' : '#fff',
                  color: activeTab === tab ? '#fff' : 'var(--color-text)',
                  fontWeight: 800,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                <span
                  style={{
                    background: activeTab === tab ? 'rgba(255,255,255,0.25)' : '#f3f4f6',
                    color: activeTab === tab ? '#fff' : 'var(--color-text-light)',
                    borderRadius: '99px',
                    padding: '2px 8px',
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

        {/* Editor Board */}
        <div
          style={{
            background: '#fff',
            borderRadius: '16px',
            border: '1px solid var(--color-border)',
            overflow: 'hidden',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            marginBottom: '24px',
          }}
        >
          {activeItems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--color-text-light)' }}>
              <p style={{ margin: 0, fontSize: '0.88rem' }}>No {activeTab} checklist items.</p>
              <p style={{ margin: '4px 0 0', fontSize: '0.78rem' }}>Add one below to get started.</p>
            </div>
          ) : (
            activeItems.map((item) => (
              <ItemRow key={item.id} item={item} onEdit={editItem} onDelete={deleteItem} />
            ))
          )}

          {/* Add input */}
          <AddItemBar onAdd={addItem} frequency={activeTab} />
        </div>

      </div>

      {/* Floating Action Button for Save Changes */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '16px',
          background: 'var(--color-bg)',
          borderTop: '1px solid var(--color-border)',
          zIndex: 90,
        }}
      >
        <button
          className="btn btn-primary"
          style={{
            width: '100%',
            padding: '14px',
            fontSize: '1rem',
            fontWeight: 800,
            boxShadow: '0 4px 12px rgba(46,125,50,0.25)',
          }}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving changes...' : 'Save Changes'}
        </button>
      </div>

    </div>
  );
};

export default ChecklistEditor;
