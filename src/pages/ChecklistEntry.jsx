import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FREQUENCY_META, getDayOfWeek } from '../data/coolingTunnelChecklist';
import { fetchMachines } from '../services/googleSheets';
import { getDefaultChecklist } from '../data/defaultChecklists';
import { saveCheckSession, getAllCheckSessions, getUser } from '../services/storage';

// ─── Helper ────────────────────────────────────────────────────────────────
const todayISO = () => new Date().toISOString().slice(0, 10);

// ─── Component ─────────────────────────────────────────────────────────────
const ChecklistEntry = () => {
  const { id, period } = useParams();
  const navigate = useNavigate();
  const user = getUser();

  const todayDate = todayISO();
  const todayDay = getDayOfWeek(new Date());

  const [machine, setMachine] = useState(null);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [itemStates, setItemStates] = useState({});

  const meta = FREQUENCY_META[period] || FREQUENCY_META.daily;

  const [dayRemark, setDayRemark] = useState('');
  const [saving, setSaving] = useState(false);
  const [alreadySaved, setAlreadySaved] = useState(false);

  // Check if today's session already exists
  useEffect(() => {
    const loadData = async () => {
      const machines = await fetchMachines();
      const found = machines.find((m) => String(m.machineId) === String(id));
      if (found) {
        setMachine(found);
        
        // Resolve checklist items
        let checklist = found.checklistItems;
        if (!checklist || checklist.length === 0) {
          checklist = getDefaultChecklist(found.machineType);
        }
        
        const filtered = checklist.filter((item) => item.frequency === period);
        setItems(filtered);

        const existing = getAllCheckSessions().find(
          (s) => String(s.machineId) === String(id) && s.date === todayDate && s.frequency === period
        );

        const restoredStates = {};
        filtered.forEach((item) => {
          const saved = existing?.items.find((i) => i.id === item.id);
          restoredStates[item.id] = {
            checked: saved?.checked || false,
            remark: saved?.remark || '',
            showRemark: !!(saved?.remark),
          };
        });

        setItemStates(restoredStates);
        if (existing) {
          setDayRemark(existing.dayRemark || '');
          setAlreadySaved(true);
        }
      }
      setLoading(false);
    };
    loadData();
  }, [id, period]);

  const checkedCount = Object.values(itemStates).filter((s) => s.checked).length;
  const progress = items.length > 0 ? Math.round((checkedCount / items.length) * 100) : 0;

  const toggleCheck = (itemId) => {
    setItemStates((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], checked: !prev[itemId].checked },
    }));
  };

  const toggleRemark = (itemId) => {
    setItemStates((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], showRemark: !prev[itemId].showRemark },
    }));
  };

  const setRemark = (itemId, val) => {
    setItemStates((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], remark: val },
    }));
  };

  const handleSubmit = () => {
    setSaving(true);
    const session = {
      id: `${id}_${period}_${todayDate}`,
      machineId: id,
      date: todayDate,
      dayOfWeek: todayDay,
      frequency: period,
      inspector: user?.name || 'Unknown',
      items: items.map((item) => ({
        id: item.id,
        checked: itemStates[item.id]?.checked || false,
        remark: itemStates[item.id]?.remark || '',
      })),
      dayRemark,
      submittedAt: new Date().toISOString(),
    };
    saveCheckSession(session);
    setTimeout(() => {
      setSaving(false);
      navigate(`/machine/${id}`);
    }, 600);
  };

  // Group items by part for visual grouping
  const groups = items.reduce((acc, item) => {
    const partName = item.part || 'General';
    if (!acc[partName]) acc[partName] = [];
    acc[partName].push(item);
    return acc;
  }, {});

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--color-text-light)' }}>Loading checklist...</p>
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

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg)', paddingBottom: '6rem' }}>
      {/* ── Navbar ── */}
      <nav className="navbar">
        <button
          className="btn btn-sm btn-outline"
          onClick={() => navigate(-1)}
          style={{ border: 'none', padding: 0, fontSize: '1.5rem', width: '30px', color: 'var(--color-text)' }}
        >
          &larr;
        </button>
        <h1 style={{ fontSize: '1.125rem' }}>
          <span style={{ color: meta.color }}>{meta.symbol}</span>{' '}
          {meta.label} Check
        </h1>
        <div style={{ width: '30px' }} />
      </nav>

      <div className="container">
        {/* ── Header card ── */}
        <div
          className="card mb-4"
          style={{
            background: `linear-gradient(135deg, ${meta.color}22 0%, ${meta.bg} 100%)`,
            border: `1px solid ${meta.color}44`,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1rem' }}>{machine.machineName}</h2>
              <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--color-text-light)' }}>
                {todayDate} &nbsp;·&nbsp; {todayDay} &nbsp;·&nbsp; {user?.name || 'Inspector'}
              </p>
            </div>
            {alreadySaved && (
              <span
                style={{
                  fontSize: '0.7rem',
                  background: '#10b981',
                  color: '#fff',
                  borderRadius: '99px',
                  padding: '2px 8px',
                  fontWeight: 600,
                }}
              >
                Saved
              </span>
            )}
          </div>

          {/* Progress bar */}
          <div style={{ marginTop: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '4px', color: 'var(--color-text-light)' }}>
              <span>{checkedCount} / {items.length} items OK</span>
              <span style={{ fontWeight: 700, color: meta.color }}>{progress}%</span>
            </div>
            <div style={{ height: '8px', borderRadius: '99px', background: '#e5e7eb', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${progress}%`,
                  height: '100%',
                  background: meta.color,
                  borderRadius: '99px',
                  transition: 'width 0.4s ease',
                }}
              />
            </div>
          </div>
        </div>

        {/* ── Checklist groups ── */}
        {Object.entries(groups).map(([part, partItems]) => (
          <div key={part} className="mb-4">
            <h3
              style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                letterSpacing: '0.08em',
                color: 'var(--color-text-light)',
                textTransform: 'uppercase',
                margin: '0 0 8px',
                paddingLeft: '4px',
              }}
            >
              {part}
            </h3>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {partItems.map((item, idx) => {
                const state = itemStates[item.id] || { checked: false, remark: '', showRemark: false };
                return (
                  <div
                    key={item.id}
                    style={{
                      borderBottom: idx < partItems.length - 1 ? '1px solid var(--color-border)' : 'none',
                    }}
                  >
                    {/* Main row */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '14px 16px',
                        gap: '12px',
                        background: state.checked ? `${meta.color}10` : 'transparent',
                        transition: 'background 0.2s',
                      }}
                    >
                      {/* Tick button */}
                      <button
                        onClick={() => toggleCheck(item.id)}
                        style={{
                          width: '44px',
                          height: '44px',
                          borderRadius: '50%',
                          border: `2px solid ${state.checked ? meta.color : '#d1d5db'}`,
                          background: state.checked ? meta.color : 'transparent',
                          color: state.checked ? '#fff' : 'transparent',
                          fontSize: '1.3rem',
                          cursor: 'pointer',
                          flexShrink: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.2s ease',
                          boxShadow: state.checked ? `0 0 0 4px ${meta.color}33` : 'none',
                        }}
                        aria-label={state.checked ? 'Uncheck item' : 'Check item as OK'}
                      >
                        ✓
                      </button>

                      {/* Text */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p
                          style={{
                            margin: 0,
                            fontSize: '0.875rem',
                            fontWeight: 500,
                            color: state.checked ? 'var(--color-text-light)' : 'var(--color-text)',
                            textDecoration: state.checked ? 'none' : 'none',
                            lineHeight: 1.4,
                          }}
                        >
                          {item.description}
                        </p>
                        {item.sn && (
                          <span style={{ fontSize: '0.7rem', color: 'var(--color-text-light)' }}>
                            #{item.sn}
                          </span>
                        )}
                      </div>

                      {/* Symbol badge */}
                      <div
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '6px',
                          background: meta.bg,
                          color: meta.color,
                          fontSize: '0.9rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          fontWeight: 700,
                          border: `1px solid ${meta.color}44`,
                        }}
                      >
                        {item.symbol}
                      </div>

                      {/* Note toggle */}
                      <button
                        onClick={() => toggleRemark(item.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '4px',
                          fontSize: '1rem',
                          color: state.remark ? meta.color : '#9ca3af',
                          flexShrink: 0,
                        }}
                        aria-label="Add remark"
                        title="Add remark"
                      >
                        📝
                      </button>
                    </div>

                    {/* Remark input */}
                    {state.showRemark && (
                      <div
                        style={{
                          padding: '0 16px 12px 72px',
                          animation: 'fadeIn 0.2s ease',
                        }}
                      >
                        <input
                          type="text"
                          placeholder="Add a remark for this item..."
                          value={state.remark}
                          onChange={(e) => setRemark(item.id, e.target.value)}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            borderRadius: '8px',
                            border: `1px solid ${meta.color}66`,
                            fontSize: '0.8rem',
                            background: meta.bg,
                            color: 'var(--color-text)',
                            boxSizing: 'border-box',
                          }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* ── Day Remark ── */}
        <div className="card mb-4">
          <label
            style={{
              display: 'block',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: 'var(--color-text-light)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: '8px',
            }}
          >
            {todayDay} — General Remark
          </label>
          <textarea
            rows={3}
            placeholder={`Any general observations for ${todayDay}...`}
            value={dayRemark}
            onChange={(e) => setDayRemark(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '10px',
              border: '1px solid var(--color-border)',
              fontSize: '0.875rem',
              resize: 'vertical',
              boxSizing: 'border-box',
              background: 'var(--color-bg-secondary)',
              color: 'var(--color-text)',
            }}
          />
        </div>

        {/* ── Legend ── */}
        <div
          className="card mb-4"
          style={{ padding: '12px 16px', background: 'var(--color-bg-secondary)' }}
        >
          <p style={{ margin: '0 0 6px', fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-text-light)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Legend</p>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            {Object.entries(FREQUENCY_META).map(([freq, m]) => (
              <span key={freq} style={{ fontSize: '0.75rem', color: m.color, fontWeight: 600 }}>
                {m.symbol} {m.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Fixed Submit Button ── */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '16px',
          background: 'var(--color-bg)',
          borderTop: '1px solid var(--color-border)',
          zIndex: 50,
        }}
      >
        <button
          className="btn btn-primary"
          style={{
            width: '100%',
            padding: '14px',
            fontSize: '1rem',
            fontWeight: 700,
            background: progress === 100 ? '#10b981' : meta.color,
            boxShadow: `0 4px 20px ${meta.color}44`,
          }}
          onClick={handleSubmit}
          disabled={saving}
        >
          {saving ? 'Saving...' : alreadySaved ? '✓ Update Session' : `Submit ${meta.label} Check`}
        </button>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

export default ChecklistEntry;
