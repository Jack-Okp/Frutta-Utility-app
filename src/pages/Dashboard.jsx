import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchMachines } from '../services/googleSheets';
import { getUser, getAllCheckSessions } from '../services/storage';

// ─── Health logic ────────────────────────────────────────────────────────────
/**
 * Determines if a machine is "Unhealthy":
 *  1. Any checklist session in the last 7 days had a negative remark on an item
 *  2. The last weekly check session is more than 7 days ago (or never done)
 */
const getMachineHealth = (machine, sessions) => {
  const machineId = String(machine.machineId);
  const now = new Date();

  // Filter sessions for this machine (CT sessions are keyed by date, not machineId,
  // so for now we use all sessions and check remarks)
  const machineSessions = sessions; // all sessions from localStorage

  // Check 1: any negative remark in the last 7 days
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(now.getDate() - 7);

  const hasNegativeRemark = machineSessions.some((s) => {
    const sessionDate = new Date(s.date);
    if (sessionDate < sevenDaysAgo) return false;
    return s.items?.some((item) => item.remark && item.remark.trim().length > 0);
  });

  // Check 2: weekly check overdue (no weekly session in last 7 days)
  const hasRecentWeekly = machineSessions.some((s) => {
    if (s.frequency !== 'weekly') return false;
    const sessionDate = new Date(s.date);
    return (now - sessionDate) / (1000 * 60 * 60 * 24) <= 7;
  });

  // Determine status
  if (hasNegativeRemark || !hasRecentWeekly) {
    return 'unhealthy';
  }
  return 'healthy';
};

// ─── Notification logic ───────────────────────────────────────────────────────
const buildNotifications = (machines, sessions) => {
  const notes = [];
  const now = new Date();
  const todayISO = now.toISOString().slice(0, 10);

  // Check each machine for overdue weekly check (7+ days)
  machines.forEach((machine) => {
    const lastWeekly = sessions
      .filter((s) => s.frequency === 'weekly')
      .sort((a, b) => new Date(b.date) - new Date(a.date))[0];

    const daysSinceWeekly = lastWeekly
      ? (now - new Date(lastWeekly.date)) / (1000 * 60 * 60 * 24)
      : Infinity;

    if (daysSinceWeekly > 7) {
      notes.push({
        id: `weekly_overdue_${machine.machineId}`,
        text: `Weekly check for ${machine.machineName} is overdue`,
        type: 'warning',
      });
    }
  });

  return notes.slice(0, 3); // max 3 shown
};

// ─── Machine type abbreviation ───────────────────────────────────────────────
const typeAbbr = (type = '') => {
  const t = type.toLowerCase();
  if (t.includes('boiler'))                          return 'BLR';
  if (t.includes('generator'))                       return 'GEN';
  if (t.includes('compressor'))                      return 'CMP';
  if (t.includes('chiller'))                         return 'CHL';
  if (t.includes('cooling') || t.includes('tunnel')) return 'CT';
  if (t.includes('pump'))                            return 'PMP';
  return 'MCH';
};

