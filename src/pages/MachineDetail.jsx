import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchMachines } from '../services/googleSheets';
import { getAllCheckSessions } from '../services/storage';
import { FREQUENCY_META } from '../data/coolingTunnelChecklist';

// ─── Machine type → stock image ──────────────────────────────────────────────
const getMachineImage = (type = '') => {
  const t = type.toLowerCase();
  if (t.includes('boiler'))                        return '/img-boiler.jpg';
  if (t.includes('compressor'))                    return '/img-compressor.jpg';
  if (t.includes('generator'))                     return '/img-generator.jpg';
  if (t.includes('chiller'))                       return '/img-chiller.jpg';
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
    <span style={{ fontSize: '1.4rem' }}>{icon}</span>
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

  const todayISO = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    const load = async () => {
      const machines = await fetchMachines();
      const found = machines.find((m) => String(m.machineId) === String(id));
      setMachine(found || null);
      setSessions(getAllCheckSessions());
      setLoading(false);
    };
    load();
  }, [id]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '8px' }}>⏳</div>
          <p style={{ color: 'var(--color-text-light)' }}>Loading...</p>
        </div>
      </div>
    );
  }

  if (!machine) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '8px' }}>⚠️</div>
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
          ‹
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
            icon="⏱️"
            label="Running Hours"
            value={machine.currentRunningHours != null ? `${machine.currentRunningHours} hrs` : '—'}
            accent="var(--color-primary)"
          />
          <StatCard
            icon="📅"
            label="Last Check"
            value={machine.lastMaintenanceDate ? formatDate(machine.lastMaintenanceDate) : '—'}
          />
          <StatCard
            icon="🔧"
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
          <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
            📋
          </div>
          <div style={{ flex: 1, textAlign: 'left' }}>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-text)' }}>View History</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--color-text-light)' }}>All past checklist sessions</div>
          </div>
          <span style={{ color: '#9ca3af', fontSize: '1.1rem' }}>›</span>
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
          <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
            📥
          </div>
          <div style={{ flex: 1, textAlign: 'left' }}>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-text)' }}>Export Checklist</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--color-text-light)' }}>Download weekly report as Excel</div>
          </div>
          <span style={{ color: '#9ca3af', fontSize: '1.1rem' }}>›</span>
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

      </div>
    </div>
  );
};

export default MachineDetail;
