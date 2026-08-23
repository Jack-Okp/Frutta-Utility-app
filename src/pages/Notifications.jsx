import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchMachines, fetchWorkLogs } from '../services/googleSheets';
import { getAllCheckSessions } from '../services/storage';

export const buildAllNotifications = (machines, sessions, workLogs = []) => {
  const notifs = [];
  const today = new Date().toISOString().split('T')[0];

  // 1. Check for machines overdue for daily or weekly checklist
  machines.forEach((m) => {
    const dailyDone = sessions.some(
      (s) => String(s.machineId) === String(m.machineId) && s.frequency === 'daily' && s.date === today
    );
    if (!dailyDone) {
      notifs.push({
        id: `notif_daily_${m.machineId}_${today}`,
        type: 'warning',
        title: `Daily Check Pending: ${m.machineName}`,
        message: `${m.machineName} has not had its daily checklist completed today.`,
        createdAt: new Date().toISOString(),
        machineId: m.machineId,
      });
    }
  });

  // 2. Check for High Recurrence Risk Work Logs in last 48 hours
  const nowMs = Date.now();
  workLogs.forEach((log) => {
    if (log.recurrenceRisk === 'High' && log.createdAt) {
      const logMs = new Date(log.createdAt).getTime();
      if (nowMs - logMs <= 48 * 60 * 60 * 1000) {
        notifs.push({
          id: `notif_risk_${log.id}`,
          type: 'danger',
          title: `High Risk Recurrence Alert: ${log.location}`,
          message: `Fault: "${log.fault}" logged with High Risk of recurrence within 30 days.`,
          createdAt: log.createdAt,
          location: log.location,
        });
      }
    }
  });

  return notifs;
};

const ATTENDED_NOTIFS_KEY = 'frutta_attended_notifications';

export const getAttendedNotifs = () => {
  try {
    const raw = localStorage.getItem(ATTENDED_NOTIFS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    const nowMs = Date.now();
    // Auto-delete notifications attended to > 48 hours ago
    const valid = parsed.filter((item) => {
      if (!item.attendedAt) return false;
      const age = nowMs - new Date(item.attendedAt).getTime();
      return age < 48 * 60 * 60 * 1000;
    });
    localStorage.setItem(ATTENDED_NOTIFS_KEY, JSON.stringify(valid));
    return valid;
  } catch (e) {
    return [];
  }
};

export const markNotifAttended = (notifId) => {
  const attended = getAttendedNotifs();
  if (!attended.some((a) => a.id === notifId)) {
    attended.push({ id: notifId, attendedAt: new Date().toISOString() });
    localStorage.setItem(ATTENDED_NOTIFS_KEY, JSON.stringify(attended));
  }
};

const Notifications = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [attendedIds, setAttendedIds] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadNotifs = async () => {
    setLoading(true);
    const [machines, workLogs] = await Promise.all([
      fetchMachines(),
      fetchWorkLogs(),
    ]);
    const sessions = getAllCheckSessions();
    const all = buildAllNotifications(machines || [], sessions, workLogs || []);
    const attended = getAttendedNotifs();
    setAttendedIds(attended.map((a) => a.id));
    setNotifications(all);
    setLoading(false);
  };

  useEffect(() => {
    loadNotifs();
  }, []);

  const handleAttend = (id) => {
    markNotifAttended(id);
    setAttendedIds((prev) => [...prev, id]);
  };

  const activeNotifs = notifications.filter((n) => !attendedIds.includes(n.id));
  const clearedNotifs = notifications.filter((n) => attendedIds.includes(n.id));

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg)', paddingBottom: '2rem' }}>
      {/* Top Header */}
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
            fontSize: '1.2rem',
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
            Notifications & Alerts
          </h1>
          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-text-light)' }}>
            System maintenance alerts & pending tasks
          </p>
        </div>
      </div>

      <div className="container" style={{ padding: '16px' }}>
        {loading ? (
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-light)' }}>Checking system alerts...</p>
        ) : activeNotifs.length === 0 && clearedNotifs.length === 0 ? (
          <div className="card text-center" style={{ padding: '32px' }}>
            <p style={{ margin: 0, fontWeight: 700, color: 'var(--color-text-light)' }}>
              All clear! No active system alerts or overdue checklists.
            </p>
          </div>
        ) : (
          <>
            {/* Active Notifications Section */}
            {activeNotifs.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--color-text)', marginBottom: '12px' }}>
                  Active Alerts ({activeNotifs.length})
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {activeNotifs.map((n) => (
                    <div
                      key={n.id}
                      className="card"
                      style={{
                        padding: '14px 16px',
                        borderLeft: n.type === 'danger' ? '4px solid #ef4444' : '4px solid #f59e0b',
                        background: '#fff',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        gap: '12px',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '0.88rem', color: 'var(--color-text)', marginBottom: '4px' }}>
                          {n.title}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#4b5563', lineHeight: 1.4 }}>
                          {n.message}
                        </div>
                      </div>

                      <button
                        onClick={() => handleAttend(n.id)}
                        style={{
                          background: '#ecfdf5',
                          color: '#059669',
                          border: '1px solid #a7f3d0',
                          borderRadius: '8px',
                          padding: '6px 12px',
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        Mark Attended
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recently Attended Notifications Section */}
            {clearedNotifs.length > 0 && (
              <div>
                <h3 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#9ca3af', marginBottom: '10px' }}>
                  Attended (Auto-deleted after 48h)
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', opacity: 0.7 }}>
                  {clearedNotifs.map((n) => (
                    <div
                      key={n.id}
                      className="card"
                      style={{
                        padding: '10px 14px',
                        background: '#f9fafb',
                        border: '1px solid var(--color-border)',
                      }}
                    >
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#6b7280', textDecoration: 'line-through' }}>
                        {n.title}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#9ca3af' }}>
                        Marked attended &bull; Will be deleted automatically after 48h
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Notifications;
