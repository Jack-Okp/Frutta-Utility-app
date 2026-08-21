import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Splash = () => {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);

  // Fade in logo on mount
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  const handleContinue = () => {
    navigate('/welcome');
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(160deg, #e8f5e9 0%, #f1f8e9 40%, #ffffff 100%)',
        padding: '2rem',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Decorative background circles */}
      <div
        style={{
          position: 'absolute',
          top: '-80px',
          left: '-80px',
          width: '280px',
          height: '280px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, #a5d6a755 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-60px',
          right: '-60px',
          width: '220px',
          height: '220px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, #c8e6c955 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '50%',
          right: '-40px',
          width: '140px',
          height: '140px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, #81c78444 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      {/* Logo + content */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0',
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(24px)',
          transition: 'opacity 0.7s ease, transform 0.7s ease',
        }}
      >
        {/* Logo */}
        <div
          style={{
            width: '220px',
            height: '220px',
            borderRadius: '50%',
            background: 'white',
            boxShadow: '0 20px 60px rgba(76, 175, 80, 0.25), 0 4px 16px rgba(0,0,0,0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            marginBottom: '32px',
          }}
        >
          <img
            src="/frutta-logo.png"
            alt="Frutta Logo"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
            }}
          />
        </div>

        {/* App name */}
        <h1
          style={{
            margin: '0 0 6px',
            fontSize: '2rem',
            fontWeight: 800,
            color: '#2e7d32',
            letterSpacing: '-0.02em',
            textAlign: 'center',
          }}
        >
          Frutta Utility
        </h1>

        {/* Tagline */}
        <p
          style={{
            margin: '0 0 48px',
            fontSize: '0.95rem',
            color: '#66bb6a',
            fontWeight: 500,
            textAlign: 'center',
            letterSpacing: '0.01em',
          }}
        >
          Machine Maintenance & Checklist
        </p>

        {/* Continue button */}
        <button
          id="splash-continue-btn"
          onClick={handleContinue}
          style={{
            width: '240px',
            padding: '16px 32px',
            borderRadius: '99px',
            border: 'none',
            background: 'linear-gradient(135deg, #4caf50 0%, #2e7d32 100%)',
            color: '#ffffff',
            fontSize: '1rem',
            fontWeight: 700,
            cursor: 'pointer',
            letterSpacing: '0.03em',
            boxShadow: '0 8px 24px rgba(46, 125, 50, 0.35)',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 12px 32px rgba(46, 125, 50, 0.45)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(46, 125, 50, 0.35)';
          }}
        >
          Continue →
        </button>

        {/* Version tag */}
        <p
          style={{
            marginTop: '24px',
            fontSize: '0.7rem',
            color: '#a5d6a7',
            fontWeight: 500,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}
        >
          v1.0 · Frutta Nigeria
        </p>
      </div>
    </div>
  );
};

export default Splash;
