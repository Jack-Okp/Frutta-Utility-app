import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchMachines, syncSharedDatabase } from '../services/googleSheets';
import { getCheckSessionsByMachine } from '../services/storage';
import { deleteMachineLocal } from '../services/storage';
import { FREQUENCY_META } from '../data/coolingTunnelChecklist';

// ─── Machine type → stock image ──────────────────────────────────────────────
const getMachineImage = (type = '') => {
  const t = type.toLowerCase();
  if (t.includes('boiler')) return '/img-boiler.jpg';
  if (t.includes('compressor')) return '/img-compressor.jpg';
  if (t.includes('generator')) return '/img-generator.jpg';
  if (t.includes('chiller')) return '/img-chiller.jpg';
  if (t.includes('cooling') || t.includes('tunnel')) return '/img-cooling-tunnel.jpg';
  return '/img-boiler.jpg'; // generic fallback
};

// ─── Health logic (same as Dashboard) ────────────────────────────────────────
const getMachineHealth = (sessions = []) => {
  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(now.getDate() - 7);

  const hasNegativeRemark = sessions.some((s) => {
    const d = new Date(s.date);
    if (d < sevenDaysAgo) return false;
    return s.items?.some((item) => item.remark && item.remark.trim().length > 0);
  });

  const hasRecentWeekly = sessions.some((s) => {
    if (s.frequency !== 'weekly') return false;
    return (now - new Date(s.date)) / 86400000 <= 7;
  });

  return hasNegativeRemark || !hasRecentWeekly ? 'unhealthy' : 'healthy';
};

// ─── Stat card ────────────────────────────────────────────────────────────────
const StatCard = ({ icon, label, value, accent }) => (
  <div
    style={{
      flex: 1,
      background: '#fff',
      borderRadius: '14px',
      border: '1px solid var(--color-border)',
      padding: '14px 12px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '4px',
      boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
    }}
  >
    <div style={{ color: accent || '#6b7280', marginBottom: '2px' }}>{icon}</div>
    <span style={{ fontSize: '0.95rem', fontWeight: 800, color: accent || 'var(--color-text)' }}>
      {value}
    </span>
    <span style={{ fontSize: '0.65rem', color: 'var(--color-text-light)', fontWeight: 500, textAlign: 'center' }}>
      {label}
    </span>
  </div>
);

