import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSessionsByWeek, getAllCheckSessions } from '../services/storage';
import { exportChecklistToExcel } from '../services/excelExport';
import { DAYS_OF_WEEK, CHECKLIST_ITEMS, FREQUENCY_META } from '../data/coolingTunnelChecklist';

// ── Week helpers ─────────────────────────────────────────────────────────────
const getMondayOfWeek = (date = new Date()) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

const formatDate = (d) =>
  d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

const toISO = (d) => d.toISOString().slice(0, 10);

// ─────────────────────────────────────────────────────────────────────────────

const Export = () => {
  const navigate = useNavigate();
  const [selectedMonday, setSelectedMonday] = useState(getMondayOfWeek());
  const [sessions, setSessions] = useState([]);
  const [inspector, setInspector] = useState('');

  const saturday = new Date(selectedMonday);
  saturday.setDate(selectedMonday.getDate() + 5);
  const weekLabel = `${formatDate(selectedMonday)} – ${formatDate(saturday)}`;

  // Reload sessions when week changes
  useEffect(() => {
    const found = getSessionsByWeek(selectedMonday);
    setSessions(found);
  }, [selectedMonday]);

  const goToPrevWeek = () => {
    const d = new Date(selectedMonday);
    d.setDate(d.getDate() - 7);
    setSelectedMonday(d);
  };

  const goToNextWeek = () => {
    const d = new Date(selectedMonday);
    d.setDate(d.getDate() + 7);
    setSelectedMonday(d);
  };

  const handleExport = () => {
    exportChecklistToExcel(sessions, weekLabel, inspector);
  };

  // ── Build a week summary grid for preview ────────────────────────────────
  const dailySessions = sessions.filter((s) => s.frequency === 'daily');
  const weeklySessions = sessions.filter((s) => s.frequency === 'weekly');

  // dayMap[dayOfWeek] = session
  const dayMap = {};
  dailySessions.forEach((s) => { dayMap[s.dayOfWeek] = s; });
  const weeklySession = weeklySessions[0] || null;

  const dailyItems = CHECKLIST_ITEMS.filter((i) => i.frequency === 'daily');
  const weeklyItems = CHECKLIST_ITEMS.filter((i) => i.frequency === 'weekly');

  const completedDays = DAYS_OF_WEEK.filter((d) => dayMap[d]);
  const weeklyDone = !!weeklySession;
  const totalDone = completedDays.length + (weeklyDone ? 1 : 0);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg)', paddingBottom: '2rem' }}>
      <nav className="navbar">
        <button
          className="btn btn-sm btn-outline"
          onClick={() => navigate(-1)}
          style={{ border: 'none', padding: 0, fontSize: '1.5rem', width: '30px', color: 'var(--color-text)' }}
        >
          &larr;
        </button>
        <h1 style={{ fontSize: '1.125rem' }}>Export Checklist</h1>
        <div style={{ width: '30px' }} />
      </nav>

      <div className="container">
        {/* ── Week selector ── */}
        <div className="card mb-4">
          <p style={{ margin: '0 0 10px', fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-text-light)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Select Week
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={goToPrevWeek}
              style={{
                width: '36px', height: '36px', borderRadius: '8px',
                border: '1px solid var(--color-border)', background: 'var(--color-bg-secondary)',
                cursor: 'pointer', fontSize: '1rem', color: 'var(--color-text)',
              }}
            >
              ‹
            </button>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{weekLabel}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--color-text-light)' }}>
                {completedDays.length} daily session{completedDays.length !== 1 ? 's' : ''} recorded
                {weeklyDone ? ' · weekly done' : ''}
              </div>
            </div>
            <button
              onClick={goToNextWeek}
              style={{
                width: '36px', height: '36px', borderRadius: '8px',
                border: '1px solid var(--color-border)', background: 'var(--color-bg-secondary)',
                cursor: 'pointer', fontSize: '1rem', color: 'var(--color-text)',
              }}
            >
              ›
            </button>
          </div>
        </div>

        {/* ── Inspector name ── */}
        <div className="card mb-4">
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-light)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
            Inspector Name (for export)
          </label>
          <input
            type="text"
            placeholder="e.g. John Doe"
            value={inspector}
            onChange={(e) => setInspector(e.target.value)}
            style={{ width: '100%', boxSizing: 'border-box' }}
          />
        </div>

        {/* ── Week overview grid ── */}
        <div className="card mb-4">
          <p style={{ margin: '0 0 12px', fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-text-light)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Week Overview
          </p>

          {/* Daily row */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: FREQUENCY_META.daily.color, marginBottom: '6px' }}>
              ● Daily Items
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '6px' }}>
              {DAYS_OF_WEEK.map((day) => {
                const sess = dayMap[day];
                const checkedCount = sess ? sess.items.filter((i) => i.checked).length : 0;
                const total = dailyItems.length;
                return (
                  <div
                    key={day}
                    style={{
                      textAlign: 'center',
                      padding: '8px 4px',
                      borderRadius: '8px',
                      background: sess ? '#eff6ff' : 'var(--color-bg-secondary)',
                      border: `1px solid ${sess ? '#3b82f644' : 'var(--color-border)'}`,
                    }}
                  >
                    <div style={{ fontSize: '0.65rem', color: 'var(--color-text-light)', fontWeight: 600 }}>{day}</div>
                    <div style={{ fontSize: '1rem', marginTop: '2px' }}>
                      {sess ? (checkedCount === total ? '✅' : '🟡') : '—'}
                    </div>
                    {sess && (
                      <div style={{ fontSize: '0.6rem', color: '#3b82f6' }}>{checkedCount}/{total}</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Weekly row */}
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: FREQUENCY_META.weekly.color, marginBottom: '6px' }}>
              ■ Weekly Items
            </div>
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '8px',
                background: weeklySession ? '#fffbeb' : 'var(--color-bg-secondary)',
                border: `1px solid ${weeklySession ? '#f59e0b44' : 'var(--color-border)'}`,
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <span style={{ fontSize: '1.2rem' }}>{weeklySession ? '✅' : '⬜'}</span>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: weeklySession ? '#92400e' : 'var(--color-text)' }}>
                  {weeklySession
                    ? `Completed on ${weeklySession.dayOfWeek} by ${weeklySession.inspector}`
                    : 'Weekly check not recorded yet'}
                </div>
                {weeklySession && (
                  <div style={{ fontSize: '0.7rem', color: 'var(--color-text-light)' }}>
                    {weeklySession.items.filter((i) => i.checked).length}/{weeklyItems.length} items OK
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Preview table (scrollable) ── */}
        {sessions.length > 0 && (
          <div className="card mb-4" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border)' }}>
              <p style={{ margin: 0, fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-text-light)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Checklist Preview
              </p>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', minWidth: '600px' }}>
                <thead>
                  <tr style={{ background: 'var(--color-bg-secondary)' }}>
                    {['S/N', 'PART', 'CHECK', '●', '■', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'REMARK'].map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: '8px 6px',
                          textAlign: 'left',
                          borderBottom: '2px solid var(--color-border)',
                          whiteSpace: 'nowrap',
                          fontWeight: 700,
                          color: 'var(--color-text-light)',
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {CHECKLIST_ITEMS.map((item, idx) => (
                    <tr
                      key={item.id}
                      style={{ background: idx % 2 === 0 ? 'transparent' : 'var(--color-bg-secondary)' }}
                    >
                      <td style={{ padding: '6px', borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-light)' }}>
                        {item.sn ?? ''}
                      </td>
                      <td style={{ padding: '6px', borderBottom: '1px solid var(--color-border)', whiteSpace: 'nowrap' }}>
                        {item.part}
                      </td>
                      <td style={{ padding: '6px', borderBottom: '1px solid var(--color-border)', minWidth: '180px' }}>
                        {item.description}
                      </td>
                      {/* Frequency symbol cols */}
                      <td style={{ padding: '6px', borderBottom: '1px solid var(--color-border)', color: FREQUENCY_META.daily.color, fontWeight: 700, textAlign: 'center' }}>
                        {item.frequency === 'daily' ? '●' : ''}
                      </td>
                      <td style={{ padding: '6px', borderBottom: '1px solid var(--color-border)', color: FREQUENCY_META.weekly.color, fontWeight: 700, textAlign: 'center' }}>
                        {item.frequency === 'weekly' ? '■' : ''}
                      </td>
                      {/* Day cols */}
                      {DAYS_OF_WEEK.map((day) => {
                        let tick = '';
                        if (item.frequency === 'daily') {
                          const entry = dayMap[day]?.items.find((i) => i.id === item.id);
                          tick = entry?.checked ? '✓' : '';
                        } else if (item.frequency === 'weekly' && weeklySession?.dayOfWeek === day) {
                          const wEntry = weeklySession?.items.find((i) => i.id === item.id);
                          tick = wEntry?.checked ? '✓' : '';
                        }
                        return (
                          <td
                            key={day}
                            style={{
                              padding: '6px',
                              borderBottom: '1px solid var(--color-border)',
                              textAlign: 'center',
                              color: '#10b981',
                              fontWeight: 700,
                            }}
                          >
                            {tick}
                          </td>
                        );
                      })}
                      {/* Remark */}
                      <td style={{ padding: '6px', borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-light)', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.frequency === 'daily'
                          ? DAYS_OF_WEEK
                              .map((day) => {
                                const entry = dayMap[day]?.items.find((i) => i.id === item.id);
                                return entry?.remark ? `${day}: ${entry.remark}` : '';
                              })
                              .filter(Boolean)
                              .join(', ') || '-'
                          : weeklySession?.items.find((i) => i.id === item.id)?.remark || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {sessions.length === 0 && (
          <div className="card text-center mb-4" style={{ padding: '32px 16px', color: 'var(--color-text-light)' }}>
            <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📋</div>
            <p style={{ margin: 0 }}>No checklist sessions recorded for this week.</p>
            <p style={{ margin: '4px 0 0', fontSize: '0.8rem' }}>Go back and fill in a daily or weekly check.</p>
          </div>
        )}

        {/* ── Download button ── */}
        <button
          className="btn btn-primary"
          style={{
            width: '100%',
            padding: '14px',
            fontSize: '1rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
          onClick={handleExport}
          disabled={sessions.length === 0}
        >
          <span>⬇</span>
          Download Excel (.xlsx)
        </button>
        {sessions.length === 0 && (
          <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--color-text-light)', marginTop: '8px' }}>
            Record at least one session this week to enable download.
          </p>
        )}
      </div>
    </div>
  );
};

export default Export;
