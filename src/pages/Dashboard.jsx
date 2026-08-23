import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchMachines, syncSharedDatabase, flushOfflineQueue, fetchWorkLogs } from '../services/googleSheets';
import { getUser, getAllCheckSessions } from '../services/storage';
import WorkLogModal from '../components/WorkLogModal';
import ShiftSummaryModal from '../components/ShiftSummaryModal';
import { buildAllNotifications, getAttendedNotifs, markNotifAttended } from './Notifications';


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
  const [syncing, setSyncing] = useState(false);
  const [workLogs, setWorkLogs] = useState([]);
  const [isWorkLogModalOpen, setIsWorkLogModalOpen] = useState(false);
  const [isShiftSummaryModalOpen, setIsShiftSummaryModalOpen] = useState(false);
  const [isFabOpen, setIsFabOpen] = useState(false);
  const [attendedNotifIds, setAttendedNotifIds] = useState([]);

  const loadAll = async (userObj) => {
    setSyncing(true);
    if (userObj?.isSync) {
      await flushOfflineQueue();
      await syncSharedDatabase();
    }
    const [data, logsData] = await Promise.all([
      fetchMachines(),
      fetchWorkLogs()
    ]);
    setMachines(data || []);
    setWorkLogs(logsData || []);
    setSessions(getAllCheckSessions());
    setLoading(false);
    setSyncing(false);
  };

  useEffect(() => {
    const u = getUser();
    if (!u) { navigate('/'); return; }
    setUser(u);
    loadAll(u);
  }, [navigate]);

  // Dynamic filter tabs — only show types that actually exist in machines list
  const machineTypes = ['All', ...Array.from(new Set(machines.map((m) => m.machineType).filter(Boolean)))];

  const allNotifs = buildAllNotifications(machines, sessions, workLogs);
  const attendedNotifs = getAttendedNotifs();
  const activeNotifications = allNotifs.filter((n) => !attendedNotifs.some((a) => a.id === n.id));
  const notifCount = activeNotifications.length;

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

        {/* Right: Bell Icon only (Navigates to /notifications) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            id="notif-bell-btn"
            onClick={() => navigate('/notifications')}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              position: 'relative',
              padding: '6px',
              lineHeight: 1,
            }}
            aria-label="Notifications"
          >
            {/* SVG bell */}
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={notifCount > 0 ? '#1b5e20' : '#9ca3af'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            {notifCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '2px',
                  right: '2px',
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
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            Hi, {firstName}
            {user?.isSync && (
              <span
                style={{
                  fontSize: '0.62rem',
                  fontWeight: 800,
                  color: '#10b981',
                  background: '#ecfdf5',
                  borderRadius: '99px',
                  padding: '2px 8px',
                  border: '1px solid #a7f3d0',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                {syncing ? 'Syncing...' : 'Synced'}
              </span>
            )}
          </h1>
          <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--color-text-light)' }}>
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

        {/* ── Active Shift Digital Work Logs (24h Notification Section) ── */}
        {(() => {
          const nowMs = Date.now();
          const activeShiftLogs = workLogs.filter((l) => {
            if (!l.createdAt) return false;
            const logMs = new Date(l.createdAt).getTime();
            return (nowMs - logMs) <= (24 * 60 * 60 * 1000); // 24 hours
          });

          return (
            <div
              className="card"
              style={{
                marginBottom: '16px',
                padding: '14px 16px',
                background: 'linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%)',
                border: '1px solid #bbf7d0',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Shift Work Logs ({activeShiftLogs.length} Active)
                  </span>
                </div>
                <button
                  onClick={() => navigate('/work-logs')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-primary)',
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    padding: 0,
                  }}
                >
                  View All &rarr;
                </button>
              </div>

              {activeShiftLogs.length === 0 ? (
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-text-light)', fontStyle: 'italic' }}>
                  No work logged during current shift. Click "+ Work Log" to record a job done.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {activeShiftLogs.slice(0, 3).map((log) => {
                    const timeStr = log.createdAt
                      ? new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : '';
                    const riskColor = log.recurrenceRisk === 'High' ? '#dc2626' : log.recurrenceRisk === 'Medium' ? '#d97706' : '#16a34a';

                    return (
                      <div
                        key={log.id}
                        onClick={() => navigate('/work-logs')}
                        style={{
                          background: '#fff',
                          border: '1px solid #e5e7eb',
                          borderRadius: '10px',
                          padding: '10px 12px',
                          cursor: 'pointer',
                          fontSize: '0.82rem',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 800, color: 'var(--color-text)' }}>
                            {log.location} &nbsp;<span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--color-text-light)' }}>· {timeStr} ({log.shift})</span>
                          </div>
                          <div style={{ fontSize: '0.78rem', color: '#4b5563', marginTop: '2px' }}>
                            <strong>By {log.engineerName}:</strong> {log.fault} &rarr; <em>{log.actionTaken}</em>
                          </div>
                        </div>
                        <span
                          style={{
                            fontSize: '0.65rem',
                            fontWeight: 800,
                            color: riskColor,
                            background: `${riskColor}15`,
                            padding: '2px 6px',
                            borderRadius: '6px',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {log.recurrenceRisk} Risk
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}

        {/* ── Top 2 Recent Notifications Section ── */}
        {(() => {
          const allNotifs = buildAllNotifications(machines, sessions, workLogs);
          const attended = getAttendedNotifs();
          const activeNotifs = allNotifs.filter((n) => !attended.some((a) => a.id === n.id));
          const top2 = activeNotifs.slice(0, 2);

          if (top2.length === 0) return null;

          return (
            <div
              className="card"
              style={{
                marginBottom: '16px',
                padding: '14px 16px',
                background: '#fff',
                border: '1.5px solid #fef3c7',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Recent System Alerts ({activeNotifs.length})
                </span>
                <button
                  onClick={() => navigate('/notifications')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-primary)',
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    padding: 0,
                  }}
                >
                  View All Notifications &rarr;
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {top2.map((n) => (
                  <div
                    key={n.id}
                    style={{
                      background: n.type === 'danger' ? '#fef2f2' : '#fffbeb',
                      borderLeft: n.type === 'danger' ? '3px solid #ef4444' : '3px solid #f59e0b',
                      borderRadius: '8px',
                      padding: '8px 10px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '0.78rem',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 800, color: 'var(--color-text)' }}>{n.title}</div>
                      <div style={{ color: '#6b7280', fontSize: '0.72rem' }}>{n.message}</div>
                    </div>
                    <button
                      onClick={() => {
                        markNotifAttended(n.id);
                        setAttendedNotifIds((prev) => [...prev, n.id]);
                      }}
                      style={{
                        background: '#fff',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        padding: '3px 8px',
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        color: '#059669',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Attend
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* ── Search bar ─────────────────────────────────────────────────── */}
        <div style={{ position: 'relative', margin: '12px 0' }}>
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
      {/* Digital Work Log Modal */}
      <WorkLogModal
        isOpen={isWorkLogModalOpen}
        onClose={() => setIsWorkLogModalOpen(false)}
        onSuccess={() => loadAll(user)}
      />

      {/* Shift Summary WhatsApp Modal */}
      <ShiftSummaryModal
        isOpen={isShiftSummaryModalOpen}
        onClose={() => setIsShiftSummaryModalOpen(false)}
      />

      {/* ── Expandable Floating Action Button (FAB) at Bottom Right ── */}
      {isFabOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)', zIndex: 90 }}
          onClick={() => setIsFabOpen(false)}
        />
      )}

      <div
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 99,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: '10px',
        }}
      >
        {/* Expanded FAB Menu Items */}
        {isFabOpen && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              gap: '10px',
              animation: 'slideUpFast 0.18s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
          >
            <button
              onClick={() => { setIsFabOpen(false); setIsWorkLogModalOpen(true); }}
              style={{
                background: '#ecfdf5',
                color: '#059669',
                border: '1.5px solid #a7f3d0',
                borderRadius: '99px',
                padding: '10px 18px',
                fontWeight: 800,
                fontSize: '0.82rem',
                cursor: 'pointer',
                boxShadow: '0 6px 20px rgba(0,0,0,0.15)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              + Work Log
            </button>

            <button
              onClick={() => { setIsFabOpen(false); setIsShiftSummaryModalOpen(true); }}
              style={{
                background: '#eff6ff',
                color: '#2563eb',
                border: '1.5px solid #bfdbfe',
                borderRadius: '99px',
                padding: '10px 18px',
                fontWeight: 800,
                fontSize: '0.82rem',
                cursor: 'pointer',
                boxShadow: '0 6px 20px rgba(0,0,0,0.15)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/>
              </svg>
              Shift Summary
            </button>

            <button
              onClick={() => { setIsFabOpen(false); navigate('/add-machine'); }}
              style={{
                background: 'var(--color-primary)',
                color: '#fff',
                border: 'none',
                borderRadius: '99px',
                padding: '10px 18px',
                fontWeight: 800,
                fontSize: '0.82rem',
                cursor: 'pointer',
                boxShadow: '0 6px 20px rgba(0,0,0,0.15)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              + Add Machine
            </button>
          </div>
        )}

        {/* Main Trigger FAB (+) */}
        <button
          onClick={() => setIsFabOpen((v) => !v)}
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: 'var(--color-primary)',
            color: '#fff',
            border: 'none',
            boxShadow: '0 8px 24px rgba(46, 125, 50, 0.45)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
            transform: isFabOpen ? 'rotate(45deg)' : 'rotate(0deg)',
          }}
          aria-label="Actions"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </button>
      </div>

    </div>
  );
};

export default Dashboard;