// ─── Checklist action card ────────────────────────────────────────────────────
const CheckCard = ({ freq, lastDate, onClick, todayDone }) => {
  const meta = FREQUENCY_META[freq];
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        padding: '16px',
        borderRadius: '16px',
        border: `1.5px solid ${todayDone ? '#86efac' : meta.color + '44'}`,
        background: todayDone ? '#f0fdf4' : '#fff',
        cursor: 'pointer',
        transition: 'all 0.15s',
        marginBottom: '12px',
        textAlign: 'left',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      }}
    >
      {/* Icon bubble */}
      <div
        style={{
          width: '50px',
          height: '50px',
          borderRadius: '14px',
          background: todayDone ? '#16a34a' : meta.color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.4rem',
          color: '#fff',
          fontWeight: 800,
          flexShrink: 0,
          boxShadow: `0 4px 12px ${meta.color}55`,
        }}
      >
        {todayDone ? '✓' : meta.symbol}
      </div>

      {/* Text */}
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: todayDone ? '#15803d' : 'var(--color-text)', marginBottom: '2px' }}>
          {meta.label} Checklist
        </div>
        <div style={{ fontSize: '0.72rem', color: 'var(--color-text-light)' }}>
          {todayDone
            ? 'Completed today ✓'
            : lastDate
              ? `Last done: ${lastDate}`
              : 'Not yet completed'}
        </div>
      </div>

      {/* Arrow */}
      <span style={{ fontSize: '1.1rem', color: '#9ca3af' }}>›</span>
    </button>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const MachineDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [machine, setMachine] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState([]);
  const [imgLoaded, setImgLoaded] = useState(false);

  // ── Decommission modal state ──────────────────────────────────────────────
  const [showDecommission, setShowDecommission] = useState(false);
  const [decommForm, setDecommForm] = useState({ name: '', model: '', date: '' });
  const [decommitting, setDecommitting] = useState(false);

  const todayISO = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    const load = async () => {
      await syncSharedDatabase();
      const machines = await fetchMachines();
      const found = machines.find((m) => String(m.machineId) === String(id));
      setMachine(found || null);
      setSessions(getCheckSessionsByMachine(id));
      setLoading(false);
    };
    load();
  }, [id]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--color-text-light)' }}>Loading...</p>
        </div>
      </div>
    );
  }

  if (!machine) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--color-text-light)' }}>Machine not found.</p>
          <button className="btn btn-primary" style={{ marginTop: '12px' }} onClick={() => navigate('/dashboard')}>
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const health = getMachineHealth(sessions);
  const isHealthy = health === 'healthy';
  const machineImage = getMachineImage(machine.machineType);

  // ── Decommission handler ──────────────────────────────────────────────────
  const modelRequired = !!machine.model && machine.model !== '—' && machine.model !== '';

  const canDecommission =
    decommForm.name.trim().toLowerCase() === machine.machineName?.trim().toLowerCase() &&
    (!modelRequired || decommForm.model.trim().toLowerCase() === machine.model.trim().toLowerCase()) &&
    decommForm.date.trim() !== '';

  const handleDecommission = () => {
    if (!canDecommission) return;
    setDecommitting(true);
    deleteMachineLocal(machine.machineId);
    setTimeout(() => {
      navigate('/dashboard');
    }, 400);
  };

  // Last session dates per frequency
  const lastDailySession = sessions
    .filter((s) => s.frequency === 'daily')
    .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
  const lastWeeklySession = sessions
    .filter((s) => s.frequency === 'weekly')
    .sort((a, b) => new Date(b.date) - new Date(a.date))[0];

  const dailyDoneToday = lastDailySession?.date === todayISO;
  const weeklyDoneToday = lastWeeklySession?.date === todayISO;

  const formatDate = (iso) =>
    iso ? new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : null;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', paddingBottom: '2rem' }}>

      {/* ── Hero image section ──────────────────────────────────────────── */}
      <div style={{ position: 'relative', width: '100%', height: '230px', overflow: 'hidden', background: '#d1fae5' }}>
        <img
          src={machineImage}
          alt={machine.machineName}
          onLoad={() => setImgLoaded(true)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: imgLoaded ? 1 : 0,
            transition: 'opacity 0.4s ease',
          }}
        />
        {/* Dark gradient overlay for readability */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.55) 100%)',
          }}
        />

        {/* Back button */}
        <button
          onClick={() => navigate('/dashboard')}
          style={{
            position: 'absolute',
            top: '16px',
            left: '16px',
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.2)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.35)',
            color: '#fff',
            fontSize: '1.2rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          aria-label="Back"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        {/* Machine name + tag overlaid on image */}
        <div
          style={{
            position: 'absolute',
            bottom: '20px',
            left: '16px',
            right: '16px',
          }}
        >
          {/* Health badge */}
          <span
            style={{
              display: 'inline-block',
              fontSize: '0.6rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: isHealthy ? '#16a34a' : '#dc2626',
              background: isHealthy ? '#dcfce7' : '#fee2e2',
              borderRadius: '99px',
              padding: '3px 10px',
              marginBottom: '6px',
            }}
          >
            {isHealthy ? '● Healthy' : '● Unhealthy'}
          </span>

          <h1 style={{ color: '#fff', margin: '0 0 2px', fontSize: '1.5rem', fontWeight: 800, textShadow: '0 1px 4px rgba(0,0,0,0.4)' }}>
            {machine.machineName}
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.85)', margin: 0, fontSize: '0.82rem', fontWeight: 500 }}>
            {machine.tagNumber} &nbsp;·&nbsp; {machine.machineType}
          </p>
        </div>
      </div>

      {/* ── Body content ────────────────────────────────────────────────── */}
      <div style={{ padding: '20px 16px 0' }}>

        {/* ── Quick stats row ── */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
          <StatCard
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
              </svg>
            }
            label="Running Hours"
            value={machine.currentRunningHours != null ? `${machine.currentRunningHours} hrs` : '—'}
            accent="var(--color-primary)"
          />
          <StatCard
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            }
            label="Last Check"
            value={machine.lastMaintenanceDate ? formatDate(machine.lastMaintenanceDate) : '—'}
          />
          <StatCard
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14" />
              </svg>
            }
            label="Next Maint."
            value={machine.nextMaintenanceDate ? formatDate(machine.nextMaintenanceDate) : '—'}
          />
        </div>

        {/* ── Section: Checklists ── */}
        <div style={{ marginBottom: '8px' }}>
          <p
            style={{
              margin: '0 0 12px',
              fontSize: '0.7rem',
              fontWeight: 800,
              color: 'var(--color-text-light)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}
          >
            Inspection Checklists
          </p>

          <CheckCard
            freq="daily"
            lastDate={formatDate(lastDailySession?.date)}
            onClick={() => navigate(`/machine/${id}/check/daily`)}
            todayDone={dailyDoneToday}
          />

          <CheckCard
            freq="weekly"
            lastDate={formatDate(lastWeeklySession?.date)}
            onClick={() => navigate(`/machine/${id}/check/weekly`)}
            todayDone={weeklyDoneToday}
          />

          <button
            onClick={() => navigate(`/machine/${id}/edit-checklist`)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 16px',
              borderRadius: '14px',
              border: '1px solid var(--color-border)',
              background: '#fff',
              cursor: 'pointer',
              marginTop: '12px',
              textAlign: 'left',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'var(--color-primary-light)',
                  color: 'var(--color-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-text)' }}>
                  Configure Checklist Items
                </span>
                <span style={{ fontSize: '0.72rem', color: 'var(--color-text-light)' }}>
                  Add, update or remove inspection tasks
                </span>
              </div>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-light)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>

        {/* ── Section: Records ── */}
        <p
          style={{
            margin: '20px 0 12px',
            fontSize: '0.7rem',
            fontWeight: 800,
            color: 'var(--color-text-light)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}
        >
          Records & Export
        </p>

        {/* View History */}
        <button
          onClick={() => navigate(`/machine/${id}/history`)}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            padding: '14px 16px',
            borderRadius: '14px',
            border: '1px solid var(--color-border)',
            background: '#fff',
            cursor: 'pointer',
            marginBottom: '10px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
          }}
        >
          <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
            </svg>
          </div>
          <div style={{ flex: 1, textAlign: 'left' }}>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-text)' }}>View History</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--color-text-light)' }}>All past checklist sessions</div>
          </div>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>

        {/* Export Excel */}
        <button
          onClick={() => navigate('/export')}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            padding: '14px 16px',
            borderRadius: '14px',
            border: '1px solid var(--color-border)',
            background: '#fff',
            cursor: 'pointer',
            marginBottom: '10px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
          }}
        >
          <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </div>
          <div style={{ flex: 1, textAlign: 'left' }}>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-text)' }}>Export Checklist</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--color-text-light)' }}>Download weekly report as Excel</div>
          </div>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>

        {/* ── Machine info detail card ── */}
        <p
          style={{
            margin: '20px 0 12px',
            fontSize: '0.7rem',
            fontWeight: 800,
            color: 'var(--color-text-light)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}
        >
          Machine Info
        </p>

        <div
          style={{
            background: '#fff',
            borderRadius: '16px',
            border: '1px solid var(--color-border)',
            overflow: 'hidden',
            boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
            marginBottom: '12px',
          }}
        >
          {[
            { label: 'Machine Name', value: machine.machineName },
            { label: 'Tag Number', value: machine.tagNumber },
            { label: 'Type', value: machine.machineType },
            { label: 'Location', value: machine.location || '—' },
            { label: 'Model', value: machine.model || '—' },
            { label: 'Serial No.', value: machine.serialNumber || '—' },
          ].map((row, i, arr) => (
            <div
              key={row.label}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 16px',
                borderBottom: i < arr.length - 1 ? '1px solid var(--color-border)' : 'none',
              }}
            >
              <span style={{ fontSize: '0.8rem', color: 'var(--color-text-light)', fontWeight: 500 }}>{row.label}</span>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-text)', maxWidth: '55%', textAlign: 'right' }}>
                {row.value}
              </span>
            </div>
          ))}
        </div>

        {/* ── Danger Zone ── */}
        <div style={{ marginTop: '28px', marginBottom: '24px' }}>
          <p style={{ margin: '0 0 10px', fontSize: '0.7rem', fontWeight: 800, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Danger Zone
          </p>
          <button
            id="decommission-open-btn"
            onClick={() => { setDecommForm({ name: '', model: '', date: '' }); setShowDecommission(true); }}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: '14px',
              padding: '14px 16px', borderRadius: '14px', border: '1.5px solid #fecaca',
              background: '#fff5f5', cursor: 'pointer', textAlign: 'left',
              boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
            }}
          >
            <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                <path d="M10 11v6" /><path d="M14 11v6" />
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#dc2626' }}>Decommission Machine</div>
              <div style={{ fontSize: '0.72rem', color: '#f87171' }}>Permanently remove this machine and its records</div>
            </div>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>

      </div>

      {/* ── Decommission Confirmation Modal ───────────────────────────── */}
      {showDecommission && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setShowDecommission(false); }}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 9999,
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            animation: 'fadeInOverlay 0.2s ease',
          }}
        >
          <div
            style={{
              width: '100%', maxWidth: '520px', background: '#fff',
              borderRadius: '24px 24px 0 0', padding: '24px 20px 40px',
              animation: 'slideUpModal 0.3s cubic-bezier(0.22,1,0.36,1)',
            }}
          >
            <div style={{ width: '40px', height: '4px', borderRadius: '99px', background: '#e5e7eb', margin: '0 auto 22px' }} />

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '22px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#dc2626' }}>Decommission Machine</h2>
                <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: '#6b7280', lineHeight: 1.5 }}>
                  This action is <strong>irreversible</strong>. Confirm the details below to proceed.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>Machine Name</label>
                <input
                  id="decomm-name"
                  type="text"
                  placeholder={`Type "${machine.machineName}" exactly`}
                  value={decommForm.name}
                  onChange={(e) => setDecommForm((f) => ({ ...f, name: e.target.value }))}
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: '10px', boxSizing: 'border-box',
                    border: `1.5px solid ${decommForm.name && decommForm.name.trim().toLowerCase() === machine.machineName?.trim().toLowerCase() ? '#86efac' : '#e5e7eb'}`,
                    fontSize: '0.88rem', outline: 'none', background: '#f9fafb', transition: 'border-color 0.15s',
                  }}
                />
              </div>

              {modelRequired && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>Model Number</label>
                  <input
                    id="decomm-model"
                    type="text"
                    placeholder={`Type "${machine.model}" exactly`}
                    value={decommForm.model}
                    onChange={(e) => setDecommForm((f) => ({ ...f, model: e.target.value }))}
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: '10px', boxSizing: 'border-box',
                      border: `1.5px solid ${decommForm.model && decommForm.model.trim().toLowerCase() === machine.model.toLowerCase() ? '#86efac' : '#e5e7eb'}`,
                      fontSize: '0.88rem', outline: 'none', background: '#f9fafb', transition: 'border-color 0.15s',
                    }}
                  />
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>Date of Decommissioning</label>
                <input
                  id="decomm-date"
                  type="date"
                  value={decommForm.date}
                  onChange={(e) => setDecommForm((f) => ({ ...f, date: e.target.value }))}
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: '10px', boxSizing: 'border-box',
                    border: `1.5px solid ${decommForm.date ? '#86efac' : '#e5e7eb'}`,
                    fontSize: '0.88rem', outline: 'none', background: '#f9fafb', transition: 'border-color 0.15s',
                  }}
                />
              </div>

              {!canDecommission && (
                <p style={{ margin: 0, fontSize: '0.72rem', color: '#9ca3af', textAlign: 'center' }}>
                  All fields must match the machine's registered details to proceed.
                </p>
              )}

              <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                <button
                  onClick={() => setShowDecommission(false)}
                  style={{
                    flex: 1, padding: '12px', borderRadius: '12px',
                    border: '1px solid var(--color-border)', background: '#fff',
                    fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-text)', cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  id="confirm-decommission-btn"
                  onClick={handleDecommission}
                  disabled={!canDecommission || decommitting}
                  style={{
                    flex: 1, padding: '12px', borderRadius: '12px', border: 'none',
                    background: canDecommission ? '#dc2626' : '#f3f4f6',
                    color: canDecommission ? '#fff' : '#9ca3af',
                    fontSize: '0.9rem', fontWeight: 800,
                    cursor: canDecommission ? 'pointer' : 'not-allowed',
                    transition: 'all 0.2s',
                    boxShadow: canDecommission ? '0 4px 12px rgba(220,38,38,0.3)' : 'none',
                  }}
                >
                  {decommitting ? 'Removing...' : 'Decommission'}
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeInOverlay {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes slideUpModal {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default MachineDetail;
