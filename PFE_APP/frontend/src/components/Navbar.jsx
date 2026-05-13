import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App.jsx';
import logoSvg from '../assets/estl_logo.png';
import { LogoutIcon } from './Icons.jsx';

export default function Navbar({ subtitle }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const roleLabel = user?.role === 'admin' ? 'Administrateur' : user?.role === 'teacher' ? 'Enseignant' : 'Étudiant';
  const roleColor = user?.role === 'admin' ? '#ef9a9a' : user?.role === 'teacher' ? '#f9a825' : '#80cbc4';

  return (
    <nav style={styles.nav}>
      <div style={styles.container}>
        {/* Left: Logo + School name */}
        <div style={styles.left}>
          <img src={logoSvg} alt="ESTL Logo" style={styles.logo} />
          <div style={styles.schoolInfo}>
            <span style={styles.schoolName}>ESTL</span>
            <span style={styles.schoolFull}>Gestion des Notes</span>
          </div>
        </div>

        {/* Center: Subtitle if any */}
        {subtitle && (
          <div style={styles.center}>
            <span style={styles.subtitleText}>{subtitle}</span>
          </div>
        )}

        {/* Right: User info + logout */}
        <div style={styles.right}>
          <div style={styles.userInfo}>
            <div style={styles.userAvatar}>
              {user?.name?.[0] || '?'}
            </div>
            <div style={styles.userDetails}>
              <span style={styles.userName}>{user?.name}</span>
              <span style={{ ...styles.userRole, color: roleColor }}>
                {roleLabel}
              </span>
            </div>
          </div>
          <button onClick={handleLogout} style={styles.logoutBtn}>
            <LogoutIcon size={16} color="currentColor" />
            Déconnexion
          </button>
        </div>
      </div>
    </nav>
  );
}

const styles = {
  nav: {
    background: 'linear-gradient(135deg, #1a237e 0%, #283593 100%)',
    boxShadow: '0 2px 12px rgba(0,0,0,0.2)',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  container: {
    maxWidth: 1400,
    margin: '0 auto',
    padding: '0 24px',
    height: 64,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  left: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    flexShrink: 0,
  },
  logo: {
    height: 44,
    width: 'auto',
    background: '#fff',
    borderRadius: 6,
    padding: '3px 8px',
  },
  schoolInfo: {
    display: 'flex',
    flexDirection: 'column',
    lineHeight: 1.2,
  },
  schoolName: {
    color: '#f9a825',
    fontWeight: 700,
    fontSize: '1.1rem',
    letterSpacing: '1px',
  },
  schoolFull: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: '0.75rem',
    fontWeight: 400,
  },
  center: {
    flex: 1,
    display: 'flex',
    justifyContent: 'center',
  },
  subtitleText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: '0.9375rem',
    fontStyle: 'italic',
  },
  right: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    flexShrink: 0,
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  userAvatar: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    background: 'rgba(249, 168, 37, 0.25)',
    border: '2px solid #f9a825',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#f9a825',
    fontWeight: 700,
    fontSize: '1rem',
    flexShrink: 0,
  },
  userDetails: {
    display: 'flex',
    flexDirection: 'column',
    lineHeight: 1.2,
  },
  userName: {
    color: '#fff',
    fontSize: '0.9rem',
    fontWeight: 600,
  },
  userRole: {
    fontSize: '0.75rem',
    fontWeight: 500,
  },
  logoutBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.25)',
    color: '#fff',
    borderRadius: 6,
    padding: '7px 14px',
    fontSize: '0.875rem',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
};