// ─── Component ────────────────────────────────────────────────────────────────
const Dashboard = () => {
  const navigate = useNavigate();
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [user, setUser] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    const u = getUser();
    if (!u) { navigate('/'); return; }
    setUser(u);

    const load = async () => {
      const data = await fetchMachines();
      setMachines(data || []);
      setSessions(getAllCheckSessions());
      setLoading(false);
    };
    load();
  }, [navigate]);

  // Dynamic filter tabs — only show types that actually exist in machines list
  const machineTypes = ['All', ...Array.from(new Set(machines.map((m) => m.machineType).filter(Boolean)))];

  const notifications = buildNotifications(machines, sessions);
  const notifCount = notifications.length;

  // Filtered & searched machines
  const filteredMachines = machines.filter((m) => {
    if (filter !== 'All' && m.machineType !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        m.machineName?.toLowerCase().includes(q) ||
        m.tagNumber?.toLowerCase().includes(q) ||
        m.machineType?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // First name from full name
  const firstName = user?.name?.split(' ')[0] || 'User';

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg)', paddingBottom: '2rem' }}>

      {/* ── Top bar ────────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 16px',
          backgroundColor: 'var(--color-bg)',
          borderBottom: '1px solid var(--color-border)',
          position: 'sticky',
          top: 0,
          zIndex: 20,
        }}
      >
        {/* Frutta logo */}
        <img
          src="/frutta-logo.png"
          alt="Frutta"
          style={{ height: '38px', objectFit: 'contain' }}
        />

        {/* Right: Add + Bell */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => navigate('/add-machine')}
            style={{
              background: 'var(--color-primary)',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              padding: '6px 14px',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            + Add
          </button>

          {/* Bell icon with badge */}
          <button
            id="notif-bell-btn"
            onClick={() => setShowNotifications((v) => !v)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              position: 'relative',
              padding: '4px 6px',
              lineHeight: 1,
            }}
            aria-label="Notifications"
          >
            {/* SVG bell */}
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={notifCount > 0 ? '#1b5e20' : '#9ca3af'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            {notifCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '0px',
                  right: '0px',
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  background: '#ef4444',
                  color: '#fff',
                  fontSize: '0.6rem',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px solid var(--color-bg)',
                }}
              >
                {notifCount}
              </span>
            )}
          </button>
        </div>
      </div>

      <div style={{ padding: '0 16px' }}>

        {/* ── Greeting ───────────────────────────────────────────────────── */}
        <div style={{ paddingTop: '20px', paddingBottom: '4px' }}>
          <h1
            style={{
              fontSize: '1.6rem',
              fontWeight: 800,
              color: 'var(--color-primary)',
              margin: 0,
              letterSpacing: '-0.02em',
            }}
          >
            Hi, {firstName}
          </h1>
          <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--color-text-light)' }}>
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

        {/* ── Search bar ─────────────────────────────────────────────────── */}
        <div style={{ position: 'relative', margin: '20px 0 12px' }}>
          <span
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              pointerEvents: 'none',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </span>
          <input
            id="machine-search-input"
            type="text"
            placeholder="Search Machine"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px 10px 38px',
              borderRadius: '12px',
              border: '1px solid var(--color-border)',
              fontSize: '0.9rem',
              background: '#f9fafb',
              boxSizing: 'border-box',
              outline: 'none',
            }}
          />
        </div>

        {/* ── Filter tabs ────────────────────────────────────────────────── */}
        {machineTypes.length > 1 && (
          <div
            style={{
              display: 'flex',
              gap: '8px',
              overflowX: 'auto',
              paddingBottom: '4px',
              marginBottom: '16px',
              scrollbarWidth: 'none',
            }}
          >
            {machineTypes.map((type) => (
              <button
                key={type}
                onClick={() => setFilter(type)}
                style={{
                  whiteSpace: 'nowrap',
                  padding: '6px 16px',
                  borderRadius: '99px',
                  border: filter === type ? 'none' : '1px solid var(--color-border)',
                  background: filter === type ? 'var(--color-primary)' : 'transparent',
                  color: filter === type ? '#fff' : 'var(--color-text)',
                  fontSize: '0.82rem',
                  fontWeight: filter === type ? 700 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {type}
              </button>
            ))}
          </div>
        )}

        {/* ── Notification preview panel ─────────────────────────────────── */}
        {showNotifications && notifCount > 0 && (
          <div
            style={{
              background: '#fff8f0',
              border: '1px solid #fed7aa',
              borderRadius: '12px',
              padding: '12px 14px',
              marginBottom: '16px',
              animation: 'slideDown 0.2s ease',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {notifCount} Notification{notifCount !== 1 ? 's' : ''}
              </span>
              <button
                onClick={() => setShowNotifications(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: '0.75rem', fontWeight: 700 }}
              >
                &times;
              </button>
            </div>
            {notifications.map((n) => (
              <div
                key={n.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px',
                  padding: '6px 0',
                  borderBottom: '1px solid #fed7aa22',
                  fontSize: '0.82rem',
                  color: '#92400e',
                }}
              >
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#f59e0b', flexShrink: 0, marginTop: '5px', display: 'inline-block' }} />
                <span>{n.text}</span>
              </div>
            ))}
          </div>
        )}

        {/* ── Machine count ──────────────────────────────────────────────── */}
        {!loading && machines.length > 0 && (
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-light)', marginBottom: '10px', fontWeight: 500 }}>
            {filteredMachines.length} machine{filteredMachines.length !== 1 ? 's' : ''}
            {filter !== 'All' ? ` · ${filter}` : ''}
            {search ? ` · "${search}"` : ''}
          </p>
        )}

        {/* ── Content area ───────────────────────────────────────────────── */}
        {loading ? (
          <div style={{ textAlign: 'center', paddingTop: '60px' }}>
            <p style={{ color: 'var(--color-text-light)', margin: 0 }}>Loading machines...</p>
          </div>

        ) : machines.length === 0 ? (
          /* Empty state — no machines added yet */
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              paddingTop: '60px',
              textAlign: 'center',
              gap: '12px',
            }}
          >
            <div
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: '#f0fdf4',
                border: '2px dashed #86efac',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07M8.46 8.46a5 5 0 0 0 0 7.07"/>
              </svg>
            </div>
            <h2 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--color-text)' }}>No machines added yet</h2>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-light)', maxWidth: '240px' }}>
              Add your first machine to start tracking maintenance checklists.
            </p>
            <button
              id="add-first-machine-btn"
              onClick={() => navigate('/add-machine')}
              style={{
                marginTop: '8px',
                padding: '12px 28px',
                borderRadius: '99px',
                border: 'none',
                background: 'var(--color-primary)',
                color: '#fff',
                fontSize: '0.95rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(46,125,50,0.3)',
              }}
            >
              + Add Machine
            </button>
          </div>

        ) : filteredMachines.length === 0 ? (
          /* Search returned nothing */
          <div style={{ textAlign: 'center', paddingTop: '40px' }}>
            <p style={{ color: 'var(--color-text-light)', margin: 0 }}>No machines match "{search}"</p>
          </div>

        ) : (
          /* ── Machine grid ──────────────────────────────────────────────── */
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '10px',
            }}
          >
            {filteredMachines.map((machine) => {
              const health = getMachineHealth(machine, sessions);
              const isHealthy = health === 'healthy';
              return (
                <div
                  key={machine.machineId || machine.tagNumber}
                  id={`machine-card-${machine.machineId}`}
                  onClick={() => navigate(`/machine/${machine.machineId}`)}
                  style={{
                    background: '#fff',
                    borderRadius: '12px',
                    border: `1px solid ${isHealthy ? 'var(--color-border)' : '#fecaca'}`,
                    padding: '10px 8px',
                    cursor: 'pointer',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                    transition: 'transform 0.15s, box-shadow 0.15s',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.12)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)';
                  }}
                >
                  {/* Machine type abbreviation top-right */}
                  <span
                    style={{
                      position: 'absolute',
                      top: '7px',
                      right: '6px',
                      fontSize: '0.55rem',
                      fontWeight: 700,
                      color: '#9ca3af',
                      letterSpacing: '0.04em',
                    }}
                  >
                    {typeAbbr(machine.machineType)}
                  </span>

                  {/* Health badge */}
                  <span
                    style={{
                      display: 'inline-block',
                      fontSize: '0.55rem',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      color: isHealthy ? '#16a34a' : '#dc2626',
                      background: isHealthy ? '#dcfce7' : '#fee2e2',
                      borderRadius: '99px',
                      padding: '2px 6px',
                      marginBottom: '5px',
                    }}
                  >
                    {isHealthy ? 'Healthy' : 'Unhealthy'}
                  </span>

                  {/* Machine name */}
                  <div
                    style={{
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      color: 'var(--color-text)',
                      lineHeight: 1.3,
                      marginBottom: '2px',
                      paddingRight: '20px',
                    }}
                  >
                    {machine.machineName}
                  </div>

                  {/* Tag number */}
                  <div
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      color: 'var(--color-primary)',
                      marginBottom: '6px',
                    }}
                  >
                    {machine.tagNumber}
                  </div>

                  {/* Divider */}
                  <div style={{ height: '1px', background: 'var(--color-border)', marginBottom: '6px' }} />

                  {/* Last check */}
                  <div style={{ fontSize: '0.62rem', color: 'var(--color-text-light)', marginBottom: '2px' }}>
                    last check: {machine.lastMaintenanceDate || '—'}
                  </div>

                  {/* Running hours */}
                  <div style={{ fontSize: '0.62rem', color: 'var(--color-text-light)' }}>
                    Running Hours: {machine.currentRunningHours ?? '—'} hrs
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default Dashboard;
